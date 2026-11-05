import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/l10n.dart';
import '../../core/offline/tile_cache.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';

/// Default view when there's nothing to center on: Bangladesh.
const bangladeshCenter = LatLng(23.685, 90.3563);

final baseLayerProvider = NotifierProvider<_BaseLayer, BaseLayer>(_BaseLayer.new);

class _BaseLayer extends Notifier<BaseLayer> {
  @override
  BaseLayer build() => BaseLayer.satellite;
  void toggle() =>
      state = state == BaseLayer.satellite ? BaseLayer.streets : BaseLayer.satellite;
}

/// Map with the offline-capable tile layer and a satellite/streets toggle.
class BaseMap extends ConsumerWidget {
  const BaseMap({
    super.key,
    this.controller,
    this.initialCenter = bangladeshCenter,
    this.initialZoom = 7,
    this.initialFit,
    this.onTap,
    this.interactive = true,
    this.children = const [],
  });

  final MapController? controller;
  final LatLng initialCenter;
  final double initialZoom;
  final CameraFit? initialFit;
  final void Function(LatLng point)? onTap;
  final bool interactive;
  final List<Widget> children;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final layer = ref.watch(baseLayerProvider);
    final cache = ref.watch(tileCacheProvider);
    return Stack(
      children: [
        FlutterMap(
          mapController: controller,
          options: MapOptions(
            initialCenter: initialCenter,
            initialZoom: initialZoom,
            initialCameraFit: initialFit,
            maxZoom: layer.maxZoom.toDouble(),
            onTap: onTap == null ? null : (_, point) => onTap!(point),
            interactionOptions: InteractionOptions(
              flags: interactive ? InteractiveFlag.all & ~InteractiveFlag.rotate : InteractiveFlag.none,
            ),
          ),
          children: [
            TileLayer(
              key: ValueKey(layer),
              urlTemplate: layer.urlTemplate,
              userAgentPackageName: userAgent,
              maxNativeZoom: layer.maxZoom,
              tileProvider: CachedTileProvider(cache, layer),
            ),
            ...children,
            RichAttributionWidget(attributions: [
              TextSourceAttribution(
                  layer == BaseLayer.satellite ? 'Esri World Imagery' : 'OpenStreetMap contributors'),
            ]),
          ],
        ),
        if (interactive)
          Positioned(
            top: 8,
            right: 8,
            child: FilledButton.tonalIcon(
              onPressed: ref.read(baseLayerProvider.notifier).toggle,
              icon: const Icon(Icons.layers),
              label: Text(layer == BaseLayer.satellite ? context.l10n.streets : context.l10n.satellite),
            ),
          ),
      ],
    );
  }
}

PolygonLayer boundaryLayer(List<LatLng> points) => PolygonLayer(polygons: [
      Polygon(
        points: points,
        color: Brand.lime.withValues(alpha: 0.3),
        borderColor: Brand.lime,
        borderStrokeWidth: 3,
      ),
    ]);
