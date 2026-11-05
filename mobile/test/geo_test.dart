import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/geo/geo.dart';
import 'package:landlord_mobile/core/geo/gps_filter.dart';
import 'package:landlord_mobile/core/geo/units.dart';
import 'package:latlong2/latlong.dart';

// ~10 m x ~10 m square near Dhaka.
const _d = 0.00009;
final square = [
  const LatLng(23.8, 90.4),
  const LatLng(23.8, 90.4 + _d),
  const LatLng(23.8 + _d, 90.4 + _d),
  const LatLng(23.8 + _d, 90.4),
];

void main() {
  group('geo (port of lib/geo.ts)', () {
    test('pointsToPolygon closes the ring in [lng, lat] order', () {
      final poly = pointsToPolygon(square);
      final ring = (poly['coordinates'] as List).first as List;
      expect(ring.length, 5);
      expect(ring.first, [90.4, 23.8]);
      expect(ring.last, ring.first);
      expect(polygonToPoints(poly), square);
    });

    test('area of a ~10 m square is ~100 m²', () {
      expect(polygonAreaSqMeters(square), closeTo(92, 5));
    });

    test('isSimplePolygon rejects a bow-tie', () {
      expect(isSimplePolygon(square), isTrue);
      final bowTie = [square[0], square[2], square[1], square[3]];
      expect(isSimplePolygon(bowTie), isFalse);
    });

    test('validBoundaryPoints bounds', () {
      expect(validBoundaryPoints(square.sublist(0, 2)), isFalse);
      expect(validBoundaryPoints([...square.sublist(0, 2), const LatLng(91, 0)]),
          isFalse);
      expect(validBoundaryPoints(square), isTrue);
    });
  });

  group('gps filter', () {
    final t = DateTime(2026);
    test('drops poor fixes and weights the average by accuracy', () {
      final fixes = [
        GpsFix(const LatLng(23.8, 90.4), 2, t),
        GpsFix(const LatLng(23.8002, 90.4002), 8, t),
        GpsFix(const LatLng(24, 91), 50, t),
      ];
      final good = goodFixes(fixes).toList();
      expect(good.length, 2);
      final avg = averageFixes(good)!;
      // The 2 m fix carries 16x the weight of the 8 m one.
      expect(haversineMeters(avg, fixes[0].point), lessThan(2));
      expect(averagedAccuracyM(good), lessThan(2));
      expect(averageFixes(const []), isNull);
    });

    test('trace ignores jitter under the step size', () {
      final trace = [const LatLng(23.8, 90.4)];
      expect(
          shouldAppendTracePoint(
              trace, GpsFix(const LatLng(23.800005, 90.4), 3, t)),
          isFalse);
      expect(
          shouldAppendTracePoint(
              trace, GpsFix(const LatLng(23.8001, 90.4), 3, t)),
          isTrue);
    });

    test('simplifyPath removes collinear points', () {
      final line = [
        for (var i = 0; i <= 10; i++) LatLng(23.8, 90.4 + i * 0.00001),
        const LatLng(23.8001, 90.4001),
      ];
      final simplified = simplifyPath(line);
      expect(simplified.length, 3);
      expect(simplified.first, line.first);
      expect(simplified.last, line.last);
    });
  });

  test('area conversions match lib/units.ts', () {
    const a = AreaConversions(40.4686 * 33);
    expect(a.decimal, closeTo(33, 1e-9));
    expect(a.bigha, closeTo(1, 1e-9));
    expect(a.katha, closeTo(20, 1e-9));
  });
}
