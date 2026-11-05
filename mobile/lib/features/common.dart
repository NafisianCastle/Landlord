import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/data/repository.dart';
import '../core/l10n.dart';
import '../core/providers.dart';
import '../core/region.dart';
import '../core/offline/sync.dart';

/// Money in the account's currency (see [RegionScope]), or [currency] for
/// amounts that are always in one (the app's own BDT billing). Whole
/// amounts drop the decimals, as the BDT-only formatting did.
String formatMoney(BuildContext context, Object? amount, {String? currency}) {
  final value = amount is num ? amount : num.tryParse('${amount ?? ''}');
  if (value == null) return '—';
  return NumberFormat.simpleCurrency(
    locale: Localizations.localeOf(context).toString(),
    name: currency ?? RegionScope.of(context).currency,
    decimalDigits: value % 1 == 0 ? 0 : null,
  ).format(value);
}

String areaUnitLabel(BuildContext context, String unit) =>
    areaUnitSymbols[unit] ?? context.l10n.areaUnit(unit);

/// [sqMeters] in [unit], e.g. "12.35 decimal" or "1,250 m²".
String formatAreaIn(BuildContext context, double sqMeters, String unit) =>
    '${formatNumber(context, fromSqMeters(sqMeters, unit))} ${areaUnitLabel(context, unit)}';

/// An area total in the account's units: the main figure, then the
/// country's other units joined with " · " (empty when there are none).
({String main, String sub}) formatArea(BuildContext context, double sqMeters) {
  final units = RegionScope.of(context).totalUnits;
  return (
    main: formatAreaIn(context, sqMeters, units.first),
    sub: units.skip(1).map((u) => formatAreaIn(context, sqMeters, u)).join(' · '),
  );
}

/// A distance in metres or feet, one decimal (GPS accuracy).
String formatLength(BuildContext context, double meters) => RegionScope.of(context).imperial
    ? '${(meters / 0.3048).toStringAsFixed(1)} ft'
    : '${meters.toStringAsFixed(1)} m';

String formatNumber(BuildContext context, num value, {int digits = 2}) =>
    NumberFormat.decimalPatternDigits(
            locale: Localizations.localeOf(context).toString(), decimalDigits: digits)
        .format(value);

/// Renders an AsyncValue with shared loading/error states: a skeleton while
/// the first load runs, cross-faded into the content. Reloads keep showing
/// the previous data instead of flashing the skeleton.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({super.key, required this.value, required this.builder});
  final AsyncValue<T> value;
  final Widget Function(T data) builder;

  @override
  Widget build(BuildContext context) {
    final Widget child;
    if (value.hasValue) {
      child = KeyedSubtree(key: const ValueKey('data'), child: builder(value.requireValue));
    } else if (value.hasError) {
      child = Center(
          key: const ValueKey('error'), child: Text(context.l10n.errorMessage('${value.error}')));
    } else {
      child = const SkeletonList(key: ValueKey('loading'));
    }
    return AnimatedSwitcher(
      duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 250),
      child: child,
    );
  }
}

/// Sweeps a highlight across [child]; static when the system asks for
/// reduced motion.
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child});
  final Widget child;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final base = scheme.surfaceContainerHighest;
    final highlight = scheme.surfaceContainerLow;
    return AnimatedBuilder(
      animation: _controller,
      child: widget.child,
      builder: (context, child) => ShaderMask(
        blendMode: BlendMode.srcATop,
        shaderCallback: (bounds) {
          final dx = (_controller.value * 3 - 1) * bounds.width;
          return LinearGradient(
            colors: [base, highlight, base],
            stops: const [0.35, 0.5, 0.65],
          ).createShader(Rect.fromLTWH(dx - bounds.width, 0, bounds.width * 2, bounds.height));
        },
        child: child,
      ),
    );
  }
}

