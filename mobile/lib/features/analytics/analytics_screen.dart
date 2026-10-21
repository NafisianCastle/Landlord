import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/crypto/key_vault.dart';
import '../../core/data/analytics.dart';
import '../../core/data/property_kind.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../common.dart';
import '../shell/home_shell.dart';

/// Chart colors: categorical slots 1 and 2 of the dataviz reference palette,
/// validated on this app's surfaces (paper #F7F8F2 / dark #0F2A23). Income
/// and expense are series identity, not status, so no green/red.
const _incomeLight = Color(0xFF2A78D6), _incomeDark = Color(0xFF3987E5);
const _expenseLight = Color(0xFFEB6834), _expenseDark = Color(0xFFD95926);

class _AnalyticsView {
  const _AnalyticsView(this.occupancyRow, this.occupancy, this.profit, this.points, this.roi);
  final StatRow? occupancyRow;
  final double? occupancy;
  final num profit;
  final List<MonthlyPoint> points;
  final List<RoiRow> roi;
}

final _analyticsProvider = FutureProvider<_AnalyticsView>((ref) async {
  ref.watch(dataRevisionProvider);
  final dek = ref.watch(keyVaultProvider);
  final repo = ref.read(repositoryProvider);
  final data = await repo.analytics();
  final properties = <({String route, StatRow row})>[];
  final prices = <String, num?>{};
  for (final kind in PropertyKind.values) {
    for (final row in await repo.properties(kind)) {
      properties.add((route: kind.route, row: row));
      // Encrypted purchase prices are null in the database; decrypt them
      // here when the key is unlocked so those properties get an ROI too.
      final sensitive = await repo.sensitiveValues(kind, row, dek);
      prices[row['id'] as String] = sensitive?['purchasePrice'] as num?;
    }
  }
  return _AnalyticsView(
    data.occupancy,
    occupancyRate(data.occupancy),
    portfolioProfit(data.financials),
    monthlyPoints(data.monthly),
    roiRows(properties, data.financials, (row) => prices[row['id']]),
  );
});

/// Mobile version of the web's /analytics page.
class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.analytics)),
      body: AsyncBody(
        value: ref.watch(_analyticsProvider),
        builder: (view) => RefreshableList(children: [
          Row(children: [
            Expanded(
              child: _Tile(
                label: l.occupancyRate,
                value: view.occupancy == null ? '—' : '${view.occupancy!.toStringAsFixed(0)}%',
                sub: view.occupancyRow == null
                    ? null
                    : l.unitsLeased('${view.occupancyRow!['leased_units'] ?? 0}',
                        '${view.occupancyRow!['total_units'] ?? 0}'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Tile(
                label: l.portfolioProfit12mo,
                value: formatBdt(context, view.profit),
                negative: view.profit < 0,
              ),
            ),
          ]),
          SectionHeader(l.incomeVsExpense),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: TrendChart(points: view.points),
            ),
          ),
          SectionHeader(l.roiPerProperty),
          Card(
            child: Column(children: [
              if (view.roi.isEmpty) ListTile(title: Text(l.noPropertiesYet)),
              for (final row in view.roi)
                ListTile(
                  title: Text(row.name, overflow: TextOverflow.ellipsis),
                  subtitle: Text(formatBdt(context, row.annualIncome)),
                  trailing: Text(row.roi == null ? '—' : l.roiValue(row.roi!.toStringAsFixed(1))),
                  onTap: () => context.go(row.route),
                ),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.label, required this.value, this.sub, this.negative = false});
  final String label;
  final String value;
  final String? sub;
  final bool negative;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: theme.textTheme.bodySmall),
          Text(value,
              style: theme.textTheme.titleLarge
                  ?.copyWith(color: negative ? theme.colorScheme.error : null)),
          if (sub != null) Text(sub!, style: theme.textTheme.bodySmall),
        ]),
      ),
    );
  }
}

/// Grouped monthly bars (income, expense) on one axis. Tap a month for its
/// values; the table view lists every month for screen readers and for the
/// light-mode expense color, which sits just under 3:1 on paper.
class TrendChart extends StatefulWidget {
  const TrendChart({super.key, required this.points});
  final List<MonthlyPoint> points;

  @override
  State<TrendChart> createState() => _TrendChartState();
}

class _TrendChartState extends State<TrendChart> {
  int? _selected;
  bool _table = false;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final income = dark ? _incomeDark : _incomeLight;
    final expense = dark ? _expenseDark : _expenseLight;
    final locale = Localizations.localeOf(context).toString();
    final monthFmt = DateFormat.MMM(locale);
    final points = widget.points;
    final selected = _selected == null || _selected! >= points.length ? null : points[_selected!];

