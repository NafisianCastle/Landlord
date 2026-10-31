import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/region.dart';
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
          final areaSqM = ((plots['total_area_sq_meters'] ?? 0) as num).toDouble();
          final areaUnit = ref.watch(regionProvider).areaUnit;
          void analytics() => context.go('/dashboard/analytics');
          return RefreshableList(children: [
            const BillAlerts(),
            _StatCard(
              icon: Icons.landscape,
              label: l.totalPlots,
              amount: (plots['plot_count'] ?? 0) as num,
              format: (n) => '${n.round()}',
              onTap: () => context.go('/plots'),
            ),
            _StatCard(
              icon: Icons.straighten,
              label: l.totalArea,
              amount: fromSqMeters(areaSqM, areaUnit),
              format: (n) => '${formatNumber(context, n)} ${areaUnitLabel(context, areaUnit)}',
              onTap: () => context.go('/plots'),
              sub: formatArea(context, areaSqM).sub,
            ),
            _StatCard(
              icon: Icons.payments_outlined,
              label: l.totalPurchasePrice,
              amount: (plots['total_purchase_price'] ?? 0) as num,
              format: (n) => formatMoney(context, n),
              onTap: analytics,
            ),
            _StatCard(
              icon: Icons.trending_up,
              label: l.totalCurrentValue,
              amount: (plots['total_current_value'] ?? 0) as num,
              format: (n) => formatMoney(context, n),
              onTap: analytics,
            ),
            _StatCard(
              icon: Icons.warning_amber,
              label: l.overdueRent,
              amount: (rent['overdue_amount'] ?? 0) as num,
              format: (n) => formatMoney(context, n),
              onTap: analytics,
              sub: '${rent['overdue_count'] ?? 0}',
              highlight: ((rent['overdue_count'] ?? 0) as num) > 0,
            ),
            _StatCard(
              icon: Icons.event,
              label: l.upcomingRent,
              amount: (rent['upcoming_count'] ?? 0) as num,
              format: (n) => '${n.round()}',
              onTap: analytics,
            ),
            _StatCard(
              icon: Icons.savings_outlined,
              label: l.receivedThisMonth,
              amount: (rent['received_this_month_amount'] ?? 0) as num,
              format: (n) => formatMoney(context, n),
              onTap: analytics,
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
    required this.amount,
    required this.format,
    required this.onTap,
    this.sub,
    this.highlight = false,
  });
  final IconData icon;
  final String label;
  final num amount;
  final String Function(num) format;
  final VoidCallback onTap;
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
          subtitle: (sub ?? '').isEmpty ? null : Text(sub!),
          // Counts up from 0 on first show; instant with reduced motion.
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: amount.toDouble()),
              duration: MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero
                  : const Duration(milliseconds: 600),
              curve: Curves.easeOutCubic,
              builder: (context, value, _) =>
                  Text(format(value), style: Theme.of(context).textTheme.titleMedium),
            ),
            const Icon(Icons.chevron_right),
          ]),
          onTap: onTap,
        ),
      ),
    );
  }
}
