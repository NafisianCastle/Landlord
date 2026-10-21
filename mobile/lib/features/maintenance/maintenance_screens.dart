import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/data/property_kind.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/validation/forms.dart';
import '../common.dart';

/// Maintenance requests for a plot/apartment. As on the web: add, move
/// through open → in progress → resolved (or reopen), and delete.
class MaintenanceSection extends ConsumerWidget {
  const MaintenanceSection({super.key, required this.kind, required this.propertyId});
  final PropertyKind kind;
  final String propertyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final repo = ref.read(repositoryProvider);
    final requests = ref.watch(maintenanceProvider((kind, propertyId))).value ?? [];
    final vendorNames = {
      for (final v in ref.watch(vendorsProvider).value ?? []) v['id']: v['name'] as String?
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.maintenance,
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(
                tooltip: l.manageVendors,
                icon: const Icon(Icons.handyman_outlined),
                onPressed: () => context.go('/settings/vendors'),
              ),
              TextButton.icon(
                icon: const Icon(Icons.add),
                label: Text(l.addMaintenanceRequest),
                onPressed: () => context.go('/${kind.route}/$propertyId/maintenance/new'),
              ),
            ])),
        Card(
          child: Column(children: [
            if (requests.isEmpty) ListTile(title: Text(l.noMaintenance)),
            for (final m in requests)
              ListTile(
                leading: Icon(m['status'] == 'resolved'
                    ? Icons.check_circle_outline
                    : Icons.build_outlined),
                title: Text(m['title'] as String? ?? ''),
                subtitle: Text([
                  l.maintenanceStatus(m['status'] as String? ?? 'open'),
                  l.reportedOn('${m['reported_date'] ?? ''}'),
                  if (m['cost'] != null) formatBdt(context, m['cost']),
                  ?vendorNames[m['vendor_id']],
                  if ((m['description'] as String?)?.isNotEmpty ?? false) m['description'] as String,
                ].join(' · ')),
                isThreeLine: (m['description'] as String?)?.isNotEmpty ?? false,
                trailing: PopupMenuButton<String>(
                  onSelected: (action) async {
                    final id = m['id'] as String;
                    if (action == 'delete') {
                      if (await confirmDelete(context)) await repo.deleteMaintenance(id);
                    } else {
                      await repo.setMaintenanceStatus(id, action);
                    }
                  },
                  itemBuilder: (_) => [
                    if (m['status'] == 'open')
                      PopupMenuItem(value: 'in_progress', child: Text(l.markInProgress)),
                    if (m['status'] != 'resolved')
                      PopupMenuItem(value: 'resolved', child: Text(l.markResolved))
                    else
                      PopupMenuItem(value: 'open', child: Text(l.reopen)),
                    PopupMenuItem(value: 'delete', child: Text(l.delete)),
                  ],
                ),
              ),
          ]),
        ),
      ],
    );
  }
}

class MaintenanceFormScreen extends ConsumerStatefulWidget {
  const MaintenanceFormScreen({super.key, required this.kind, required this.propertyId});
  final PropertyKind kind;
  final String propertyId;

  @override
  ConsumerState<MaintenanceFormScreen> createState() => _MaintenanceFormScreenState();
}

class _MaintenanceFormScreenState extends ConsumerState<MaintenanceFormScreen> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _cost = TextEditingController();
  final _date = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 10));
  String? _vendorId;

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final values = {
      'title': _title.text,
      'description': _description.text,
      'cost': _cost.text.trim(),
      'reportedDate': _date.text,
      'vendorId': _vendorId ?? '',
    };
    final error = validateFields(values, maintenanceRules);
    if (error != null) return showMessage(context, error);
    await ref.read(repositoryProvider).addMaintenance(widget.kind, widget.propertyId, values);
    if (mounted) context.go('/${widget.kind.route}/${widget.propertyId}');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget gap(Widget w) => Padding(padding: const EdgeInsets.only(bottom: 12), child: w);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.addMaintenanceRequest),
        actions: [TextButton(onPressed: _save, child: Text(l.save))],
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            gap(TextFormField(
              controller: _title,
              decoration: InputDecoration(labelText: l.maintenanceTitle),
              validator: (v) => (v ?? '').trim().isEmpty ? l.required : null,
            )),
            gap(TextFormField(
              controller: _description,
              maxLines: 3,
              decoration: InputDecoration(labelText: l.maintenanceDescription),
            )),
            gap(TextFormField(
              controller: _cost,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: l.cost),
            )),
            gap(DateField(controller: _date, label: l.reportedDate)),
            gap(DropdownButtonFormField<String?>(
              initialValue: _vendorId,
              decoration: InputDecoration(labelText: l.vendor),
              items: [
                DropdownMenuItem(value: null, child: Text(l.noVendor)),
                for (final v in ref.watch(vendorsProvider).value ?? [])
                  DropdownMenuItem(value: v['id'] as String, child: Text(v['name'] as String)),
              ],
              onChanged: (v) => _vendorId = v,
            )),
          ],
        ),
      ),
    );
  }
}
