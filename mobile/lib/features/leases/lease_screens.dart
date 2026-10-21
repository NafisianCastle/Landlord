import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/data/property_kind.dart';
import '../../core/data/repository.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/validation/forms.dart';
import '../common.dart';

String _today() => DateTime.now().toIso8601String().substring(0, 10);

class LeasesSection extends ConsumerWidget {
  const LeasesSection({super.key, required this.kind, required this.propertyId});
  final PropertyKind kind;
  final String propertyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final leases = ref.watch(leasesProvider((kind, propertyId))).value ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.leases,
            trailing: TextButton.icon(
              icon: const Icon(Icons.add),
              label: Text(l.addLease),
              onPressed: () => context.go('/${kind.route}/$propertyId/leases/new'),
            )),
        Card(
          child: Column(children: [
            if (leases.isEmpty) ListTile(title: Text(l.noLeases)),
            for (final lease in leases)
              ListTile(
                leading: const Icon(Icons.person_outline),
                title: Text(lease['tenant_name'] as String? ?? ''),
                subtitle: Text('${formatBdt(context, lease['rent_amount'])} · '
                    '${l.frequencyLabel(lease['frequency'] as String? ?? 'monthly')}'),
                trailing: Chip(label: Text(l.statusLabel(lease['status'] as String? ?? 'active'))),
                onTap: () => context.go('/${kind.route}/$propertyId/leases/${lease['id']}'),
              ),
          ]),
        ),
      ],
    );
  }
}

class LeaseDetailScreen extends ConsumerWidget {
  const LeaseDetailScreen({
    super.key,
    required this.kind,
    required this.propertyId,
    required this.leaseId,
  });
  final PropertyKind kind;
  final String propertyId;
  final String leaseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final repo = ref.read(repositoryProvider);
    final lease = ref.watch(leaseProvider(leaseId)).value;
    final payments = ref.watch(paymentsProvider(leaseId)).value ?? [];
    final base = '/${kind.route}/$propertyId';
    return Scaffold(
      appBar: AppBar(
        title: Text(lease?['tenant_name'] as String? ?? ''),
        actions: [
          IconButton(
            tooltip: l.edit,
            icon: const Icon(Icons.edit),
            onPressed: () => context.go('$base/leases/$leaseId/edit'),
          ),
          IconButton(
            tooltip: l.delete,
            icon: const Icon(Icons.delete_outline),
            onPressed: () async {
              if (!await confirmDelete(context)) return;
              await repo.deleteLease(leaseId);
              if (context.mounted) context.go(base);
            },
          ),
        ],
      ),
      body: lease == null
          ? Center(child: Text(l.notFound))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Column(children: [
                    ListTile(
                      title: Text(formatBdt(context, lease['rent_amount'])),
                      subtitle: Text(l.frequencyLabel(lease['frequency'] as String)),
                      trailing:
                          Chip(label: Text(l.statusLabel(lease['status'] as String? ?? 'active'))),
                    ),
                    ListTile(
                      dense: true,
                      title: Text('${l.startDate} – ${l.endDate}'),
                      subtitle: Text('${lease['start_date']} – ${lease['end_date'] ?? '…'}'),
                    ),
                    if (lease['tenant_phone'] != null)
                      ListTile(
                          dense: true,
                          title: Text(l.tenantPhone),
                          subtitle: Text('${lease['tenant_phone']}')),
                    if (lease['tenant_email'] != null)
                      ListTile(
                          dense: true,
                          title: Text(l.tenantEmail),
                          subtitle: Text('${lease['tenant_email']}')),
                    if (lease['status'] == 'active')
                      OverflowBar(alignment: MainAxisAlignment.end, children: [
                        TextButton(
                          onPressed: () => repo.endLease(lease),
                          child: Text(l.endLease),
                        ),
                      ]),
                  ]),
                ),
                SectionHeader(l.payments),
                Card(
                  child: Column(children: [
                    if (payments.isEmpty) ListTile(title: Text(l.paymentsAfterSync)),
                    for (final p in payments) _PaymentTile(payment: p),
                  ]),
                ),
              ],
            ),
    );
  }
}

class _PaymentTile extends ConsumerWidget {
  const _PaymentTile({required this.payment});
  final DbRow payment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final paid = payment['paid'] == true;
    final due = payment['due_date'] as String;
    final overdue = !paid && due.compareTo(_today()) < 0;
    return CheckboxListTile(
      value: paid,
      onChanged: (v) => ref.read(repositoryProvider).setPaymentPaid(payment, v ?? false),
      title: Text(formatBdt(context, payment['paid_amount'] ?? payment['amount'])),
      subtitle: Text(paid ? l.paidOn('${payment['paid_date'] ?? ''}') : l.dueOn(due)),
      secondary: overdue
          ? Icon(Icons.warning_amber, color: Theme.of(context).colorScheme.error, semanticLabel: l.overdue)
          : null,
    );
  }
}

