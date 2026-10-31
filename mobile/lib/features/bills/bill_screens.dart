import 'dart:io';
import 'dart:typed_data';

import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;

import '../../core/data/repository.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/validation/bills.dart';
import '../../core/validation/forms.dart';
import '../common.dart';
import '../documents/documents_section.dart';
import '../shell/home_shell.dart';

/// Bill copy or payment proof: scan to PDF, take a photo, or pick a file.
Future<(String, Uint8List)?> pickBillFile(BuildContext context) async {
  final l = context.l10n;
  final choice = await showModalBottomSheet<String>(
    context: context,
    builder: (context) => SafeArea(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(
          leading: const Icon(Icons.document_scanner_outlined),
          title: Text(l.scanDocument),
          onTap: () => Navigator.pop(context, 'scan'),
        ),
        ListTile(
          leading: const Icon(Icons.photo_camera_outlined),
          title: Text(l.takePhoto),
          onTap: () => Navigator.pop(context, 'photo'),
        ),
        ListTile(
          leading: const Icon(Icons.attach_file),
          title: Text(l.chooseFile),
          onTap: () => Navigator.pop(context, 'file'),
        ),
      ]),
    ),
  );
  final stamp = DateFormat('yyyy-MM-dd HH.mm').format(DateTime.now());
  switch (choice) {
    case 'scan':
      final paths = await CunningDocumentScanner.getPictures(asPdf: true);
      if (paths == null || paths.isEmpty) return null;
      return ('Scan $stamp.pdf', await File(paths.first).readAsBytes());
    case 'photo':
      final paths = await CunningDocumentScanner.getPictures(noOfPages: 1);
      if (paths == null || paths.isEmpty) return null;
      final ext = p.extension(paths.first).toLowerCase();
      return ('Photo $stamp${ext.isEmpty ? '.jpg' : ext}', await File(paths.first).readAsBytes());
    case 'file':
      final file = await FilePicker.pickFile(
          type: FileType.custom, allowedExtensions: billFileExtensions);
      if (file == null) return null;
      return (file.name, await file.readAsBytes());
  }
  return null;
}

Future<void> openBillFile(
    BuildContext context, WidgetRef ref, String storagePath, String fileName) async {
  Uint8List? bytes;
  final ok = await runOnlineAction(context, () async {
    bytes = await ref.read(repositoryProvider).downloadBillFile(storagePath);
  });
  if (!ok || bytes == null || !context.mounted) return;
  await Navigator.of(context).push(MaterialPageRoute<void>(
    builder: (_) => fileName.toLowerCase().endsWith('.pdf')
        ? PdfViewerScreen(title: fileName, bytes: bytes!)
        : Scaffold(
            appBar: AppBar(title: Text(fileName)),
            body: InteractiveViewer(child: Center(child: Image.memory(bytes!))),
          ),
  ));
}

/// Owner review prompts / tenant due reminders, like the web's BillAlerts.
class BillAlerts extends ConsumerWidget {
  const BillAlerts({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final me = ref.read(repositoryProvider).userId;
    final bills = ref.watch(allBillsProvider).value ?? [];
    final proofs = ref.watch(billProofsProvider).value ?? [];
    List<DbRow> proofsFor(DbRow b) => proofs.where((p) => p['bill_id'] == b['id']).toList();
    final horizon =
        DateTime.now().add(const Duration(days: 3)).toIso8601String().substring(0, 10);
    final toReview = bills
        .where((b) => b['owner_id'] == me && proofsFor(b).any((p) => p['status'] == 'pending'))
        .length;
    final due = bills.where((b) {
      final status = billStatus(b, proofsFor(b));
      return b['owner_id'] != me &&
          (status == 'overdue' ||
              (status == 'unpaid' && (b['due_date'] as String).compareTo(horizon) <= 0));
    }).length;
    if (toReview == 0 && due == 0) return const SizedBox.shrink();
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: const Icon(Icons.receipt_long),
        title: Text([
          if (toReview > 0) l.reviewAlert(toReview),
          if (due > 0) l.dueAlert(due),
        ].join('\n')),
        onTap: () => context.go('/bills'),
      ),
    );
  }
}

