import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/crypto/key_vault.dart';
import '../../core/env.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/push/push_service.dart';
import '../../core/region.dart';
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
          SectionHeader(l.regionAndUnits),
          const _RegionCard(),
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

/// Country, currency, area unit and length units. Each override can go back
/// to the country default; the country itself can follow the phone.
class _RegionCard extends ConsumerWidget {
  const _RegionCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final profile = ref.watch(profileProvider).value;
    final region = ref.watch(regionProvider);
    final preset = region.preset;
    final repo = ref.read(repositoryProvider);
    String countryName(CountryPreset p) => p.code == otherCountry ? l.otherCountry : p.name;
    String? override(String column) => profile?[column] as String?;

    Future<void> pick(String column, String title, List<(String?, String)> options,
        {bool search = false}) async {
      final choice = await showModalBottomSheet<(String?,)>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (_) => _OptionSheet(
            title: title, options: options, selected: override(column), search: search),
      );
      if (choice != null) await repo.setRegion({column: choice.$1});
    }

    final defaultSystem = preset.imperial ? l.imperial : l.metric;
    return Card(
      child: Column(children: [
        ListTile(
          leading: const Icon(Icons.public),
          title: Text(l.country),
          subtitle: Text(override('country_code') == null
              ? l.countryAutomatic(countryName(preset))
              : countryName(preset)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => pick(
            'country_code',
            l.country,
            [
              (null, l.countryAutomatic(countryName(presetFor(
                  WidgetsBinding.instance.platformDispatcher.locale.countryCode)))),
              for (final p in [...countryPresets]..sort((a, b) => a.name.compareTo(b.name)))
                (p.code, p.name),
              (otherCountry, l.otherCountry),
            ],
            search: true,
          ),
        ),
        ListTile(
          leading: const Icon(Icons.payments_outlined),
          title: Text(l.currency),
          subtitle: Text(region.currency),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => pick(
            'currency_code',
            l.currency,
            [
              (null, l.countryDefault(preset.currency ?? region.currency)),
              for (final c in {for (final p in countryPresets) p.currency!}.toList()..sort())
                (c, c),
            ],
            search: true,
          ),
        ),
        ListTile(
          leading: const Icon(Icons.straighten),
          title: Text(l.areaUnitForTotals),
          subtitle: Text(areaUnitLabel(context, region.areaUnit)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => pick('area_unit', l.areaUnitForTotals, [
            (null, l.countryDefault(areaUnitLabel(context, preset.areaUnit))),
            for (final u in region.unitChoices(land: true)) (u, areaUnitLabel(context, u)),
          ]),
        ),
        ListTile(
          leading: const Icon(Icons.social_distance),
          title: Text(l.lengthUnits),
          subtitle: Text(region.imperial ? l.imperial : l.metric),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => pick('measurement_system', l.lengthUnits, [
            (null, l.countryDefault(defaultSystem)),
            ('metric', l.metric),
            ('imperial', l.imperial),
          ]),
        ),
        ListTile(dense: true, subtitle: Text(l.regionSyncHint)),
      ]),
    );
  }
}

/// A bottom-sheet list of options; pops `(value,)` so "default" (null) is
/// distinguishable from dismissing the sheet.
class _OptionSheet extends StatefulWidget {
  const _OptionSheet(
      {required this.title, required this.options, required this.selected, required this.search});
  final String title;
  final List<(String?, String)> options;
  final String? selected;
  final bool search;

  @override
  State<_OptionSheet> createState() => _OptionSheetState();
}

class _OptionSheetState extends State<_OptionSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final shown = widget.options
        .where((o) => q.isEmpty || o.$2.toLowerCase().contains(q) || (o.$1?.toLowerCase() == q))
        .toList();
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.7,
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
          ),
          if (widget.search)
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                autofocus: true,
                decoration: InputDecoration(
                    hintText: context.l10n.search, prefixIcon: const Icon(Icons.search)),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
          Expanded(
            child: ListView(children: [
              for (final o in shown)
                ListTile(
                  title: Text(o.$2),
                  trailing: o.$1 == widget.selected ? const Icon(Icons.check) : null,
                  onTap: () => Navigator.pop(context, (o.$1,)),
                ),
            ]),
          ),
        ]),
      ),
    );
  }
}
