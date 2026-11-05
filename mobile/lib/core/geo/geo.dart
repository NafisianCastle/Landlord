import 'dart:math' as math;

import 'package:latlong2/latlong.dart';

/// Port of the web app's lib/geo.ts. Boundaries are stored as GeoJSON
/// Polygons in [lng, lat] order with a closed ring.

Map<String, dynamic> pointsToPolygon(List<LatLng> points) {
  final ring = points.map((p) => [p.longitude, p.latitude]).toList();
  final first = ring.first;
  final last = ring.last;
  if (first[0] != last[0] || first[1] != last[1]) ring.add(first);
  return {
    'type': 'Polygon',
    'coordinates': [ring],
  };
}

/// Reads the outer ring of a stored GeoJSON polygon, without the closing point.
List<LatLng> polygonToPoints(Map<String, dynamic>? polygon) {
  if (polygon == null) return const [];
  final rings = polygon['coordinates'] as List?;
  if (rings == null || rings.isEmpty) return const [];
  final ring = (rings.first as List)
      .map((c) => LatLng(((c as List)[1] as num).toDouble(), (c[0] as num).toDouble()))
      .toList();
  if (ring.length > 1 && ring.first == ring.last) ring.removeLast();
  return ring;
}

LatLng polygonCentroid(List<LatLng> points) {
  final lat = points.fold<double>(0, (s, p) => s + p.latitude) / points.length;
  final lng = points.fold<double>(0, (s, p) => s + p.longitude) / points.length;
  return LatLng(lat, lng);
}

Uri googleMapsDirectionsUrl(LatLng destination) => Uri.parse(
    'https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}');

const _earthRadiusM = 6371000.0;

double haversineMeters(LatLng a, LatLng b) {
  double toRad(double d) => d * math.pi / 180;
  final dLat = toRad(b.latitude - a.latitude);
  final dLng = toRad(b.longitude - a.longitude);
  final h = math.pow(math.sin(dLat / 2), 2) +
      math.cos(toRad(a.latitude)) *
          math.cos(toRad(b.latitude)) *
          math.pow(math.sin(dLng / 2), 2);
  return 2 * _earthRadiusM * math.asin(math.sqrt(h));
}

/// Perimeter (meters) as if the ring were closed now.
double closedPerimeterMeters(List<LatLng> points) {
  if (points.length < 2) return 0;
  var total = haversineMeters(points.last, points.first);
  for (var i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

int _orientation(LatLng a, LatLng b, LatLng c) {
  final v = (b.longitude - a.longitude) * (c.latitude - a.latitude) -
      (b.latitude - a.latitude) * (c.longitude - a.longitude);
  if (v.abs() < 1e-12) return 0;
  return v > 0 ? 1 : -1;
}

bool _onSegment(LatLng a, LatLng b, LatLng p) =>
    math.min(a.longitude, b.longitude) <= p.longitude &&
    p.longitude <= math.max(a.longitude, b.longitude) &&
    math.min(a.latitude, b.latitude) <= p.latitude &&
    p.latitude <= math.max(a.latitude, b.latitude);

bool _segmentsIntersect(LatLng a1, LatLng a2, LatLng b1, LatLng b2) {
  final o1 = _orientation(a1, a2, b1);
  final o2 = _orientation(a1, a2, b2);
  final o3 = _orientation(b1, b2, a1);
  final o4 = _orientation(b1, b2, a2);
  if (o1 != o2 && o3 != o4) return true;
  if (o1 == 0 && _onSegment(a1, a2, b1)) return true;
  if (o2 == 0 && _onSegment(a1, a2, b2)) return true;
  if (o3 == 0 && _onSegment(b1, b2, a1)) return true;
  if (o4 == 0 && _onSegment(b1, b2, a2)) return true;
  return false;
}

/// True if the closed ring has no self-intersecting or overlapping edges.
/// Adjacent edges always share an endpoint, so only non-adjacent pairs count.
bool isSimplePolygon(List<LatLng> points) {
  final n = points.length;
  if (n < 3) return true;
  for (var i = 0; i < n; i++) {
    for (var j = i + 1; j < n; j++) {
      final adjacent = j == i + 1 || (i == 0 && j == n - 1);
      if (adjacent) continue;
      if (_segmentsIntersect(points[i], points[(i + 1) % n], points[j],
          points[(j + 1) % n])) {
        return false;
      }
    }
  }
  return true;
}

/// Approximate area (m²) via an equirectangular projection centered on the
/// ring's mean latitude — fine for plot-sized polygons. The stored area comes
/// from PostGIS ST_Area once the boundary is saved.
double polygonAreaSqMeters(List<LatLng> points) {
  if (points.length < 3) return 0;
  final meanLat =
      points.fold<double>(0, (s, p) => s + p.latitude) / points.length;
  const mPerDegLat = 111320.0;
  final mPerDegLng = 111320 * math.cos(meanLat * math.pi / 180);
  var area = 0.0;
  for (var i = 0; i < points.length; i++) {
    final a = points[i];
    final b = points[(i + 1) % points.length];
    area += (a.longitude * mPerDegLng) * (b.latitude * mPerDegLat) -
        (b.longitude * mPerDegLng) * (a.latitude * mPerDegLat);
  }
  return area.abs() / 2;
}

/// Mirrors lib/validation/geometry.ts validBoundaryPoints.
bool validBoundaryPoints(List<LatLng> points) =>
    points.length >= 3 &&
    points.length <= 2000 &&
    points.every((p) =>
        p.latitude.isFinite &&
        p.longitude.isFinite &&
        p.latitude.abs() <= 90 &&
        p.longitude.abs() <= 180);

/// Mirrors lib/apartmentLocation.ts and the apartments_location_valid check.
bool validApartmentLocation(LatLng point) =>
    point.latitude.isFinite &&
    point.longitude.isFinite &&
    point.latitude.abs() <= 90 &&
    point.longitude.abs() <= 180;
