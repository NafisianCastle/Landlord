import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/data/property_kind.dart';
import '../../core/data/repository.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/validation/forms.dart';
import '../common.dart';

/// Expenses for a plot/apartment. As on the web: add and delete, no edit.
class ExpensesSection extends ConsumerWidget {
  const ExpensesSection({super.key, required this.kind, required this.propertyId});
  final PropertyKind kind;
  final String propertyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final hidden = ref.watch(hiddenRowsProvider);
    final expenses = [
      for (final e in ref.watch(expensesProvider((kind, propertyId))).value ?? <DbRow>[])
        if (!hidden.contains(e['id'])) e,
    ];
    final repo = ref.read(repositoryProvider);
    // Only apartment owners can share expenses with tenants.
    final canShare = kind == PropertyKind.apartment &&
        ref.watch(propertyProvider((kind, propertyId))).value?['user_id'] == repo.userId;
    final total = expenses.fold<num>(0, (sum, e) => sum + (e['amount'] as num? ?? 0));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(l.expenses,
            trailing: TextButton.icon(
              icon: const Icon(Icons.add),
              label: Text(l.addExpense),
              onPressed: () => context.go('/${kind.route}/$propertyId/expenses/new'),
            )),
        if (canShare)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(l.expenseVisibilityHint, style: Theme.of(context).textTheme.bodySmall),
          ),
        Card(
          child: Column(children: [
            if (expenses.isEmpty) ListTile(title: Text(l.noExpenses)),
            for (final e in expenses)
              SwipeToDelete(
                id: e['id'] as String,
                onDelete: () => repo.deleteExpense(e['id'] as String),
                child: ListTile(
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: Text(l.expenseCategory(e['category'] as String? ?? 'other')),
                  subtitle: Text([e['expense_date'], e['notes']]
                      .whereType<String>()
                      .where((s) => s.isNotEmpty)
                      .join(' · ')),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(formatBdt(context, e['amount'])),
                    if (canShare)
                      IconButton(
                        tooltip: e['visible_to_tenants'] == true ? l.hideExpense : l.shareExpense,
                        icon: Icon(e['visible_to_tenants'] == true
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined),
                        onPressed: () =>
                            repo.setExpenseVisibility(e, e['visible_to_tenants'] != true),
                      ),
                    IconButton(
                      tooltip: l.delete,
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => deleteWithUndo(context, ref, e['id'] as String,
                          () => repo.deleteExpense(e['id'] as String)),
                    ),
                  ]),
                ),
              ),
            if (expenses.isNotEmpty)
              ListTile(
                dense: true,
                title: Text(l.expensesTotal(formatBdt(context, total)),
                    textAlign: TextAlign.end),
              ),
          ]),
        ),
      ],
    );
  }
}

class ExpenseFormScreen extends ConsumerStatefulWidget {
  const ExpenseFormScreen({super.key, required this.kind, required this.propertyId});
  final PropertyKind kind;
  final String propertyId;

  @override
  ConsumerState<ExpenseFormScreen> createState() => _ExpenseFormScreenState();
}

class _ExpenseFormScreenState extends ConsumerState<ExpenseFormScreen> {
  final _form = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _date = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 10));
  final _notes = TextEditingController();
  String _category = 'other';

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final values = {
      'category': _category,
      'amount': _amount.text.trim(),
      'expenseDate': _date.text,
      'notes': _notes.text,
    };
    final error = validateFields(values, expenseRules);
    if (error != null) return showMessage(context, error);
    await ref.read(repositoryProvider).addExpense(widget.kind, widget.propertyId, values);
    if (mounted) context.go('/${widget.kind.route}/${widget.propertyId}');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget gap(Widget w) => Padding(padding: const EdgeInsets.only(bottom: 12), child: w);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.addExpense),
        actions: [TextButton(onPressed: _save, child: Text(l.save))],
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            gap(DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: InputDecoration(labelText: l.category),
              items: [
                for (final c in expenseCategories)
                  DropdownMenuItem(value: c, child: Text(l.expenseCategory(c))),
              ],
              onChanged: (v) => _category = v ?? 'other',
            )),
            gap(TextFormField(
              controller: _amount,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: l.amount),
              // Same as createExpense: a positive amount is required.
              validator: (v) =>
                  (num.tryParse(v?.trim() ?? '') ?? 0) <= 0 ? l.required : null,
            )),
            gap(DateField(controller: _date, label: l.expenseDate)),
            gap(TextFormField(
              controller: _notes,
              maxLines: 3,
              decoration: InputDecoration(labelText: l.field_notes),
            )),
          ],
        ),
      ),
    );
  }
}
