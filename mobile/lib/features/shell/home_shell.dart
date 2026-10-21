import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n.dart';
import '../../core/providers.dart';

final _offlineProvider = NotifierProvider<_Offline, bool>(_Offline.new);

class _Offline extends Notifier<bool> {
  @override
  bool build() => false;
  void set(bool value) => state = value;
}

/// Bottom-navigation shell. Also owns background sync: refresh on start and
/// whenever connectivity returns, and surface server rejections.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.shell});
  final StatefulNavigationShell shell;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  final _subs = <StreamSubscription<Object>>[];

  @override
  void initState() {
    super.initState();
    _refresh();
    _subs.add(Connectivity().onConnectivityChanged.listen((results) {
      if (!results.contains(ConnectivityResult.none)) _refresh();
    }));
    _subs.add(ref.read(repositoryProvider).rejections.listen((message) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.l10n.syncRejected(message))));
    }));
  }

  Future<void> _refresh() async {
    try {
      final result = await ref.read(repositoryProvider).refresh();
      ref.read(_offlineProvider.notifier).set(result.offline);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.l10n.errorMessage('$e'))));
    }
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final offline = ref.watch(_offlineProvider);
    final pending = ref.watch(pendingCountProvider).value ?? 0;
    return Scaffold(
      body: Column(
        children: [
          if (offline || pending > 0)
            MaterialBanner(
              content: Text([
                if (offline) l.offlineBanner,
                if (pending > 0) l.pendingChanges(pending),
              ].join(' · ')),
              leading: const Icon(Icons.cloud_off),
              actions: [TextButton(onPressed: _refresh, child: Text(l.retry))],
            ),
          Expanded(child: widget.shell),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: widget.shell.currentIndex,
        onDestinationSelected: (i) =>
            widget.shell.goBranch(i, initialLocation: i == widget.shell.currentIndex),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.dashboard_outlined), label: l.navDashboard),
          NavigationDestination(icon: const Icon(Icons.landscape_outlined), label: l.navPlots),
          NavigationDestination(icon: const Icon(Icons.apartment_outlined), label: l.navApartments),
          NavigationDestination(icon: const Icon(Icons.settings_outlined), label: l.navSettings),
        ],
      ),
    );
  }
}

/// Pull-to-refresh wrapper used by the list screens.
class RefreshableList extends ConsumerWidget {
  const RefreshableList({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context, WidgetRef ref) => RefreshIndicator(
        onRefresh: () async {
          final result = await ref.read(repositoryProvider).refresh();
          ref.read(_offlineProvider.notifier).set(result.offline);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: children,
        ),
      );
}