    Widget legend(Color c, String label) => Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label, style: theme.textTheme.bodySmall),
        ]);

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        legend(income, l.income),
        const SizedBox(width: 16),
        legend(expense, l.expense),
        const Spacer(),
        TextButton(
          onPressed: () => setState(() => _table = !_table),
          child: Text(_table ? l.chart : l.table),
        ),
      ]),
      if (_table)
        Table(
          columnWidths: const {0: FlexColumnWidth(), 1: FlexColumnWidth(), 2: FlexColumnWidth()},
          children: [
            TableRow(children: [
              Text(l.month, style: theme.textTheme.labelMedium),
              Text(l.income, style: theme.textTheme.labelMedium, textAlign: TextAlign.end),
              Text(l.expense, style: theme.textTheme.labelMedium, textAlign: TextAlign.end),
            ]),
            for (final p in points)
              TableRow(children: [
                Text(DateFormat.yMMM(locale).format(p.month)),
                Text(formatBdt(context, p.income), textAlign: TextAlign.end),
                Text(formatBdt(context, p.expense), textAlign: TextAlign.end),
              ]),
          ],
        )
      else ...[
        // Fixed height so tapping a month doesn't shift the chart.
        SizedBox(
          height: 36,
          child: selected == null
              ? null
              : Text(
                  '${DateFormat.yMMM(locale).format(selected.month)} · '
                  '${l.income} ${formatBdt(context, selected.income)} · '
                  '${l.expense} ${formatBdt(context, selected.expense)}',
                  style: theme.textTheme.bodySmall,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
        ),
        Semantics(
          label: l.chartLabel,
          child: LayoutBuilder(
            builder: (context, constraints) => GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTapDown: points.isEmpty
                  ? null
                  : (d) => setState(() => _selected = (d.localPosition.dx /
                          constraints.maxWidth *
                          points.length)
                      .floor()
                      .clamp(0, points.length - 1)),
              child: CustomPaint(
                size: Size(constraints.maxWidth, 160),
                painter: _BarsPainter(
                  points: points,
                  income: income,
                  expense: expense,
                  axis: theme.colorScheme.outlineVariant,
                  highlight: theme.colorScheme.onSurface.withValues(alpha: 0.06),
                  selected: _selected,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Row(children: [
          for (final (i, p) in points.indexed)
            Expanded(
              child: Text(
                i.isEven || points.length <= 6 ? monthFmt.format(p.month) : '',
                textAlign: TextAlign.center,
                style: theme.textTheme.labelSmall,
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.clip,
              ),
            ),
        ]),
      ],
    ]);
  }
}

class _BarsPainter extends CustomPainter {
  _BarsPainter({
    required this.points,
    required this.income,
    required this.expense,
    required this.axis,
    required this.highlight,
    required this.selected,
  });

  final List<MonthlyPoint> points;
  final Color income, expense, axis, highlight;
  final int? selected;

  @override
  void paint(Canvas canvas, Size size) {
    final baseline = size.height - 1;
    canvas.drawLine(Offset(0, baseline), Offset(size.width, baseline),
        Paint()
          ..color = axis
          ..strokeWidth = 1);
    if (points.isEmpty) return;
    final maxValue =
        math.max<num>(1, points.map((p) => math.max(p.income, p.expense)).reduce(math.max));
    final slot = size.width / points.length;
    const gap = 2.0; // surface gap between the paired bars
    final barW = math.max(2.0, (slot * 0.6 - gap) / 2);
    for (final (i, p) in points.indexed) {
      final x = i * slot + slot * 0.2;
      if (i == selected) {
        canvas.drawRect(Rect.fromLTWH(i * slot, 0, slot, baseline), Paint()..color = highlight);
      }
      void bar(double left, num value, Color color) {
        final h = value / maxValue * (baseline - 4);
        if (h <= 0) return;
        // Rounded data end, square at the baseline.
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTWH(left, baseline - h, barW, h),
            topLeft: const Radius.circular(4),
            topRight: const Radius.circular(4),
          ),
          Paint()..color = color,
        );
      }

      bar(x, p.income, income);
      bar(x + barW + gap, p.expense, expense);
    }
  }

  @override
  bool shouldRepaint(_BarsPainter old) =>
      old.points != points || old.selected != selected || old.income != income;
}
