import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/validation/forms.dart';
import '../common.dart';

/// Vendor contacts shared across all properties (the web's /vendors page).
class VendorsScreen extends ConsumerWidget {
  const VendorsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.vendors)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/settings/vendors/new'),
        icon: const Icon(Icons.add),
        label: Text(l.addVendor),
      ),
      body: AsyncBody(
        value: ref.watch(vendorsProvider),
        builder: (all) {
          final hidden = ref.watch(hiddenRowsProvider);
          final vendors = [for (final v in all) if (!hidden.contains(v['id'])) v];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (vendors.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 48),
                  child: Center(child: Text(l.noVendors)),
                ),
              for (final v in vendors)
                SwipeToDelete(
                  id: v['id'] as String,
                  onDelete: () => ref.read(repositoryProvider).deleteVendor(v['id'] as String),
                  child: Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: const Icon(Icons.handyman_outlined),
                      title: Text(v['name'] as String? ?? ''),
                      subtitle: Text([v['trade'], v['phone']]
                          .whereType<String>()
                          .where((s) => s.isNotEmpty)
                          .join(' · ')),
                      onTap: () => context.go('/settings/vendors/${v['id']}'),
                      trailing: v['phone'] == null
                          ? null
                          : IconButton(
                              tooltip: l.call,
                              icon: const Icon(Icons.call_outlined),
                              onPressed: () => launchUrl(Uri(scheme: 'tel', path: v['phone'] as String)),
                            ),
                    ),
                  ),
                ),
              const SizedBox(height: 80),
            ],
          );
        },
      ),
    );
  }
}

class VendorFormScreen extends ConsumerStatefulWidget {
  const VendorFormScreen({super.key, this.id});
  final String? id;

  @override
  ConsumerState<VendorFormScreen> createState() => _VendorFormScreenState();
}

class _VendorFormScreenState extends ConsumerState<VendorFormScreen> {
  final _form = GlobalKey<FormState>();
  final _c = {for (final k in vendorRules.keys) k: TextEditingController()};

  @override
  void initState() {
    super.initState();
    if (widget.id != null) _load();
  }

  Future<void> _load() async {
    final v = await ref.read(repositoryProvider).vendor(widget.id!);
    if (v == null || !mounted) return;
    setState(() {
      for (final k in ['name', 'trade', 'phone', 'notes']) {
        _c[k]!.text = v[k] as String? ?? '';
      }
    });
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final values = {for (final e in _c.entries) e.key: e.value.text};
    final error = validateFields(values, vendorRules);
    if (error != null) return showMessage(context, error);
    await ref.read(repositoryProvider).saveVendor(widget.id, values);
    if (mounted) context.go('/settings/vendors');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    String? rule(String key, String? v) => validateFields({key: v}, {key: vendorRules[key]!});
    Widget gap(Widget w) => Padding(padding: const EdgeInsets.only(bottom: 12), child: w);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.id == null ? l.addVendor : l.editVendor),
        actions: [
          if (widget.id != null)
            IconButton(
              tooltip: l.delete,
              icon: const Icon(Icons.delete_outline),
              onPressed: () async {
                if (!await confirmDelete(context)) return;
                await ref.read(repositoryProvider).deleteVendor(widget.id!);
                if (context.mounted) context.go('/settings/vendors');
              },
            ),
          TextButton(onPressed: _save, child: Text(l.save)),
        ],
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            gap(TextFormField(
              controller: _c['name'],
              decoration: InputDecoration(labelText: l.field_name),
              validator: (v) => (v ?? '').trim().isEmpty ? l.required : rule('name', v),
            )),
            gap(TextFormField(
              controller: _c['trade'],
              decoration: InputDecoration(labelText: l.vendorTrade, hintText: l.vendorTradeHint),
              validator: (v) => rule('trade', v),
            )),
            gap(TextFormField(
              controller: _c['phone'],
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: l.phone),
              validator: (v) => rule('phone', v),
            )),
            gap(TextFormField(
              controller: _c['notes'],
              maxLines: 3,
              decoration: InputDecoration(labelText: l.field_notes),
              validator: (v) => rule('notes', v),
            )),
          ],
        ),
      ),
    );
  }
}
