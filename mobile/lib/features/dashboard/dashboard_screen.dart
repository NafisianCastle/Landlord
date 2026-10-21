import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/geo/units.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../bills/bill_screens.dart';
import '../common.dart';
import '../shell/home_shell.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.navDashboard), actions: [
        IconButton(
          tooltip: l.analytics,
          icon: const Icon(Icons.insights_outlined),
          onPressed: () => context.go('/dashboard/analytics'),
        ),
      ]),
      body: AsyncBody(
        value: ref.watch(statsProvider),
        builder: (stats) {
          final plots = stats.plots ?? const {};
          final rent = stats.rent ?? const {};
          final area = AreaConversions(((plots['total_area_sq_meters'] ?? 0) as num).toDouble());
          return RefreshableList(children: [
            const BillAlerts(),
            _StatCard(
              icon: Icons.landscape,
              label: l.totalPlots,
              value: '${plots['plot_count'] ?? 0}',
            ),
            _StatCard(
              icon: Icons.straighten,
              label: l.totalArea,
              value: l.decimalValue(formatNumber(context, area.decimal)),
              sub: l.areaSub(formatNumber(context, area.bigha), formatNumber(context, area.acre)),
            ),
            _StatCard(
              icon: Icons.payments_outlined,
              label: l.totalPurchasePrice,
              value: formatBdt(context, plots['total_purchase_price'] ?? 0),
            ),
            _StatCard(
              icon: Icons.trending_up,
              label: l.totalCurrentValue,
              value: formatBdt(context, plots['total_current_value'] ?? 0),
            ),
            _StatCard(
              icon: Icons.warning_amber,
              label: l.overdueRent,
              value: formatBdt(context, rent['overdue_amount'] ?? 0),
              sub: '${rent['overdue_count'] ?? 0}',
              highlight: ((rent['overdue_count'] ?? 0) as num) > 0,
            ),
            _StatCard(
              icon: Icons.event,
              label: l.upcomingRent,
              value: '${rent['upcoming_count'] ?? 0}',
            ),
            _StatCard(
              icon: Icons.savings_outlined,
              label: l.receivedThisMonth,
              value: formatBdt(context, rent['received_this_month_amount'] ?? 0),
            ),
            Card(
              child: ListTile(
                leading: const Icon(Icons.insights_outlined),
                title: Text(l.analytics),
                subtitle: Text(l.analyticsHint),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/dashboard/analytics'),
              ),
            ),
          ]);
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    this.sub,
    this.highlight = false,
  });
  final IconData icon;
  final String label;
  final String value;
  final String? sub;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        color: highlight ? scheme.errorContainer : null,
        child: ListTile(
          leading: Icon(icon, color: scheme.primary),
          title: Text(label),
          subtitle: sub == null ? null : Text(sub!),
          trailing: Text(value, style: Theme.of(context).textTheme.titleMedium),
        ),
      ),
    );
  }
}
