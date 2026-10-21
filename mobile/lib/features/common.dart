import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/l10n.dart';

String formatBdt(BuildContext context, Object? amount) {
  final value = amount is num ? amount : num.tryParse('${amount ?? ''}');
  if (value == null) return '—';
  return NumberFormat.currency(
          locale: Localizations.localeOf(context).toString(), symbol: '৳', decimalDigits: 0)
      .format(value);
}

String formatNumber(BuildContext context, num value, {int digits = 2}) =>
    NumberFormat.decimalPatternDigits(
            locale: Localizations.localeOf(context).toString(), decimalDigits: digits)
        .format(value);

/// Renders an AsyncValue with shared loading/error states.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({super.key, required this.value, required this.builder});
  final AsyncValue<T> value;
  final Widget Function(T data) builder;

  @override
  Widget build(BuildContext context) => switch (value) {
        AsyncData(:final value) => builder(value),
        AsyncError(:final error) =>
          Center(child: Text(context.l10n.errorMessage('$error'))),
        _ => const Center(child: CircularProgressIndicator()),
      };
}

Future<bool> confirmDelete(BuildContext context) async {
  final l = context.l10n;
  return await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          content: Text(l.confirmDelete),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.delete)),
          ],
        ),
      ) ??
      false;
}

void showMessage(BuildContext context, String message) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.trailing});
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 24, bottom: 8),
        child: Row(
          children: [
            Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
            ?trailing,
          ],
        ),
      );
}

/// Read-only text field that opens a date picker and stores YYYY-MM-DD.
class DateField extends StatelessWidget {
  const DateField({super.key, required this.controller, required this.label});
  final TextEditingController controller;
  final String label;

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        readOnly: true,
        decoration: InputDecoration(labelText: label, suffixIcon: const Icon(Icons.calendar_today)),
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: DateTime.tryParse(controller.text) ?? DateTime.now(),
            firstDate: DateTime(1900),
            lastDate: DateTime(2100),
          );
          if (picked != null) controller.text = picked.toIso8601String().substring(0, 10);
        },
      );
}