/// The Bills tab: every bill the user can see, as owner or tenant, plus
/// expenses owners shared with them (reference only).
class BillsScreen extends ConsumerWidget {
  const BillsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final me = ref.read(repositoryProvider).userId;
    final proofs = ref.watch(billProofsProvider).value ?? [];
    final tenancies = ref.watch(myTenanciesProvider).value ?? [];
    final shared = ref.watch(sharedExpensesProvider).value ?? [];
    String? label(Object? apartmentId) =>
        tenancies.where((t) => t['apartment_id'] == apartmentId).firstOrNull?['apartment_label']
            as String?;
    return Scaffold(
      appBar: AppBar(title: Text(l.bills)),
      body: AsyncBody(
        value: ref.watch(allBillsProvider),
        builder: (bills) => RefreshableList(children: [
          Text(l.billsPortalHint, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 12),
          const BillAlerts(),
          if (bills.isEmpty) Card(child: ListTile(title: Text(l.noBills))),
          for (final bill in bills)
            BillCard(
              bill: bill,
              proofs: proofs.where((p) => p['bill_id'] == bill['id']).toList(),
              isOwner: bill['owner_id'] == me,
              apartmentLabel: label(bill['apartment_id']),
            ),
          SectionHeader(l.sharedExpenses),
          Text(l.sharedExpensesHint, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          Card(
            child: Column(children: [
              if (shared.isEmpty) ListTile(title: Text(l.noSharedExpenses)),
              for (final e in shared)
                ListTile(
                  leading: const Icon(Icons.receipt_outlined),
                  title: Text(l.expenseCategory(e['category'] as String? ?? 'other')),
                  subtitle: Text([label(e['apartment_id']), e['expense_date'], e['notes']]
                      .whereType<String>()
                      .where((s) => s.isNotEmpty)
                      .join(' · ')),
                  trailing: Text(formatMoney(context, e['amount'])),
                ),
            ]),
          ),
        ]),
      ),
    );
  }
}

class BillCard extends ConsumerWidget {
  const BillCard({
    super.key,
    required this.bill,
    required this.proofs,
    required this.isOwner,
    this.apartmentLabel,
  });
  final DbRow bill;
  final List<DbRow> proofs;
  final bool isOwner;
  final String? apartmentLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final repo = ref.read(repositoryProvider);
    final scheme = Theme.of(context).colorScheme;
    final status = billStatus(bill, proofs);
    final visible = bill['visible_to_tenant'] == true;
    final paid = bill['paid_at'] != null;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(bill['title'] as String? ?? '',
                      style: Theme.of(context).textTheme.titleMedium),
                  if (apartmentLabel != null) Text(apartmentLabel!),
                  if (isOwner)
                    Text(bill['tenant_email'] as String? ?? '',
                        style: Theme.of(context).textTheme.bodySmall),
                ]),
              ),
              Chip(
                label: Text(l.billStatusLabel(status)),
                backgroundColor: status == 'overdue' ? scheme.errorContainer : null,
              ),
            ]),
            Text('${formatMoney(context, bill['amount'])} · ${l.billDue('${bill['due_date']}')}'),
            if (bill['storage_path'] != null)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  icon: const Icon(Icons.description_outlined),
                  label: Text('${l.viewBill} · ${bill['file_name']}', overflow: TextOverflow.ellipsis),
                  onPressed: () => openBillFile(context, ref, bill['storage_path'] as String,
                      bill['file_name'] as String),
                ),
              ),
            if (isOwner)
              Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                Chip(label: Text(visible ? l.billShared : l.billPrivate)),
                OutlinedButton(
                  onPressed: () => runOnlineAction(
                      context, () => repo.setBillVisibility(bill['id'] as String, !visible)),
                  child: Text(visible ? l.billHide : l.billShare),
                ),
                if (bill['tenant_share_id'] == null)
                  Text(l.billTenantRemoved, style: Theme.of(context).textTheme.bodySmall),
              ]),
            for (final proof in proofs) _ProofTile(bill: bill, proof: proof, isOwner: isOwner),
            if (!isOwner && !paid && status != 'pending')
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: FilledButton.icon(
                  icon: const Icon(Icons.upload_file),
                  label: Text(l.submitProof),
                  onPressed: () async {
                    final file = await pickBillFile(context);
                    if (file == null || !context.mounted) return;
                    await runOnlineAction(context, () => repo.submitProof(bill, file.$1, file.$2),
                        success: l.proofSubmitted);
                  },
                ),
              ),
            if (!isOwner && status == 'pending')
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(l.billApprovalHint, style: Theme.of(context).textTheme.bodySmall),
              ),
          ],
        ),
      ),
    );
  }
}

