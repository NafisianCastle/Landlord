import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/admin_api.dart';
import '../../core/env.dart';
import '../../core/l10n.dart';
import '../../core/offline/sync.dart';
import '../../core/providers.dart';
import '../../core/validation/forms.dart';
import '../common.dart';

/// Admin dashboard (web: /admin). Everything goes through the web app's
/// /api/admin routes, which check this user's token and is_admin; the app
/// itself holds no elevated credentials. Online only.
final adminApiProvider = Provider<AdminApi>((ref) {
  final auth = ref.watch(supabaseProvider).auth;
  return AdminApi(Env.webUrl, () => auth.currentSession?.accessToken);
});

final _overviewProvider = FutureProvider.autoDispose((ref) => ref.read(adminApiProvider).overview());
final _couponsProvider = FutureProvider.autoDispose((ref) => ref.read(adminApiProvider).coupons());
final _settingsProvider = FutureProvider.autoDispose((ref) => ref.read(adminApiProvider).settings());

/// Runs an admin call, showing the server's own message (same wording as the
/// web admin actions) or the offline message.
Future<bool> _run(BuildContext context, Future<void> Function() action, {String? success}) async {
  final l = context.l10n;
  try {
    await action();
    if (success != null && context.mounted) showMessage(context, success);
    return true;
  } on AdminApiException catch (e) {
    if (context.mounted) showMessage(context, e.message);
  } catch (e) {
    if (context.mounted) {
      showMessage(context, isOfflineError(e) ? l.needsConnection : l.errorMessage('$e'));
    }
  }
  return false;
}

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.adminTitle),
          bottom: TabBar(isScrollable: true, tabs: [
            Tab(text: l.adminOverview),
            Tab(text: l.adminUsers),
            Tab(text: l.adminCoupons),
            Tab(text: l.adminSettings),
          ]),
        ),
        body: const TabBarView(children: [_Overview(), _Users(), _Coupons(), _Settings()]),
      ),
    );
  }
}

class _Overview extends ConsumerWidget {
  const _Overview();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return AsyncBody(
      value: ref.watch(_overviewProvider),
      builder: (o) => RefreshIndicator(
        onRefresh: () => ref.refresh(_overviewProvider.future),
        child: ListView(padding: const EdgeInsets.all(16), children: [
          for (final (label, value) in [
            (l.totalUsers, '${o['totalUsers'] ?? 0}'),
            (l.activeTrials, '${o['activeTrials'] ?? 0}'),
            (l.paidUsers, '${o['paidUsers'] ?? 0}'),
            (l.totalRevenue, formatBdt(context, o['revenue'] ?? 0)),
            (l.referredSignups, '${o['referredSignups'] ?? 0}'),
          ])
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(label),
                trailing: Text(value, style: Theme.of(context).textTheme.titleLarge),
              ),
            ),
        ]),
      ),
    );
  }
}

class _Users extends ConsumerStatefulWidget {
  const _Users();

  @override
  ConsumerState<_Users> createState() => _UsersState();
}

class _UsersState extends ConsumerState<_Users> {
  final _search = TextEditingController();
  late Future<List<Map<String, dynamic>>> _users = _load();

  Future<List<Map<String, dynamic>>> _load() => ref.read(adminApiProvider).users(_search.text);

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    String status(Object? s) => switch (s) {
          'paid' => l.userPaid,
          'trialActive' => l.userTrialActive,
          _ => l.userTrialExpired,
        };
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        child: TextField(
          controller: _search,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            labelText: l.searchByEmail,
            suffixIcon: const Icon(Icons.search),
          ),
          onSubmitted: (_) => setState(() => _users = _load()),
        ),
      ),
      Expanded(
        child: FutureBuilder(
          future: _users,
          builder: (context, snap) {
            if (snap.hasError) return Center(child: Text(l.errorMessage('${snap.error}')));
            if (!snap.hasData) return const Center(child: CircularProgressIndicator());
            final users = snap.data!;
            if (users.isEmpty) return Center(child: Text(l.noUsersFound));
            return ListView(padding: const EdgeInsets.symmetric(horizontal: 16), children: [
              for (final u in users)
                Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text([
                      (u['fullName'] as String?)?.isNotEmpty == true ? u['fullName'] : u['email'],
                      if (u['isAdmin'] == true) '· ${l.userAdmin}',
                    ].join(' ')),
                    subtitle: Text('${u['email'] ?? ''} · ${status(u['status'])}'),
                    trailing: u['status'] == 'paid'
                        ? null
                        : TextButton(
                            child: Text(l.grantAccess),
                            onPressed: () async {
                              final ok = await _run(
                                context,
                                () => ref.read(adminApiProvider).grantLifetimeAccess(u['id'] as String),
                                success: l.accessGranted,
                              );
                              if (ok && mounted) setState(() => _users = _load());
                            },
                          ),
                  ),
                ),
            ]);
          },
        ),
      ),
    ]);
  }
}

