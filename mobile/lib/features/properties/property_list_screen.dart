import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/data/property_kind.dart';
import '../../core/list_controls.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../common.dart';
import '../shell/home_shell.dart';

class PropertyListScreen extends ConsumerStatefulWidget {
  const PropertyListScreen({super.key, required this.kind});
  final PropertyKind kind;

  @override
  ConsumerState<PropertyListScreen> createState() => _PropertyListScreenState();
}

class _PropertyListScreenState extends ConsumerState<PropertyListScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  String? _district;
  PropertySort _sort = PropertySort.newest;

  void _clearFilters() {
    _searchController.clear();
    setState(() {
      _query = '';
      _district = null;
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final kind = widget.kind;
    final isPlot = kind == PropertyKind.plot;
    return Scaffold(
      appBar: AppBar(title: Text(isPlot ? l.navPlots : l.navApartments), actions: [
        PopupMenuButton<PropertySort>(
          tooltip: l.sortBy,
          icon: const Icon(Icons.sort),
          initialValue: _sort,
          onSelected: (v) => setState(() => _sort = v),
          itemBuilder: (_) => [
            PopupMenuItem(value: PropertySort.newest, child: Text(l.sortNewest)),
            PopupMenuItem(value: PropertySort.name, child: Text(l.sortName)),
            // Apartment sizes use mixed units, so area sort is plots-only (as on the web).
            if (isPlot) PopupMenuItem(value: PropertySort.area, child: Text(l.sortArea)),
          ],
        ),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/${kind.route}/new'),
        icon: const Icon(Icons.add),
        label: Text(isPlot ? l.addPlot : l.addApartment),
      ),
      body: AsyncBody(
        value: ref.watch(propertiesProvider(kind)),
        builder: (rows) {
          final districts = districtsOf(rows);
          // A removed district must not leave the list stuck on a hidden filter.
          final district = districts.contains(_district) ? _district : null;
          final shown =
              applyListControls(rows, query: _query, district: district, sort: _sort);
          final header = Column(children: [
            if (rows.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 48),
                child: Center(child: Text(isPlot ? l.noPlots : l.noApartments)),
              )
            else ...[
              TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => FocusScope.of(context).unfocus(),
                decoration: InputDecoration(
                  hintText: l.searchProperties,
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _query.isEmpty ? null : IconButton(
                    tooltip: l.clear,
                    icon: const Icon(Icons.close),
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _query = '');
                    },
                  ),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
              if (districts.length > 1 || district != null)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(children: [
                    for (final d in [null, ...districts])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(d ?? l.allDistricts),
                          selected: district == d,
                          onSelected: (_) => setState(() => _district = d),
                        ),
                      ),
                  ]),
                ),
              const SizedBox(height: 8),
            ],
            if (rows.isNotEmpty && shown.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 48),
                child: Column(children: [
                  Text(l.noSearchResults),
                  const SizedBox(height: 8),
                  TextButton(onPressed: _clearFilters, child: Text(l.clear)),
                ]),
              ),
          ]);
          return RefreshableList.builder(
            itemCount: shown.length + 2,
            itemBuilder: (context, index) {
              if (index == 0) return header;
              if (index == shown.length + 1) return const SizedBox(height: 96);
              final row = shown[index - 1];
              return Card(
                key: ValueKey(row['id']),
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
              );
            },
          );
        },
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
        : formatArea(context, area.toDouble()).main;
    return [place, ?areaText].where((s) => s.isNotEmpty).join(' · ');
  }
}
