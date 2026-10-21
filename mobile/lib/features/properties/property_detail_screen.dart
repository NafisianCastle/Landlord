import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/crypto/key_vault.dart';
import '../../core/data/property_kind.dart';
import '../../core/data/repository.dart';
import '../../core/geo/geo.dart';
import '../../core/geo/units.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../common.dart';
import '../bills/bill_screens.dart';
import '../documents/documents_section.dart';
import '../expenses/expense_screens.dart';
import '../leases/lease_screens.dart';
import '../maintenance/maintenance_screens.dart';
import '../map/base_map.dart';
import 'apartment_location.dart';
import 'property_form_screen.dart';
import 'sharing_section.dart';

class PropertyDetailScreen extends ConsumerWidget {
  const PropertyDetailScreen({super.key, required this.kind, required this.id});
  final PropertyKind kind;
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final rowValue = ref.watch(propertyProvider((kind, id)));
    // Viewers only read; only the owner deletes (matching the RLS policies).
    final role = ref.watch(myRoleProvider((kind, id))).value;
    final canEdit = role == 'owner' || role == 'editor';
    return Scaffold(
      appBar: AppBar(
        title: Text(rowValue.value?['name'] as String? ?? ''),
        actions: [
          if (canEdit)
            IconButton(
              tooltip: l.edit,
              icon: const Icon(Icons.edit),
              onPressed: () => context.go('/${kind.route}/$id/edit'),
            ),
          if (role == 'owner')
            IconButton(
              tooltip: l.delete,
              icon: const Icon(Icons.delete_outline),
              onPressed: () async {
                if (!await confirmDelete(context)) return;
                await ref.read(repositoryProvider).deleteProperty(kind, id);
                if (context.mounted) context.go('/${kind.route}');
              },
            ),
        ],
      ),
      body: AsyncBody(
        value: rowValue,
        builder: (row) => row == null
            ? Center(child: Text(l.notFound))
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (kind == PropertyKind.plot)
                    _BoundaryCard(plotId: id, row: row, canEdit: canEdit),
                  if (kind == PropertyKind.apartment)
                    ApartmentLocationCard(apartment: row),
                  SectionHeader(l.details),
                  _Fields(kind: kind, row: row),
                  DocumentsSection(kind: kind, propertyId: id),
                  LeasesSection(kind: kind, propertyId: id),
                  ExpensesSection(kind: kind, propertyId: id),
                  MaintenanceSection(kind: kind, propertyId: id),
                  // Only the owner can bill tenants (not editor collaborators).
                  if (kind == PropertyKind.apartment && role == 'owner')
                    ApartmentBillsSection(apartment: row),
                  SharingSection(kind: kind, propertyId: id),
                  const SizedBox(height: 32),
                ],
              ),
      ),
    );
  }
}

/// Decrypted (or plaintext) sensitive fields; null while encrypted and locked.
final _sensitiveProvider =
    FutureProvider.family<Map<String, dynamic>?, (PropertyKind, String)>((
      ref,
      args,
    ) async {
      final row = await ref.watch(propertyProvider(args).future);
      final dek = ref.watch(keyVaultProvider);
      if (row == null) return null;
      return ref.read(repositoryProvider).sensitiveValues(args.$1, row, dek);
    });

class _Fields extends ConsumerWidget {
  const _Fields({required this.kind, required this.row});
  final PropertyKind kind;
  final DbRow row;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sensitive = ref.watch(
      _sensitiveProvider((kind, row['id'] as String)),
    );
    final locked = sensitive.hasValue && sensitive.value == null;
    return Card(
      child: Column(
        children: [
          if (locked)
            ListTile(
              leading: const Icon(Icons.lock_outline),
              title: Text(context.l10n.sensitiveLocked),
              onTap: () => context.go('/settings'),
            ),
          ...propertyFieldTiles(context, kind, row, sensitive.value),
        ],
      ),
    );
  }
}

class _BoundaryCard extends StatelessWidget {
  const _BoundaryCard({
    required this.plotId,
    required this.row,
    required this.canEdit,
  });
  final String plotId;
  final DbRow row;
  final bool canEdit;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final points = polygonToPoints(
      row['boundary_geojson'] as Map<String, dynamic>?,
    );
    final areaSqM = (row['area_sq_meters'] as num?)?.toDouble();
    final area = areaSqM == null ? null : AreaConversions(areaSqM);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (points.length >= 3)
            SizedBox(
              height: 220,
              child: BaseMap(
                interactive: false,
                initialFit: CameraFit.coordinates(
                  coordinates: points,
                  padding: const EdgeInsets.all(32),
                ),
                children: [boundaryLayer(points)],
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(l.noBoundary),
            ),
          if (area != null)
            ListTile(
              title: Text(l.area),
              subtitle: Text(
                '${l.decimalValue(formatNumber(context, area.decimal))} · '
                '${l.areaSub(formatNumber(context, area.bigha), formatNumber(context, area.acre))}',
              ),
            ),
          OverflowBar(
            alignment: MainAxisAlignment.end,
            children: [
              if (points.length >= 3)
                TextButton.icon(
                  icon: const Icon(Icons.directions),
                  label: Text(l.directions),
                  onPressed: () => launchUrl(
                    googleMapsDirectionsUrl(polygonCentroid(points)),
                    mode: LaunchMode.externalApplication,
                  ),
                ),
              if (canEdit)
                FilledButton.icon(
                  icon: const Icon(Icons.directions_walk),
                  label: Text(
                    points.length >= 3 ? l.redrawBoundary : l.captureBoundary,
                  ),
                  onPressed: () => context.go('/plots/$plotId/boundary'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
