import 'data/repository.dart';

/// Sort keys for the property lists; [newest] keeps the cache order
/// (newest first), as on the web.
enum PropertySort { newest, name, area }

/// Districts present in [rows], alphabetically.
List<String> districtsOf(List<DbRow> rows) => {
      for (final r in rows)
        if ((r['district'] as String? ?? '').isNotEmpty) r['district'] as String,
    }.toList()
      ..sort();

/// Search (name, upazila, district), district filter and sort, matching
/// the web's lib/listControls.ts.
List<DbRow> applyListControls(
  List<DbRow> rows, {
  String query = '',
  String? district,
  PropertySort sort = PropertySort.newest,
}) {
  final q = query.trim().toLowerCase();
  final filtered = rows.where((r) {
    final matchesQuery = q.isEmpty ||
        [r['name'], r['upazila'], r['district']]
            .whereType<String>()
            .any((field) => field.toLowerCase().contains(q));
    return matchesQuery && (district == null || r['district'] == district);
  }).toList();
  switch (sort) {
    case PropertySort.newest:
      break;
    case PropertySort.name:
      filtered.sort((a, b) => (a['name'] as String? ?? '')
          .toLowerCase()
          .compareTo((b['name'] as String? ?? '').toLowerCase()));
    case PropertySort.area:
      // Largest first; rows without an area go last.
      double area(DbRow r) => (r['area_sq_meters'] as num?)?.toDouble() ?? double.negativeInfinity;
      filtered.sort((a, b) => area(b).compareTo(area(a)));
  }
  return filtered;
}
