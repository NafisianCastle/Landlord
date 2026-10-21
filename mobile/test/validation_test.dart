import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/validation/forms.dart';

void main() {
  test('property rules mirror lib/validation/forms.ts', () {
    expect(validateFields({'name': ''}, propertyRules), 'name is required.');
    expect(validateFields({'name': 'Plot'}, propertyRules), isNull);
    expect(validateFields({'name': 'x' * 201}, propertyRules),
        contains('too long'));
    expect(validateFields({'name': 'a\u0001'}, propertyRules),
        contains('invalid characters'));
    expect(validateFields({'name': 'P', 'purchasePrice': '-1'}, propertyRules),
        'Invalid purchasePrice.');
    expect(validateFields({'name': 'P', 'purchasePrice': '1e3'}, propertyRules),
        'Invalid purchasePrice.');
    expect(
        validateFields(
            {'name': 'P', 'purchasePrice': '1000000000001'}, propertyRules),
        'Invalid purchasePrice.');
    expect(validateFields({'name': 'P', 'dolilAreaUnit': 'hectare'}, propertyRules),
        'Invalid dolilAreaUnit.');
  });

  test('dates must be real calendar dates', () {
    expect(validDate('2024-02-29'), isTrue);
    expect(validDate('2023-02-29'), isFalse);
    expect(validDate('1899-12-31'), isFalse);
    expect(validDate('2024-1-01'), isFalse);
  });

  test('lease end date cannot precede start', () {
    expect(
        validateLease({'startDate': '2025-01-01', 'endDate': '2024-12-31'}),
        contains('on or after'));
    expect(validateLease({'tenantPhone': '+880 1711-000000'}), isNull);
    expect(validateLease({'tenantEmail': 'nope'}), 'Invalid tenantEmail.');
  });

  test('expense and maintenance rules mirror the web', () {
    expect(validateFields({'category': 'tax', 'amount': '500'}, expenseRules), isNull);
    expect(validateFields({'category': 'bribe'}, expenseRules), 'Invalid category.');
    expect(validateFields({'expenseDate': '2025-13-01'}, expenseRules), 'Invalid expenseDate.');
    expect(validateFields({'title': 'x' * 201}, maintenanceRules), contains('too long'));
    expect(validateFields({'title': 'Leak', 'cost': 'abc'}, maintenanceRules), 'Invalid cost.');
    expect(validateFields({'title': 'Leak', 'cost': ''}, maintenanceRules), isNull);
  });
}
