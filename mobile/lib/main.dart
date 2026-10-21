import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/crypto/key_vault.dart';
import 'core/env.dart';
import 'core/l10n.dart';
import 'core/offline/local_db.dart';
import 'core/offline/tile_cache.dart';
import 'core/providers.dart';
import 'core/push/push_service.dart';
import 'core/router.dart';
import 'core/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: Env.supabaseUrl,
    publishableKey: Env.supabasePublishableKey,
    authOptions: const FlutterAuthClientOptions(authFlowType: AuthFlowType.pkce),
  );
  try {
    await PushService.initialize();
  } catch (e) {
    debugPrint('Push disabled: $e');
  }

  final db = await LocalDb.open(p.join(await getDatabasesPath(), 'landlord.db'));
  final support = await getApplicationSupportDirectory();
  final tiles = TileCache(Directory(p.join(support.path, 'tiles')));

  final container = ProviderContainer(overrides: [
    localDbProvider.overrideWithValue(db),
    tileCacheProvider.overrideWithValue(tiles),
  ]);
  if (Supabase.instance.client.auth.currentSession != null) {
    await container.read(appLockProvider.notifier).lockIfEnabled();
  }
  runApp(UncontrolledProviderScope(container: container, child: const LandlordApp()));
}

final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

class LandlordApp extends ConsumerStatefulWidget {
  const LandlordApp({super.key});

  @override
  ConsumerState<LandlordApp> createState() => _LandlordAppState();
}

class _LandlordAppState extends ConsumerState<LandlordApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    PushService.openedPaths().listen(
        (url) => ref.read(routerProvider).go(appPathForWebUrl(url)));
    PushService.foregroundMessages().listen((m) {
      final n = m.notification;
      if (n == null) return;
      scaffoldMessengerKey.currentState
          ?.showSnackBar(SnackBar(content: Text('${n.title ?? ''}\n${n.body ?? ''}')));
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  DateTime? _pausedAt;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Biometric lock after a real trip to the background. The grace period
    // matters: the camera scanner, file picker and Google sign-in also pause
    // the app, and locking then would drop the key mid-upload.
    if (state == AppLifecycleState.paused) {
      _pausedAt = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      final away = _pausedAt == null ? Duration.zero : DateTime.now().difference(_pausedAt!);
      _pausedAt = null;
      if (away > const Duration(seconds: 30) &&
          Supabase.instance.client.auth.currentSession != null) {
        ref.read(appLockProvider.notifier).lockIfEnabled();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      onGenerateTitle: (context) => context.l10n.appTitle,
      routerConfig: ref.watch(routerProvider),
      scaffoldMessengerKey: scaffoldMessengerKey,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      locale: ref.watch(localeProvider),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