class _Coupons extends ConsumerWidget {
  const _Coupons();

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final code = TextEditingController();
    final value = TextEditingController();
    final max = TextEditingController();
    final expires = TextEditingController();
    var type = 'percent';
    final form = GlobalKey<FormState>();
    final created = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(l.createCoupon),
          content: Form(
            key: form,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextFormField(
                  controller: code,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(labelText: l.couponCode),
                  // Same pattern as createCoupon.
                  validator: (v) => RegExp(r'^[a-z0-9_-]{1,64}$', caseSensitive: false)
                          .hasMatch(v?.trim() ?? '')
                      ? null
                      : l.required,
                ),
                DropdownButtonFormField<String>(
                  initialValue: type,
                  isExpanded: true,
                  decoration: InputDecoration(labelText: l.discountType),
                  items: [
                    DropdownMenuItem(value: 'percent', child: Text(l.discountPercent)),
                    DropdownMenuItem(value: 'fixed', child: Text(l.discountFixed)),
                  ],
                  onChanged: (v) => setState(() => type = v ?? 'percent'),
                ),
                TextFormField(
                  controller: value,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: l.discountValue),
                  validator: (v) {
                    final n = num.tryParse(v?.trim() ?? '');
                    return n == null || n <= 0 || (type == 'percent' && n > 100) ? l.required : null;
                  },
                ),
                TextFormField(
                  controller: max,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: l.maxRedemptions),
                  validator: (v) => (v ?? '').trim().isEmpty || (int.tryParse(v!.trim()) ?? 0) >= 1
                      ? null
                      : l.required,
                ),
                DateField(controller: expires, label: l.couponExpiresAt),
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            FilledButton(
              onPressed: () async {
                if (!form.currentState!.validate()) return;
                final ok = await _run(
                  context,
                  () => ref.read(adminApiProvider).createCoupon({
                    'code': code.text.trim(),
                    'discountType': type,
                    'discountValue': value.text.trim(),
                    if (max.text.trim().isNotEmpty) 'maxRedemptions': max.text.trim(),
                    if (validDate(expires.text)) 'expiresAt': expires.text,
                  }),
                );
                if (ok && context.mounted) Navigator.pop(context, true);
              },
              child: Text(l.createCoupon),
            ),
          ],
        ),
      ),
    );
    if (created == true) ref.invalidate(_couponsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _create(context, ref),
        icon: const Icon(Icons.add),
        label: Text(l.createCoupon),
      ),
      body: AsyncBody(
        value: ref.watch(_couponsProvider),
        builder: (coupons) => RefreshIndicator(
          onRefresh: () => ref.refresh(_couponsProvider.future),
          child: ListView(padding: const EdgeInsets.all(16), children: [
            if (coupons.isEmpty) Center(child: Text(l.noCouponsYet)),
            for (final c in coupons)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(c['code'] as String? ?? ''),
                  subtitle: Text([
                    c['discountType'] == 'percent'
                        ? '${c['discountValue']}%'
                        : formatBdt(context, c['discountValue']),
                    l.couponRedeemed('${c['timesRedeemed'] ?? 0}', '${c['maxRedemptions'] ?? '∞'}'),
                    if (c['expiresAt'] != null) l.couponExpires('${c['expiresAt']}'.split('T').first),
                  ].join(' · ')),
                  trailing: TextButton(
                    child: Text(c['active'] == true ? l.deactivate : l.activate),
                    onPressed: () async {
                      final ok = await _run(context,
                          () => ref.read(adminApiProvider).setCouponActive(c['id'] as String, c['active'] != true));
                      if (ok) ref.invalidate(_couponsProvider);
                    },
                  ),
                ),
              ),
            const SizedBox(height: 80),
          ]),
        ),
      ),
    );
  }
}

class _Settings extends ConsumerStatefulWidget {
  const _Settings();

  @override
  ConsumerState<_Settings> createState() => _SettingsState();
}

class _SettingsState extends ConsumerState<_Settings> {
  final _form = GlobalKey<FormState>();
  final _price = TextEditingController();
  final _days = TextEditingController();
  bool _filled = false;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AsyncBody(
      value: ref.watch(_settingsProvider),
      builder: (s) {
        if (!_filled) {
          _price.text = '${s['lifetimePriceBdt'] ?? ''}';
          _days.text = '${s['trialDays'] ?? ''}';
          _filled = true;
        }
        return Form(
          key: _form,
          child: ListView(padding: const EdgeInsets.all(16), children: [
            TextFormField(
              controller: _price,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: l.lifetimePriceBdt),
              validator: (v) => (num.tryParse(v?.trim() ?? '') ?? 0) > 0 ? null : l.required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _days,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: l.trialDays, helperText: l.trialDaysHint, helperMaxLines: 3),
              validator: (v) => (int.tryParse(v?.trim() ?? '') ?? 0) > 0 ? null : l.required,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () async {
                if (!_form.currentState!.validate()) return;
                await _run(
                  context,
                  () => ref
                      .read(adminApiProvider)
                      .updateSettings(num.parse(_price.text.trim()), int.parse(_days.text.trim())),
                  success: l.adminSaved,
                );
              },
              child: Text(l.save),
            ),
          ]),
        );
      },
    );
  }
}