class _ProofTile extends ConsumerWidget {
  const _ProofTile({required this.bill, required this.proof, required this.isOwner});
  final DbRow bill;
  final DbRow proof;
  final bool isOwner;

  Future<void> _reject(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final note = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.rejectProof),
        content: TextField(
          controller: note,
          maxLength: 1000,
          decoration: InputDecoration(labelText: l.rejectionReason),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
          FilledButton(
            onPressed: () {
              if (note.text.trim().isNotEmpty) Navigator.pop(context, note.text.trim());
            },
            child: Text(l.rejectProof),
          ),
        ],
      ),
    );
    if (reason == null || !context.mounted) return;
    await runOnlineAction(
        context, () => ref.read(repositoryProvider).reviewProof(proof['id'] as String, false, reason));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final created = DateTime.tryParse(proof['created_at'] as String? ?? '');
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(
            child: TextButton(
              style: TextButton.styleFrom(alignment: Alignment.centerLeft),
              onPressed: () => openBillFile(
                  context, ref, proof['storage_path'] as String, proof['file_name'] as String),
              child: Text('${l.viewProof} · ${proof['file_name']}', overflow: TextOverflow.ellipsis),
            ),
          ),
          Chip(label: Text(l.proofStatusLabel(proof['status'] as String? ?? 'pending'))),
        ]),
        if (created != null)
          Text(DateFormat.yMMMd(Localizations.localeOf(context).toString()).format(created.toLocal()),
              style: Theme.of(context).textTheme.bodySmall),
        if (proof['review_note'] != null) Text(l.reviewNote(proof['review_note'] as String)),
        if (isOwner && proof['status'] == 'pending' && bill['paid_at'] == null)
          OverflowBar(alignment: MainAxisAlignment.end, spacing: 8, children: [
            OutlinedButton(onPressed: () => _reject(context, ref), child: Text(l.rejectProof)),
            FilledButton(
              onPressed: () => runOnlineAction(context,
                  () => ref.read(repositoryProvider).reviewProof(proof['id'] as String, true, null)),
              child: Text(l.approveProof),
            ),
          ]),
      ]),
    );
  }
}

/// Owner's bills block on an apartment they own: tenants and monthly bills.
class ApartmentBillsSection extends ConsumerWidget {
  const ApartmentBillsSection({super.key, required this.apartment});
  final DbRow apartment;

  Future<void> _invite(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final email = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.inviteTenant),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
            controller: email,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(labelText: l.email),
          ),
          const SizedBox(height: 12),
          Text(l.tenantHelp, style: Theme.of(context).textTheme.bodySmall),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
          FilledButton(
            onPressed: () {
              if (emailPattern.hasMatch(email.text.trim())) Navigator.pop(context, email.text.trim());
            },
            child: Text(l.invite),
          ),
        ],
      ),
    );
    if (value == null || !context.mounted) return;
    await runOnlineAction(
        context,
        () => ref.read(repositoryProvider).inviteTenant(
            apartment['id'] as String, apartment['name'] as String, value));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final id = apartment['id'] as String;
    final tenants = ref.watch(tenantSharesProvider(id)).value ?? [];
    final bills = ref.watch(apartmentBillsProvider(id)).value ?? [];
    final proofs = ref.watch(billProofsProvider).value ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.bills,
            trailing: TextButton.icon(
              icon: const Icon(Icons.add),
              label: Text(l.createBill),
              onPressed: tenants.isEmpty ? null : () => context.go('/apartments/$id/bills/new'),
            )),
        Text(l.billsOwnerHint, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 8),
        Card(
          child: Column(children: [
            ListTile(
              title: Text('${l.tenants} · ${l.roleTenant}'),
              trailing: IconButton(
                tooltip: l.inviteTenant,
                icon: const Icon(Icons.person_add_alt),
                onPressed: () => _invite(context, ref),
              ),
            ),
            if (tenants.isEmpty) ListTile(dense: true, title: Text(l.billInviteFirst)),
            for (final t in tenants)
              ListTile(
                dense: true,
                leading: const Icon(Icons.person_outline),
                title: Text(t['invited_email'] as String? ?? ''),
                trailing: TextButton(
                  child: Text(l.remove),
                  onPressed: () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        content: Text(l.removeTenantConfirm(t['invited_email'] as String)),
                        actions: [
                          TextButton(
                              onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
                          FilledButton(
                              onPressed: () => Navigator.pop(context, true), child: Text(l.remove)),
                        ],
                      ),
                    );
                    if (ok == true && context.mounted) {
                      await runOnlineAction(context, () => ref.read(repositoryProvider).removeTenant(t));
                    }
                  },
                ),
              ),
          ]),
        ),
        const SizedBox(height: 8),
        if (bills.isEmpty) Card(child: ListTile(title: Text(l.noBills))),
        for (final bill in bills)
          BillCard(
            bill: bill,
            proofs: proofs.where((p) => p['bill_id'] == bill['id']).toList(),
            isOwner: true,
          ),
      ],
    );
  }
}

