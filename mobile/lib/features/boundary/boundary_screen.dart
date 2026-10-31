import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/data/property_kind.dart';
import '../../core/geo/geo.dart';
import '../../core/geo/gps_filter.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../common.dart';
import '../map/base_map.dart';

/// Fixes averaged per "Mark corner" press. At ~1 fix/s that's a few seconds
/// of standing still — enough to cut a 5–8 m single-fix error to ~2–3 m.
const _cornerSamples = 8;

/// Capture a plot boundary by walking it with GPS (corner averaging and/or
/// continuous tracing, which keeps running with the screen off via a
/// foreground service / iOS background location) or by tapping the map.
class BoundaryScreen extends ConsumerStatefulWidget {
  const BoundaryScreen({super.key, required this.plotId});
  final String plotId;

  @override
  ConsumerState<BoundaryScreen> createState() => _BoundaryScreenState();
}

class _BoundaryScreenState extends ConsumerState<BoundaryScreen> {
  final _map = MapController();
  final _points = <LatLng>[];
  StreamSubscription<Position>? _positions;
  GpsFix? _lastFix;
  bool _tracing = false;
  bool _traced = false;
  List<GpsFix>? _cornerFixes;
  bool _centeredOnUser = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final row = await ref.read(repositoryProvider).property(PropertyKind.plot, widget.plotId);
    _points.addAll(polygonToPoints(row?['boundary_geojson'] as Map<String, dynamic>?));
    if (!mounted) return;
    setState(() => _loaded = true);
    // The map controller is only usable once the map has been laid out.
    await WidgetsBinding.instance.endOfFrame;
    if (mounted) await _startGps();
  }

  Future<void> _startGps() async {
    final l = context.l10n;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever ||
        !await Geolocator.isLocationServiceEnabled()) {
      if (mounted) showMessage(context, l.locationPermissionDenied);
      return;
    }
    final LocationSettings settings = Platform.isAndroid
        ? AndroidSettings(
            accuracy: LocationAccuracy.best,
            intervalDuration: const Duration(seconds: 1),
            foregroundNotificationConfig: ForegroundNotificationConfig(
              notificationTitle: l.trackingNotificationTitle,
              notificationText: l.trackingNotificationText,
              enableWakeLock: true,
            ),
          )
        : AppleSettings(
            accuracy: LocationAccuracy.bestForNavigation,
            activityType: ActivityType.fitness,
            allowBackgroundLocationUpdates: true,
            showBackgroundLocationIndicator: true,
          );
    _positions = Geolocator.getPositionStream(locationSettings: settings).listen(_onPosition);
  }

  void _onPosition(Position p) {
    final fix = GpsFix(LatLng(p.latitude, p.longitude), p.accuracy, p.timestamp);
    setState(() {
      _lastFix = fix;
      if (!_centeredOnUser && _points.isEmpty) {
        _centeredOnUser = true;
        _map.move(fix.point, 18);
      }
      if (goodFixes([fix]).isEmpty) return;
      final corner = _cornerFixes;
      if (corner != null) {
        corner.add(fix);
        if (corner.length >= _cornerSamples) _finishCorner();
      } else if (_tracing && shouldAppendTracePoint(_points, fix)) {
        _points.add(fix.point);
        _traced = true;
      }
    });
  }

  void _finishCorner() {
    final fixes = _cornerFixes!;
    _cornerFixes = null;
    final point = averageFixes(fixes);
    if (point == null) return;
    _points.add(point);
    showMessage(
        context, context.l10n.cornerAdded(formatLength(context, averagedAccuracyM(fixes)!)));
  }

  Future<void> _save() async {
    final l = context.l10n;
    // Tracing produces many near-collinear points; thin them out first.
    final points = _traced ? simplifyPath(_points) : List.of(_points);
    if (points.length < 3) return showMessage(context, l.needThreePoints);
    if (!validBoundaryPoints(points) || !isSimplePolygon(points)) {
      return showMessage(context, l.invalidPolygon);
    }
    await ref.read(repositoryProvider).saveBoundary(widget.plotId, points);
    if (mounted) context.go('/plots/${widget.plotId}');
  }

  @override
  void dispose() {
    _positions?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final fix = _lastFix;
    final weak = fix != null && goodFixes([fix]).isEmpty;
    final areaSqM = polygonAreaSqMeters(_points);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.boundary),
        actions: [TextButton(onPressed: _save, child: Text(l.save))],
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  child: BaseMap(
                    controller: _map,
                    initialFit: _points.length >= 3
                        ? CameraFit.coordinates(
                            coordinates: _points, padding: const EdgeInsets.all(48))
                        : null,
                    onTap: (p) => setState(() => _points.add(p)),
                    children: [
                      if (_points.length >= 3) boundaryLayer(_points),
                      if (_points.length == 2)
                        PolylineLayer(polylines: [
                          Polyline(points: _points, color: Brand.lime, strokeWidth: 3),
                        ]),
                      if (fix != null)
                        CircleLayer(circles: [
                          CircleMarker(
                            point: fix.point,
                            radius: fix.accuracyM,
                            useRadiusInMeter: true,
                            color: Colors.blue.withValues(alpha: 0.15),
                            borderColor: Colors.blue,
                            borderStrokeWidth: 1,
                          ),
                          CircleMarker(point: fix.point, radius: 6, color: Colors.blue),
                        ]),
                      MarkerLayer(markers: [
                        for (final (i, p) in _points.indexed)
                          Marker(
                            point: p,
                            width: 28,
                            height: 28,
                            child: GestureDetector(
                              // Tap a vertex to remove it.
                              onTap: () => setState(() => _points.removeAt(i)),
                              child: const Icon(Icons.circle, color: Brand.lime, size: 14),
                            ),
                          ),
                      ]),
                    ],
                  ),
                ),
                _Controls(
                  status: fix == null
                      ? l.waitingForGps
                      : weak
                          ? l.gpsTooWeak
                          : l.gpsAccuracy(formatLength(context, fix.accuracyM)),
                  weak: weak || fix == null,
                  summary: l.pointsAndArea(_points.length, formatArea(context, areaSqM).main),
                  help: l.boundaryHelp,
                  marking: _cornerFixes == null
                      ? null
                      : l.markingCorner(_cornerFixes!.length),
                  tracing: _tracing,
                  onTracing: (v) => setState(() => _tracing = v),
                  onMarkCorner: fix == null || _cornerFixes != null
                      ? null
                      : () => setState(() => _cornerFixes = []),
                  onUndo: _points.isEmpty ? null : () => setState(_points.removeLast),
                  onClear: _points.isEmpty
                      ? null
                      : () => setState(() {
                            _points.clear();
                            _traced = false;
                          }),
                ),
              ],
            ),
    );
  }
}