class LeaseFormScreen extends ConsumerStatefulWidget {
  const LeaseFormScreen({
    super.key,
    required this.kind,
    required this.propertyId,
    this.leaseId,
  });
  final PropertyKind kind;
  final String propertyId;
  final String? leaseId;

  @override
  ConsumerState<LeaseFormScreen> createState() => _LeaseFormScreenState();
}

class _LeaseFormScreenState extends ConsumerState<LeaseFormScreen> {
  final _form = GlobalKey<FormState>();
  final _c = {
    for (final k in ['tenantName', 'tenantPhone', 'tenantEmail', 'rentAmount', 'startDate', 'endDate', 'notes'])
      k: TextEditingController()
  };
  String _frequency = 'monthly';

  @override
  void initState() {
    super.initState();
    if (widget.leaseId != null) _load();
  }

  Future<void> _load() async {
    final lease = await ref.read(repositoryProvider).lease(widget.leaseId!);
    if (lease == null || !mounted) return;
    setState(() {
      _c['tenantName']!.text = lease['tenant_name'] as String? ?? '';
      _c['tenantPhone']!.text = lease['tenant_phone'] as String? ?? '';
      _c['tenantEmail']!.text = lease['tenant_email'] as String? ?? '';
      _c['rentAmount']!.text = '${lease['rent_amount'] ?? ''}';
      _c['startDate']!.text = lease['start_date'] as String? ?? '';
      _c['endDate']!.text = lease['end_date'] as String? ?? '';
      _c['notes']!.text = lease['notes'] as String? ?? '';
      _frequency = lease['frequency'] as String? ?? 'monthly';
    });
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final values = {for (final e in _c.entries) e.key: e.value.text, 'frequency': _frequency};
    final error = validateLease(values);
    if (error != null) {
      showMessage(context, error);
      return;
    }
    await ref
        .read(repositoryProvider)
        .saveLease(widget.kind, widget.propertyId, widget.leaseId, values);
    if (mounted) context.go('/${widget.kind.route}/${widget.propertyId}');
  }

  Future<void> _pickDate(TextEditingController c) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(c.text) ?? DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime(2100),
    );
    if (picked != null) c.text = picked.toIso8601String().substring(0, 10);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    String? requiredField(String? v) => (v ?? '').trim().isEmpty ? l.required : null;
    String? rule(String key, String? v) =>
        validateFields({key: v}, {key: leaseRules[key]!});
    Widget gap(Widget w) => Padding(padding: const EdgeInsets.only(bottom: 12), child: w);
    Widget date(String key, String label, {bool required = false, String? helper}) => TextFormField(
          controller: _c[key],
          readOnly: true,
          decoration: InputDecoration(
              labelText: label, helperText: helper, suffixIcon: const Icon(Icons.calendar_today)),
          validator: required ? requiredField : null,
          onTap: () => _pickDate(_c[key]!),
        );
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.leaseId == null ? l.addLease : l.editLease),
        actions: [TextButton(onPressed: _save, child: Text(l.save))],
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            gap(TextFormField(
              controller: _c['tenantName'],
              decoration: InputDecoration(labelText: l.tenantName),
              validator: (v) => requiredField(v) ?? rule('tenantName', v),
            )),
            gap(TextFormField(
              controller: _c['tenantPhone'],
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: l.tenantPhone),
              validator: (v) => rule('tenantPhone', v),
            )),
            gap(TextFormField(
              controller: _c['tenantEmail'],
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(labelText: l.tenantEmail),
              validator: (v) => rule('tenantEmail', v),
            )),
            gap(TextFormField(
              controller: _c['rentAmount'],
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: l.rentAmount),
              validator: (v) =>
                  requiredField(v) ??
                  rule('rentAmount', v) ??
                  ((num.tryParse(v!) ?? 0) <= 0 ? l.required : null),
            )),
            gap(DropdownButtonFormField<String>(
              initialValue: _frequency,
              decoration: InputDecoration(labelText: l.frequency),
              items: [
                for (final f in ['monthly', 'quarterly', 'yearly'])
                  DropdownMenuItem(value: f, child: Text(l.frequencyLabel(f))),
              ],
              onChanged: (v) => _frequency = v ?? 'monthly',
            )),
            gap(date('startDate', l.startDate, required: true)),
            gap(date('endDate', l.endDate, helper: l.endDateHint)),
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
