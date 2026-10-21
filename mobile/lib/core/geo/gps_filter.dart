import 'dart:math' as math;

import 'package:latlong2/latlong.dart';

import 'geo.dart';

/// Phone GPS is the reason the web app dropped boundary walking: single fixes
/// wander by 5–15 m. Natively we get a continuous high-accuracy stream with
/// a reported accuracy per fix, so we can (1) discard poor fixes, (2) average
/// many fixes while the user stands on a corner, and (3) thin out a traced
/// path before saving.

class GpsFix {
  const GpsFix(this.point, this.accuracyM, this.time);
  final LatLng point;
  final double accuracyM;
  final DateTime time;
}

/// Fixes at or under this reported accuracy (meters) are kept.
const defaultMaxAccuracyM = 10.0;

Iterable<GpsFix> goodFixes(Iterable<GpsFix> fixes,
        {double maxAccuracyM = defaultMaxAccuracyM}) =>
    fixes.where((f) => f.accuracyM > 0 && f.accuracyM <= maxAccuracyM);

/// Inverse-variance weighted mean of [fixes]: a 3 m fix counts ~11x more
/// than a 10 m one. Returns null when there is nothing to average.
LatLng? averageFixes(Iterable<GpsFix> fixes) {
  var wSum = 0.0, lat = 0.0, lng = 0.0;
  for (final f in fixes) {
    final w = 1 / (f.accuracyM * f.accuracyM);
    wSum += w;
    lat += f.point.latitude * w;
    lng += f.point.longitude * w;
  }
  if (wSum == 0) return null;
  return LatLng(lat / wSum, lng / wSum);
}

/// Expected accuracy (meters) of [averageFixes] over these fixes, assuming
/// independent errors: 1/sqrt(sum(1/σ²)).
double? averagedAccuracyM(Iterable<GpsFix> fixes) {
  final inv = fixes.fold<double>(0, (s, f) => s + 1 / (f.accuracyM * f.accuracyM));
  return inv == 0 ? null : 1 / math.sqrt(inv);
}

/// Whether a traced point should be appended: far enough from the last one
/// to be real movement rather than jitter.
bool shouldAppendTracePoint(List<LatLng> trace, GpsFix fix,
    {double minStepM = 2}) {
  if (trace.isEmpty) return true;
  return haversineMeters(trace.last, fix.point) >= math.max(minStepM, fix.accuracyM / 2);
}

/// Douglas–Peucker simplification with a tolerance in meters, using a local
/// equirectangular projection (plot-sized areas only).
List<LatLng> simplifyPath(List<LatLng> points, {double toleranceM = 1.5}) {
  if (points.length < 3) return List.of(points);
  final lat0 = points.first.latitude * math.pi / 180;
  const mPerDeg = 111320.0;
  math.Point<double> project(LatLng p) => math.Point(
      p.longitude * mPerDeg * math.cos(lat0), p.latitude * mPerDeg);
  final projected = points.map(project).toList();
  final keep = List<bool>.filled(points.length, false)
    ..[0] = true
    ..[points.length - 1] = true;

  void dp(int start, int end) {
    if (end <= start + 1) return;
    final a = projected[start], b = projected[end];
    var maxDist = -1.0;
    var index = start;
    for (var i = start + 1; i < end; i++) {
      final d = _perpendicularDistance(projected[i], a, b);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > toleranceM) {
      keep[index] = true;
      dp(start, index);
      dp(index, end);
    }
  }

  dp(0, points.length - 1);
  return [
    for (var i = 0; i < points.length; i++)
      if (keep[i]) points[i]
  ];
}

double _perpendicularDistance(
    math.Point<double> p, math.Point<double> a, math.Point<double> b) {
  final dx = b.x - a.x, dy = b.y - a.y;
  final len2 = dx * dx + dy * dy;
  if (len2 == 0) return p.distanceTo(a);
  final t = (((p.x - a.x) * dx + (p.y - a.y) * dy) / len2).clamp(0.0, 1.0);
  return p.distanceTo(math.Point(a.x + t * dx, a.y + t * dy));
}
