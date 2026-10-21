import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/crypto/key_vault.dart';
import '../../core/env.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/push/push_service.dart';
import '../common.dart';

final _pushServiceProvider = Provider((ref) => PushService(ref.watch(supabaseProvider)));
final _pushEnabledProvider = FutureProvider((ref) => ref.read(_pushServiceProvider).isEnabled());
final _biometricProvider = FutureProvider((ref) async {
  final vault = ref.read(keyVaultProvider.notifier);
  return (available: await vault.biometricAvailable(), enabled: await vault.biometricLockEnabled());
});

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final language = ref.watch(profileProvider).value?['preferred_language'] as String? ??
        Localizations.localeOf(context).languageCode;
    return Scaffold(
      appBar: AppBar(title: Text(l.settings)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionHeader(l.language),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'bn', label: Text('বাংলা')),
              ButtonSegment(value: 'en', label: Text('English')),
            ],
            selected: {language},
            onSelectionChanged: (s) => ref.read(repositoryProvider).setLanguage(s.first),
          ),
          SectionHeader(l.encryption),
          const _EncryptionCard(),
          SectionHeader(l.biometricLock),
          const _BiometricCard(),
          SectionHeader(l.notifications),
          const _PushCard(),
          SectionHeader(l.vendors),
          Card(
            child: ListTile(
              leading: const Icon(Icons.handyman_outlined),
              title: Text(l.vendors),
              subtitle: Text(l.vendorsHint),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go('/settings/vendors'),
            ),
          ),
          SectionHeader(l.offlineMaps),
          Card(
            child: ListTile(
              leading: const Icon(Icons.download_for_offline_outlined),
              title: Text(l.offlineMaps),
              subtitle: Text(l.offlineMapsHint),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go('/settings/offline-maps'),
            ),
          ),
          // Shown only to admins; the server re-checks is_admin on every call.
          if (ref.watch(profileProvider).value?['is_admin'] == true) ...[
            SectionHeader(l.adminTitle),
            Card(
              child: ListTile(
                leading: const Icon(Icons.admin_panel_settings_outlined),
                title: Text(l.adminTitle),
                subtitle: Text(Env.webUrl.isEmpty ? l.adminNotConfigured : l.adminHint),
                trailing: const Icon(Icons.chevron_right),
                enabled: Env.webUrl.isNotEmpty,
                onTap: () => context.go('/settings/admin'),
              ),
            ),
          ],
          const SizedBox(height: 24),
          OutlinedButton.icon(
            icon: const Icon(Icons.logout),
            label: Text(l.signOut),
            onPressed: () async {
              // Stop this device's reminders and wipe local data + keys so
              // the next account starts clean.
              await ref.read(_pushServiceProvider).disable().catchError((_) {});
              await ref.read(keyVaultProvider.notifier).forgetAll();
              await ref.read(repositoryProvider).signOut();
            },
          ),
        ],
      ),
    );
  }
}

class _EncryptionCard extends ConsumerStatefulWidget {
  const _EncryptionCard();

  @override
  ConsumerState<_EncryptionCard> createState() => _EncryptionCardState();
}

class _EncryptionCardState extends ConsumerState<_EncryptionCard> {
  final _secret = TextEditingController();
  bool _recovery = false;
  bool _busy = false;
  String? _error;

  Future<void> _unlock() async {
    final l = context.l10n;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(keyVaultProvider.notifier)
          .unlock(_recovery ? _secret.text.trim().toUpperCase() : _secret.text, recovery: _recovery);
      _secret.clear();
    } on SecretBoxAuthenticationError {
      setState(() => _error = l.wrongPassphrase);
    } catch (e) {
      setState(() => _error = l.errorMessage('$e'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final enabled = ref.watch(profileProvider).value?['encryption_enabled'] == true;
    final unlocked = ref.watch(keyVaultProvider) != null;
    if (!enabled) return Card(child: ListTile(title: Text(l.encryptionNotSetUp)));
    if (unlocked) {
      return Card(
        child: ListTile(
          leading: const Icon(Icons.lock_open),
          title: Text(l.unlockedNotice),
          trailing: TextButton(
            onPressed: () => ref.read(keyVaultProvider.notifier).lock(),
            child: Text(l.lock),
          ),
        ),
      );
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l.lockedNotice),
            const SizedBox(height: 12),
            TextField(
              controller: _secret,
              obscureText: !_recovery,
              decoration: InputDecoration(
                labelText: _recovery ? l.recoveryCode : l.passphrase,
                errorText: _error,
              ),
              onSubmitted: (_) => _unlock(),
            ),
            TextButton(
              onPressed: () => setState(() => _recovery = !_recovery),
              child: Text(_recovery ? l.passphrase : l.useRecoveryCode),
            ),
            FilledButton(
              onPressed: _busy ? null : _unlock,
              child: _busy
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator())
                  : Text(l.unlock),
            ),
          ],
        ),
      ),
    );
  }
}

class _BiometricCard extends ConsumerWidget {
  const _BiometricCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final state = ref.watch(_biometricProvider).value;
    return Card(
      child: SwitchListTile(
        secondary: const Icon(Icons.fingerprint),
        title: Text(l.biometricLock),
        subtitle: Text(state?.available == false ? l.biometricUnavailable : l.biometricLockHint),
        value: state?.enabled ?? false,
        onChanged: state?.available != true
            ? null
            : (v) async {
                await ref.read(keyVaultProvider.notifier).setBiometricLock(v, l.biometricReason);
                ref.invalidate(_biometricProvider);
              },
      ),
    );
  }
}

class _PushCard extends ConsumerWidget {
  const _PushCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final enabled = ref.watch(_pushEnabledProvider);
    return Card(
      child: SwitchListTile(
        secondary: const Icon(Icons.notifications_outlined),
        title: Text(l.notifications),
        subtitle: Text(PushService.available ? l.notificationsHint : l.notificationsUnavailable),
        value: enabled.value ?? false,
        onChanged: !PushService.available || enabled.isLoading
            ? null
            : (v) async {
                final push = ref.read(_pushServiceProvider);
                try {
                  v ? await push.enable() : await push.disable();
                } catch (e) {
                  if (context.mounted) showMessage(context, l.errorMessage('$e'));
                }
                ref.invalidate(_pushEnabledProvider);
              },
      ),
    );
  }
}
