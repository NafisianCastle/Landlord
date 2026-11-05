import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/crypto/key_vault.dart';
import 'package:landlord_mobile/core/data/repository.dart';
import 'package:landlord_mobile/core/l10n.dart';
import 'package:landlord_mobile/core/providers.dart';
import 'package:landlord_mobile/features/settings/settings_screen.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Records what the settings tiles ask of the key vault.
class FakeVault extends KeyVault {
  String? setUpWith;
  Object? setUpError;
  bool forgot = false;

  @override
  Future<String> setUp(String passphrase) async {
    setUpWith = passphrase;
    if (setUpError != null) throw setUpError!;
    return 'ABCD-EFGH-JKMN-PQRS-TUVW';
  }

  @override
  Future<void> forgetAll() async => forgot = true;
}

/// Only the account calls the "Your data" tiles make.
class FakeRepo extends Fake implements Repository {
  bool needsPassword = true;
  Object? exportError;
  String? deleteResult;
  (String, String)? deletedWith;

  @override
  bool get accountNeedsPassword => needsPassword;

  @override
  Future<String> exportMyData() async => throw exportError!;

  @override
  Future<String?> deleteAccount(String confirmation, String password) async {
    deletedWith = (confirmation, password);
    return deleteResult;
  }
}

void main() {
  late FakeVault vault;
  late FakeRepo repo;
  late AppLocalizations l;

  setUp(() {
    vault = FakeVault();
    repo = FakeRepo();
  });

  Future<void> pump(WidgetTester tester, Widget card) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [
        keyVaultProvider.overrideWith(() => vault),
        repositoryProvider.overrideWithValue(repo),
        // Only the delete dialog reads it, for the account email.
        supabaseProvider.overrideWith((ref) {
          final client = SupabaseClient('http://localhost', 'key',
              authOptions: const AuthClientOptions(autoRefreshToken: false));
          ref.onDispose(client.dispose);
          return client;
        }),
      ],
      child: MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: const Locale('en'),
        home: Scaffold(body: SingleChildScrollView(child: card)),
      ),
    ));
    l = AppLocalizations.of(tester.element(find.byType(Scaffold)));
  }

  group('EncryptionSetupCard', () {
    Future<void> submit(WidgetTester tester, String passphrase, String confirm) async {
      await tester.enterText(find.widgetWithText(TextField, l.encryptionPassphrase), passphrase);
      await tester.enterText(find.widgetWithText(TextField, l.confirmPassphrase), confirm);
      await tester.tap(find.text(l.enableEncryption));
      await tester.pumpAndSettle();
    }

    testWidgets('rejects a short passphrase without setting anything up', (tester) async {
      await pump(tester, const EncryptionSetupCard());
      await submit(tester, 'short', 'short');
      expect(find.text(l.passphraseTooShort), findsOneWidget);
      expect(vault.setUpWith, isNull);
    });

    testWidgets('rejects passphrases that do not match', (tester) async {
      await pump(tester, const EncryptionSetupCard());
      await submit(tester, 'a long passphrase', 'a different one');
      expect(find.text(l.passphraseMismatch), findsOneWidget);
      expect(vault.setUpWith, isNull);
    });

    testWidgets('shows the recovery code once setup succeeds', (tester) async {
      await pump(tester, const EncryptionSetupCard());
      await submit(tester, 'a long passphrase', 'a long passphrase');
      expect(vault.setUpWith, 'a long passphrase');
      expect(find.text(l.saveRecoveryCode), findsOneWidget);
      expect(find.text('ABCD-EFGH-JKMN-PQRS-TUVW'), findsOneWidget);

      await tester.tap(find.text(l.savedSomewhereSafe));
      await tester.pumpAndSettle();
      expect(find.text('ABCD-EFGH-JKMN-PQRS-TUVW'), findsNothing);
    });

    testWidgets('reports a failed setup and shows no recovery code', (tester) async {
      vault.setUpError = const ActionException(ActionError.saveFailed);
      await pump(tester, const EncryptionSetupCard());
      await submit(tester, 'a long passphrase', 'a long passphrase');
      expect(find.text(l.actionError(ActionError.saveFailed)), findsOneWidget);
      expect(find.text(l.saveRecoveryCode), findsNothing);
    });
  });

  group('YourDataCard', () {
    ListTile tile(WidgetTester tester, String title) =>
        tester.widget<ListTile>(find.widgetWithText(ListTile, title));

    testWidgets('disables every tile when the web URL is not configured', (tester) async {
      await pump(tester, const YourDataCard(webUrl: ''));
      for (final title in [l.privacyPolicy, l.exportData, l.deleteAccount]) {
        expect(tile(tester, title).enabled, isFalse, reason: title);
      }
    });

    testWidgets('reports a failed export', (tester) async {
      repo.exportError = const ActionException(ActionError.saveFailed);
      await pump(tester, const YourDataCard(webUrl: 'https://example.test'));
      expect(tile(tester, l.exportData).enabled, isTrue);
      await tester.tap(find.text(l.exportData));
      await tester.pumpAndSettle();
      expect(find.text(l.actionError(ActionError.saveFailed)), findsOneWidget);
    });

    Future<void> openDelete(WidgetTester tester) async {
      await pump(tester, const YourDataCard(webUrl: 'https://example.test'));
      await tester.tap(find.text(l.deleteAccount));
      await tester.pumpAndSettle();
    }

    testWidgets('cancelling the delete dialog deletes nothing', (tester) async {
      await openDelete(tester);
      expect(find.text(l.deleteAccountWarning), findsOneWidget);
      await tester.tap(find.text(l.cancel));
      await tester.pumpAndSettle();
      expect(repo.deletedWith, isNull);
      expect(vault.forgot, isFalse);
    });

    testWidgets('shows the server refusal and keeps local keys', (tester) async {
      repo.deleteResult = 'passwordIncorrect';
      await openDelete(tester);
      await tester.enterText(find.widgetWithText(TextField, l.typeEmailToConfirm('')), 'me@example.test');
      await tester.enterText(find.widgetWithText(TextField, l.password), 'wrong');
      await tester.tap(find.text(l.deleteForever));
      await tester.pumpAndSettle();
      expect(repo.deletedWith, ('me@example.test', 'wrong'));
      expect(find.text(l.deletePasswordIncorrect), findsOneWidget);
      expect(vault.forgot, isFalse);
    });

    testWidgets('a successful delete wipes the local keys', (tester) async {
      await openDelete(tester);
      await tester.enterText(find.widgetWithText(TextField, l.typeEmailToConfirm('')), 'me@example.test');
      await tester.enterText(find.widgetWithText(TextField, l.password), 'right');
      await tester.tap(find.text(l.deleteForever));
      await tester.pumpAndSettle();
      expect(repo.deletedWith, ('me@example.test', 'right'));
      expect(vault.forgot, isTrue);
    });

    testWidgets('Google-only accounts are not asked for a password', (tester) async {
      repo.needsPassword = false;
      await openDelete(tester);
      expect(find.widgetWithText(TextField, l.password), findsNothing);
    });
  });
}