class _Controls extends StatelessWidget {
  const _Controls({
    required this.status,
    required this.weak,
    required this.summary,
    required this.help,
    required this.marking,
    required this.tracing,
    required this.onTracing,
    required this.onMarkCorner,
    required this.onUndo,
    required this.onClear,
  });

  final String status;
  final bool weak;
  final String summary;
  final String help;
  final String? marking;
  final bool tracing;
  final ValueChanged<bool> onTracing;
  final VoidCallback? onMarkCorner;
  final VoidCallback? onUndo;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final scheme = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(children: [
              Icon(Icons.gps_fixed, color: weak ? scheme.error : scheme.primary, size: 18),
              const SizedBox(width: 6),
              Expanded(child: Text(status)),
              Text(summary),
            ]),
            Text(help, style: Theme.of(context).textTheme.bodySmall),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l.autoTrace),
              value: tracing,
              onChanged: onTracing,
            ),
            FilledButton.icon(
              onPressed: onMarkCorner,
              icon: const Icon(Icons.add_location_alt),
              label: Text(marking ?? l.markCorner),
            ),
            Row(children: [
              Expanded(
                child: TextButton.icon(
                    onPressed: onUndo, icon: const Icon(Icons.undo), label: Text(l.undo)),
              ),
              Expanded(
                child: TextButton.icon(
                    onPressed: onClear, icon: const Icon(Icons.clear), label: Text(l.clear)),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