/// Placeholder rows shown while a list or detail screen loads.
class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.rows = 6});
  final int rows;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.surfaceContainerHighest;
    Widget bar(double widthFactor, double height) => FractionallySizedBox(
          widthFactor: widthFactor,
          alignment: Alignment.centerLeft,
          child: Container(
            height: height,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
          ),
        );
    return Semantics(
      label: context.l10n.loading,
      child: Shimmer(
        child: ListView.builder(
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          itemCount: rows,
          itemBuilder: (context, _) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [bar(0.6, 14), const SizedBox(height: 8), bar(0.4, 12)],
                  ),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Hides the row at once and offers Undo; [commit] runs once the snackbar
/// goes away without Undo (timeout, another message, leaving the screen).
/// Deletes go through the repository, so they still queue while offline.
Future<void> deleteWithUndo(
    BuildContext context, WidgetRef ref, String id, Future<void> Function() commit) async {
  final l = context.l10n;
  final messenger = ScaffoldMessenger.of(context);
  final hidden = ref.read(hiddenRowsProvider.notifier);
  HapticFeedback.mediumImpact();
  hidden.hide(id);
  messenger.hideCurrentSnackBar();
  final reason = await messenger
      .showSnackBar(SnackBar(
        content: Text(l.deleted),
        // Snackbars with an action stay up by default; the delete must still
        // commit when nobody taps Undo. Same 5 s window as the web.
        persist: false,
        duration: const Duration(seconds: 5),
        action: SnackBarAction(label: l.undo, onPressed: () {}),
      ))
      .closed;
  if (reason == SnackBarClosedReason.action) {
    hidden.show(id);
    return;
  }
  try {
    await commit();
  } catch (e) {
    hidden.show(id);
    messenger.showSnackBar(SnackBar(content: Text(l.errorMessage('$e'))));
  }
}

/// Swipe left to delete with Undo (see [deleteWithUndo]).
class SwipeToDelete extends ConsumerWidget {
  const SwipeToDelete({super.key, required this.id, required this.onDelete, required this.child});
  final String id;
  final Future<void> Function() onDelete;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    return Dismissible(
      key: ValueKey('swipe-$id'),
      direction: DismissDirection.endToStart,
      background: Container(
        color: scheme.errorContainer,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Icon(Icons.delete_outline, color: scheme.onErrorContainer),
      ),
      onDismissed: (_) => deleteWithUndo(context, ref, id, onDelete),
      child: child,
    );
  }
}

Future<bool> confirmDelete(BuildContext context) async {
  final l = context.l10n;
  return await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          content: Text(l.confirmDelete),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.delete)),
          ],
        ),
      ) ??
      false;
}

void showMessage(BuildContext context, String message) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.trailing});
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 24, bottom: 8),
        child: Row(
          children: [
            Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
            ?trailing,
          ],
        ),
      );
}

/// Read-only text field that opens a date picker and stores YYYY-MM-DD.
class DateField extends StatelessWidget {
  const DateField({super.key, required this.controller, required this.label});
  final TextEditingController controller;
  final String label;

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        readOnly: true,
        decoration: InputDecoration(labelText: label, suffixIcon: const Icon(Icons.calendar_today)),
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: DateTime.tryParse(controller.text) ?? DateTime.now(),
            firstDate: DateTime(1900),
            lastDate: DateTime(2100),
          );
          if (picked != null) controller.text = picked.toIso8601String().substring(0, 10);
        },
      );
}

/// Runs an online-only operation (bills, sharing) and reports the outcome
/// with the web's wording. Returns true on success.
Future<bool> runOnlineAction(BuildContext context, Future<void> Function() action,
    {String? success}) async {
  final l = context.l10n;
  try {
    await action();
    if (success != null && context.mounted) showMessage(context, success);
    return true;
  } on ActionException catch (e) {
    if (context.mounted) showMessage(context, l.actionError(e.error));
  } catch (e) {
    if (context.mounted) {
      showMessage(context, isOfflineError(e) ? l.needsConnection : l.errorMessage('$e'));
    }
  }
  return false;
}
