import '../geo/units.dart';

enum FieldType { text, multiline, number, date, unit }

/// One form field. [key] is the camelCase name the web app uses (and that
/// encrypted JSON blobs are keyed by); [column] is the database column.
class FieldSpec {
  const FieldSpec(this.key, this.column, this.type,
      {this.sensitive = false, this.units = const []});
  final String key;
  final String column;
  final FieldType type;

  /// Encrypted into sensitive_encrypted when the user's key is unlocked.
  final bool sensitive;
  final List<String> units;
}

const _sharedSensitive = [
  FieldSpec('purchasePrice', 'purchase_price', FieldType.number, sensitive: true),
  FieldSpec('purchaseDate', 'purchase_date', FieldType.date, sensitive: true),
  FieldSpec('currentEstimatedValue', 'current_estimated_value', FieldType.number,
      sensitive: true),
  FieldSpec('notes', 'notes', FieldType.multiline, sensitive: true),
];

/// Plots and apartments share almost everything — documents, leases,
/// encryption — so one set of screens handles both.
enum PropertyKind {
  plot(
    route: 'plots',
    table: 'land_plots',
    documentTable: 'plot_documents',
    bucket: 'land-documents',
    foreignKey: 'plot_id',
    collaboratorTable: 'plot_collaborators',
    auditRpc: 'log_plot_collaborator_audit',
    auditParam: 'p_plot_id',
    fields: [
      FieldSpec('name', 'name', FieldType.text),
      FieldSpec('village', 'village', FieldType.text, sensitive: true),
      FieldSpec('upazila', 'upazila', FieldType.text),
      FieldSpec('district', 'district', FieldType.text),
      FieldSpec('division', 'division', FieldType.text),
      FieldSpec('mutationNumber', 'mutation_number', FieldType.text, sensitive: true),
      FieldSpec('dolilArea', 'dolil_area', FieldType.number),
      FieldSpec('dolilAreaUnit', 'dolil_area_unit', FieldType.unit, units: plotAreaUnits),
      FieldSpec('actualArea', 'actual_area', FieldType.number),
      FieldSpec('actualAreaUnit', 'actual_area_unit', FieldType.unit, units: plotAreaUnits),
      ..._sharedSensitive,
    ],
  ),
  apartment(
    route: 'apartments',
    table: 'apartments',
    documentTable: 'apartment_documents',
    bucket: 'apartment-documents',
    foreignKey: 'apartment_id',
    collaboratorTable: 'apartment_collaborators',
    auditRpc: 'log_apartment_collaborator_audit',
    auditParam: 'p_apartment_id',
    fields: [
      FieldSpec('name', 'name', FieldType.text),
      FieldSpec('buildingName', 'building_name', FieldType.text, sensitive: true),
      FieldSpec('unitNumber', 'unit_number', FieldType.text, sensitive: true),
      FieldSpec('floor', 'floor', FieldType.text),
      FieldSpec('upazila', 'upazila', FieldType.text),
      FieldSpec('district', 'district', FieldType.text),
      FieldSpec('division', 'division', FieldType.text),
      FieldSpec('size', 'size', FieldType.number),
      FieldSpec('sizeUnit', 'size_unit', FieldType.unit, units: apartmentSizeUnits),
      ..._sharedSensitive,
    ],
  );

  const PropertyKind({
    required this.route,
    required this.table,
    required this.documentTable,
    required this.bucket,
    required this.foreignKey,
    required this.collaboratorTable,
    required this.auditRpc,
    required this.auditParam,
    required this.fields,
  });

  final String route;
  final String table;
  final String documentTable;
  final String bucket;

  /// Column linking leases and documents to this kind of property.
  final String foreignKey;

  /// Viewer/editor sharing, and the audit-log RPC the web calls on changes.
  final String collaboratorTable;
  final String auditRpc;
  final String auditParam;
  final List<FieldSpec> fields;

  static PropertyKind fromRoute(String route) =>
      values.firstWhere((k) => k.route == route);
}
