import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/list_controls.dart';

void main() {
  final rows = [
    {'id': '1', 'name': 'Beta', 'district': 'Dhaka', 'upazila': 'Savar', 'area_sq_meters': 100},
    {'id': '2', 'name': 'alpha', 'district': 'Sylhet', 'upazila': null, 'area_sq_meters': null},
    {'id': '3', 'name': 'Gamma', 'district': 'Dhaka', 'upazila': 'Keraniganj', 'area_sq_meters': 300},
  ];
  List<String?> ids(List<Map<String, dynamic>> r) => r.map((e) => e['id'] as String?).toList();

  test('districtsOf lists distinct districts alphabetically', () {
    expect(districtsOf([...rows, {'id': '4', 'district': ''}]), ['Dhaka', 'Sylhet']);
  });

  test('search matches name, upazila or district, case-insensitively', () {
    expect(ids(applyListControls(rows, query: 'ALPHA')), ['2']);
    expect(ids(applyListControls(rows, query: 'savar')), ['1']);
    expect(ids(applyListControls(rows, query: ' sylhet ')), ['2']);
  });

  test('district filter combines with search', () {
    expect(ids(applyListControls(rows, district: 'Dhaka')), ['1', '3']);
    expect(ids(applyListControls(rows, district: 'Dhaka', query: 'gam')), ['3']);
  });

  test('sorts keep newest order, by name, or by area with blanks last', () {
    expect(ids(applyListControls(rows)), ['1', '2', '3']);
    expect(ids(applyListControls(rows, sort: PropertySort.name)), ['2', '1', '3']);
    expect(ids(applyListControls(rows, sort: PropertySort.area)), ['3', '1', '2']);
  });
}
