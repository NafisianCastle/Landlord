import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/data/analytics.dart';

void main() {
  test('occupancy and profit match the web analytics page', () {
    expect(occupancyRate({'total_units': 4, 'leased_units': 3}), 75);
    expect(occupancyRate({'total_units': 0, 'leased_units': 0}), isNull);
    expect(occupancyRate(null), isNull);
    expect(
        portfolioProfit([
          {'income_12mo': 120000, 'expenses_12mo': 20000},
          {'income_12mo': '0', 'expenses_12mo': 5000},
        ]),
        95000);
  });

  test('monthly points are ordered by month', () {
    final points = monthlyPoints([
      {'month': '2026-10-01', 'income_amount': 5, 'expense_amount': 1},
      {'month': '2026-09-01', 'income_amount': 3, 'expense_amount': 2},
    ]);
    expect(points.map((p) => p.month.month), [9, 10]);
    expect(points.last.income, 5);
  });

  test('ROI is annual income over purchase price, null without a price', () {
    final rows = roiRows(
      [
        (route: 'plots', row: {'id': 'p1', 'name': 'Plot', 'purchase_price': 1000000}),
        (route: 'apartments', row: {'id': 'a1', 'name': 'Flat', 'purchase_price': null}),
      ],
      [
        {'subject_id': 'p1', 'income_12mo': 50000},
        {'subject_id': 'a1', 'income_12mo': 90000},
      ],
      (row) => row['purchase_price'] as num?,
    );
    expect(rows.first.roi, 5);
    expect(rows.first.route, '/plots/p1');
    expect(rows.last.roi, isNull);
    expect(rows.last.annualIncome, 90000);
  });
}
