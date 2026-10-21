import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/crypto/key_vault.dart';
import '../../core/data/property_kind.dart';
import '../../core/data/repository.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/validation/forms.dart';
import '../common.dart';

/// Create/edit form for plots and apartments, built from [PropertyKind.fields].
class PropertyFormScreen extends ConsumerStatefulWidget {
  const PropertyFormScreen({super.key, required this.kind, this.id});
  final PropertyKind kind;
  final String? id;

  @override
  ConsumerState<PropertyFormScreen> createState() => _PropertyFormScreenState();
}

class _PropertyFormScreenState extends ConsumerState<PropertyFormScreen> {
  final _form = GlobalKey<FormState>();
  late final Map<String, TextEditingController> _controllers = {
    for (final f in widget.kind.fields)
      if (f.type != FieldType.unit) f.key: TextEditingController()
  };
  final Map<String, String?> _units = {};
  bool _loaded = false;
  bool _sensitiveLocked = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.id != null) {
      final repo = ref.read(repositoryProvider);
      final row = await repo.property(widget.kind, widget.id!);
      if (row != null) {
        final sensitive =
            await repo.sensitiveValues(widget.kind, row, ref.read(keyVaultProvider));
        _sensitiveLocked = sensitive == null;
        for (final f in widget.kind.fields) {
          final value = f.sensitive ? (sensitive?[f.key]) : row[f.column];
          if (f.type == FieldType.unit) {
            _units[f.key] = f.units.contains(value) ? value as String : null;
          } else {
            _controllers[f.key]!.text = value?.toString() ?? '';
          }
        }
      }
    }
    if (mounted) setState(() => _loaded = true);
  }

  Map<String, String> get _values => {
        for (final e in _controllers.entries) e.key: e.value.text,
        for (final e in _units.entries)
          if (e.value != null) e.key: e.value!,
      };

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final error = validateFields(_values, {
      for (final f in widget.kind.fields) f.key: propertyRules[f.key]!,
    });
    if (error != null) {
      showMessage(context, error);
      return;
    }
    setState(() => _saving = true);
    try {
      final id = await ref.read(repositoryProvider).saveProperty(
            widget.kind,
            widget.id,
            _values,
            dek: ref.read(keyVaultProvider),
            sensitiveLocked: _sensitiveLocked,
          );
      if (mounted) context.go('/${widget.kind.route}/$id');
    } catch (e) {
      if (mounted) showMessage(context, context.l10n.errorMessage('$e'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final isPlot = widget.kind == PropertyKind.plot;
    final unlocked = ref.watch(keyVaultProvider) != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.id == null ? (isPlot ? l.addPlot : l.addApartment) : l.edit),
        actions: [
          TextButton(onPressed: _saving || !_loaded ? null : _save, child: Text(l.save)),
        ],
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _form,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_sensitiveLocked)
                    _Notice(icon: Icons.lock_outline, text: l.sensitiveLocked)
                  else if (unlocked)
                    _Notice(icon: Icons.enhanced_encryption_outlined, text: l.willEncrypt),
                  for (final f in widget.kind.fields) _field(context, f),
                ],
              ),
            ),
    );
  }

  Widget _field(BuildContext context, FieldSpec f) {
    final l = context.l10n;
    final disabled = f.sensitive && _sensitiveLocked;
    final label = f.type == FieldType.unit ? l.unit : l.field(f.key);
    final Widget input = switch (f.type) {
      FieldType.unit => DropdownButtonFormField<String>(
          initialValue: _units[f.key],
          decoration: InputDecoration(labelText: label),
          items: [
            for (final u in f.units) DropdownMenuItem(value: u, child: Text(l.areaUnit(u))),
          ],
          onChanged: (v) => _units[f.key] = v,
        ),
      FieldType.date => TextFormField(
          controller: _controllers[f.key],
          enabled: !disabled,
          readOnly: true,
          decoration: InputDecoration(
              labelText: label, suffixIcon: const Icon(Icons.calendar_today)),
          onTap: () => _pickDate(_controllers[f.key]!),
        ),
      _ => TextFormField(
          controller: _controllers[f.key],
          enabled: !disabled,
          maxLines: f.type == FieldType.multiline ? 4 : 1,
          keyboardType: f.type == FieldType.number
              ? const TextInputType.numberWithOptions(decimal: true)
              : null,
          decoration: InputDecoration(labelText: label),
          validator: (v) {
            final rule = propertyRules[f.key]!;
            if (f.key == 'name' && (v ?? '').trim().isEmpty) return l.required;
            return validateFields({f.key: v}, {f.key: rule});
          },
        ),
    };
    return Padding(padding: const EdgeInsets.only(bottom: 12), child: input);
  }

  Future<void> _pickDate(TextEditingController controller) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(controller.text) ?? DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime(2100),
    );
    if (picked != null) controller.text = picked.toIso8601String().substring(0, 10);
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 16),
        child: ListTile(leading: Icon(icon), title: Text(text)),
      );
}

/// Read-only rendering of a property's fields for the detail screen.
List<Widget> propertyFieldTiles(
    BuildContext context, PropertyKind kind, DbRow row, Map<String, dynamic>? sensitive) {
  final l = context.l10n;
  final tiles = <Widget>[];
  for (final f in kind.fields) {
    if (f.type == FieldType.unit || f.key == 'name') continue;
    final value = f.sensitive ? (sensitive?[f.key]) : row[f.column];
    if (f.sensitive && sensitive == null) continue;
    if (value == null || '$value'.isEmpty) continue;
    var text = f.key.contains('Price') || f.key.contains('Value')
        ? formatBdt(context, value)
        : '$value';
    final unitField = kind.fields.where((u) => u.key == '${f.key}Unit').firstOrNull;
    final unit = unitField == null ? null : row[unitField.column] as String?;
    if (unit != null) text = '$text ${l.areaUnit(unit)}';
    tiles.add(ListTile(dense: true, title: Text(l.field(f.key)), subtitle: Text(text)));
  }
  return tiles;
}