class BillFormScreen extends ConsumerStatefulWidget {
  const BillFormScreen({super.key, required this.apartmentId});
  final String apartmentId;

  @override
  ConsumerState<BillFormScreen> createState() => _BillFormScreenState();
}

class _BillFormScreenState extends ConsumerState<BillFormScreen> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _amount = TextEditingController();
  final _due = TextEditingController();
  String? _shareId;
  bool _visible = true;
  (String, Uint8List)? _file;
  bool _saving = false;

  Future<void> _save(List<DbRow> tenants) async {
    final l = context.l10n;
    if (!_form.currentState!.validate()) return;
    final values = {'title': _title.text, 'amount': _amount.text, 'dueDate': _due.text};
    final error = validateBill(values);
    if (error != null) return showMessage(context, error);
    final file = _file;
    if (file == null) return showMessage(context, l.billError_chooseFile);
    final share = tenants.firstWhere((t) => t['id'] == (_shareId ?? tenants.first['id']));
    setState(() => _saving = true);
    final ok = await runOnlineAction(
      context,
      () => ref.read(repositoryProvider).createBill(
            apartmentId: widget.apartmentId,
            share: share,
            values: values,
            visible: _visible,
            fileName: file.$1,
            bytes: file.$2,
          ),
      success: l.billCreated,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) context.go('/apartments/${widget.apartmentId}');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final tenants = ref.watch(tenantSharesProvider(widget.apartmentId)).value ?? [];
    Widget gap(Widget w) => Padding(padding: const EdgeInsets.only(bottom: 12), child: w);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.createBill),
        actions: [
          TextButton(
            onPressed: _saving || tenants.isEmpty ? null : () => _save(tenants),
            child: Text(l.save),
          ),
        ],
      ),
      body: tenants.isEmpty
          ? Padding(padding: const EdgeInsets.all(16), child: Text(l.billInviteFirst))
          : Form(
              key: _form,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  gap(TextFormField(
                    controller: _title,
                    decoration:
                        InputDecoration(labelText: l.billTitle, hintText: l.billTitlePlaceholder),
                    validator: (v) => (v ?? '').trim().isEmpty ? l.required : null,
                  )),
                  gap(DropdownButtonFormField<String>(
                    initialValue: _shareId ?? tenants.first['id'] as String,
                    decoration: InputDecoration(labelText: l.billTenant),
                    items: [
                      for (final t in tenants)
                        DropdownMenuItem(
                            value: t['id'] as String, child: Text(t['invited_email'] as String)),
                    ],
                    onChanged: (v) => _shareId = v,
                  )),
                  gap(TextFormField(
                    controller: _amount,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: l.billAmount),
                    validator: (v) => (v ?? '').trim().isEmpty ? l.required : null,
                  )),
                  gap(DateField(controller: _due, label: l.billDueDate)),
                  gap(ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.attach_file),
                    title: Text(_file?.$1 ?? l.billCopy),
                    subtitle: Text(l.billFileHint),
                    trailing: OutlinedButton(
                      onPressed: () async {
                        final file = await pickBillFile(context);
                        if (file != null) setState(() => _file = file);
                      },
                      child: Text(l.chooseFile),
                    ),
                  )),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l.billVisible),
                    value: _visible,
                    onChanged: (v) => setState(() => _visible = v),
                  ),
                  if (_saving) const LinearProgressIndicator(),
                ],
              ),
            ),
    );
  }
}
