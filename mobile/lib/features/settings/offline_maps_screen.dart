import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n.dart';
import '../../core/offline/tile_cache.dart';
import '../../core/providers.dart';
import '../common.dart';
import '../map/base_map.dart';

final _cacheSizeProvider =
    FutureProvider.autoDispose((ref) => ref.read(tileCacheProvider).sizeBytes());

/// Pan/zoom to an area, then save its tiles (current zoom up to 3 levels
/// deeper) for use without a connection.
class OfflineMapsScreen extends ConsumerStatefulWidget {
  const OfflineMapsScreen({super.key});

  @override
  ConsumerState<OfflineMapsScreen> createState() => _OfflineMapsScreenState();
}

class _OfflineMapsScreenState extends ConsumerState<OfflineMapsScreen> {
  final _map = MapController();
  (int, int)? _progress;
  bool _cancelled = false;

  Future<void> _download() async {
    final l = context.l10n;
    final camera = _map.camera;
    final layer = ref.read(baseLayerProvider);
    final minZoom = camera.zoom.floor();
    final maxZoom = math.min(minZoom + 3, layer.maxZoom);
    _cancelled = false;
    setState(() => _progress = (0, 0));
    try {
      final count = await ref.read(tileCacheProvider).downloadArea(
            layer,
            camera.visibleBounds,
            minZoom,
            maxZoom,
            onProgress: (done, total) {
              if (mounted) setState(() => _progress = (done, total));
            },
            cancelled: () => _cancelled,
          );
      if (mounted) showMessage(context, l.downloadDone(count));
    } on AreaTooLargeException catch (e) {
      if (mounted) showMessage(context, l.areaTooLarge(e.tileCount));
    } finally {
      ref.invalidate(_cacheSizeProvider);
      if (mounted) setState(() => _progress = null);
    }
  }

  @override
  void dispose() {
    _cancelled = true;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final size = ref.watch(_cacheSizeProvider).value ?? 0;
    final progress = _progress;
    return Scaffold(
      appBar: AppBar(title: Text(l.offlineMaps)),
      body: Column(
        children: [
          Expanded(child: BaseMap(controller: _map, initialZoom: 7)),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(l.offlineMapsHint),
                  const SizedBox(height: 8),
                  if (progress != null) ...[
                    LinearProgressIndicator(
                        value: progress.$2 == 0 ? null : progress.$1 / progress.$2),
                    Text(l.downloadProgress(progress.$1, progress.$2)),
                  ] else
                    FilledButton.icon(
                      onPressed: _download,
                      icon: const Icon(Icons.download),
                      label: Text(l.downloadVisibleArea),
                    ),
                  Row(children: [
                    Expanded(child: Text(l.cacheSize((size / 1024 / 1024).toStringAsFixed(1)))),
                    TextButton(
                      onPressed: progress != null
                          ? null
                          : () async {
                              await ref.read(tileCacheProvider).clear();
                              ref.invalidate(_cacheSizeProvider);
                            },
                      child: Text(l.clearCache),
                    ),
                  ]),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
