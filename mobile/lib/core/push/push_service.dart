import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../env.dart';

/// Native push (FCM; APNs on iOS through FCM) for the rent-due and
/// lease-expiry reminders the web app sends via browser push. Tokens go in
/// device_push_tokens (supabase/migrations/0035) and the cron routes fan out
/// to them.
///
/// Uses FCM registration tokens (getToken/onTokenRefresh), which the server's
/// HTTP v1 `message.token` targets. firebase_messaging 17 deprecates these in
/// favour of installation-ID direct send; migrate both ends together.
// ignore_for_file: deprecated_member_use
class PushService {
  PushService(this._client);
  final SupabaseClient _client;
  StreamSubscription<String>? _refresh;

  static bool _initialized = false;
  static bool get available => _initialized;

  /// Call once at startup. No-op without Firebase config.
  static Future<void> initialize() async {
    final options = Env.firebaseOptions;
    if (options == null || _initialized) return;
    await Firebase.initializeApp(options: options);
    _initialized = true;
  }

  /// Taps on a notification (from background or a cold start) yield the
  /// web-style path it carries, e.g. `/apartments/{id}`.
  static Stream<String> openedPaths() async* {
    if (!_initialized) return;
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    final initialUrl = initial?.data['url'];
    if (initialUrl is String) yield initialUrl;
    yield* FirebaseMessaging.onMessageOpenedApp
        .map((m) => m.data['url'])
        .where((url) => url is String)
        .cast<String>();
  }

  static Stream<RemoteMessage> foregroundMessages() =>
      _initialized ? FirebaseMessaging.onMessage : const Stream.empty();

  Future<bool> enable() async {
    if (!_initialized) return false;
    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) return false;
    final token = await messaging.getToken();
    if (token == null) return false;
    await _saveToken(token);
    await _refresh?.cancel();
    _refresh = messaging.onTokenRefresh.listen(_saveToken);
    return true;
  }

  Future<void> disable() async {
    if (!_initialized) return;
    await _refresh?.cancel();
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      await _client.from('device_push_tokens').delete().eq('token', token);
    }
    await FirebaseMessaging.instance.deleteToken();
  }

  Future<bool> isEnabled() async {
    if (!_initialized) return false;
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null) return false;
    final rows =
        await _client.from('device_push_tokens').select('id').eq('token', token);
    return rows.isNotEmpty;
  }

  Future<void> _saveToken(String token) => _client.from('device_push_tokens').upsert(
        {
          'user_id': _client.auth.currentUser!.id,
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
        },
        onConflict: 'token',
      );
}
