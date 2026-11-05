/// Calculations behind the web's /analytics page, as pure functions over the
/// cached rows of occupancy_stats, portfolio_monthly_stats and
/// property_financial_stats (all security_invoker views, so RLS-scoped).
library;

typedef StatRow = Map<String, dynamic>;

num _n(Object? v) => v is num ? v : num.tryParse('${v ?? ''}') ?? 0;

/// Leased share of all units, in percent; null with no units.
double? occupancyRate(StatRow? occupancy) {
  final total = _n(occupancy?['total_units']);
  return total > 0 ? _n(occupancy!['leased_units']) / total * 100 : null;
}

/// Trailing-12-month income minus expenses (incl. repair costs), portfolio-wide.
num portfolioProfit(List<StatRow> financials) =>
    financials.fold<num>(0, (sum, f) => sum + _n(f['income_12mo']) - _n(f['expenses_12mo']));

class MonthlyPoint {
  const MonthlyPoint(this.month, this.income, this.expense);
  final DateTime month;
  final num income;
  final num expense;
}

List<MonthlyPoint> monthlyPoints(List<StatRow> monthly) => [
      for (final m in monthly)
        MonthlyPoint(DateTime.parse(m['month'] as String), _n(m['income_amount']),
            _n(m['expense_amount'])),
    ]..sort((a, b) => a.month.compareTo(b.month));

class RoiRow {
  const RoiRow(this.id, this.name, this.route, this.annualIncome, this.roi);
  final String id;
  final String name;
  final String route;
  final num annualIncome;

  /// Annual income as a percentage of purchase price; null without a price.
  final double? roi;
}

/// One row per property. [purchasePrice] resolves a property's price; the app
/// passes decrypted prices when the key is unlocked, so encrypted properties
/// get an ROI too (the web shows "—" for them).
List<RoiRow> roiRows(
  List<({String route, StatRow row})> properties,
  List<StatRow> financials,
  num? Function(StatRow row) purchasePrice,
) {
  final bySubject = {for (final f in financials) f['subject_id']: f};
  return [
    for (final p in properties)
      () {
        final income = _n(bySubject[p.row['id']]?['income_12mo']);
        final price = purchasePrice(p.row);
        return RoiRow(
          p.row['id'] as String,
          p.row['name'] as String? ?? '',
          '/${p.route}/${p.row['id']}',
          income,
          price != null && price > 0 ? income / price * 100 : null,
        );
      }(),
  ];
}
