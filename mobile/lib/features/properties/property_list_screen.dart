import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/data/property_kind.dart';
import '../../core/geo/units.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../common.dart';
import '../shell/home_shell.dart';

class PropertyListScreen extends ConsumerWidget {
  const PropertyListScreen({super.key, required this.kind});
  final PropertyKind kind;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final isPlot = kind == PropertyKind.plot;
    return Scaffold(
      appBar: AppBar(title: Text(isPlot ? l.navPlots : l.navApartments)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/${kind.route}/new'),
        icon: const Icon(Icons.add),
        label: Text(isPlot ? l.addPlot : l.addApartment),
      ),
      body: AsyncBody(
        value: ref.watch(propertiesProvider(kind)),
        builder: (rows) => RefreshableList(children: [
          if (rows.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 48),
              child: Center(child: Text(isPlot ? l.noPlots : l.noApartments)),
            ),
          for (final row in rows)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Icon(isPlot ? Icons.landscape : Icons.apartment),
                title: Text(row['name'] as String? ?? ''),
                subtitle: Text(_subtitle(context, row)),
                trailing: row['sensitive_encrypted'] != null
                    ? Icon(Icons.lock_outline, semanticLabel: l.encrypted)
                    : null,
                onTap: () => context.go('/${kind.route}/${row['id']}'),
              ),
            ),
          const SizedBox(height: 80),
        ]),
      ),
    );
  }

  String _subtitle(BuildContext context, Map<String, dynamic> row) {
    final place = [row['upazila'], row['district']]
        .whereType<String>()
        .where((s) => s.isNotEmpty)
        .join(', ');
    final area = row['area_sq_meters'] as num?;
    final areaText = area == null
        ? null
        : context.l10n.decimalValue(formatNumber(context, AreaConversions(area.toDouble()).decimal));
    return [place, ?areaText].where((s) => s.isNotEmpty).join(' · ');
  }
}
