import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:landlord_mobile/core/offline/tile_cache.dart';
import 'package:latlong2/latlong.dart';

void main() {
  test('tile math matches lib/offline/tileDownload.ts', () {
    expect(lngToTileX(90.4, 10), 769);
    expect(latToTileY(23.8, 10), 442);
    final bounds = LatLngBounds(const LatLng(23.79, 90.39), const LatLng(23.81, 90.41));
    final tiles = tilesForBounds(bounds, 14, 15);
    expect(tiles.every((t) => t.z == 14 || t.z == 15), isTrue);
    expect(tiles.length, lessThan(30));
  });

  test('downloads once, then serves from disk', () async {
    final dir = await Directory.systemTemp.createTemp('tiles');
    var requests = 0;
    final cache = TileCache(dir, client: MockClient((req) async {
      requests++;
      return http.Response.bytes(Uint8List.fromList([1, 2, 3]), 200);
    }));
    final bounds = boundsAround(const LatLng(23.8, 90.4), 100);
    final count = await cache.downloadArea(BaseLayer.satellite, bounds, 16, 16);
    expect(count, greaterThan(0));
    expect(requests, count);

    await cache.load(BaseLayer.satellite, tilesForBounds(bounds, 16, 16).first);
    expect(requests, count);
    expect(await cache.sizeBytes(), count * 3);

    await cache.clear();
    expect(await cache.sizeBytes(), 0);
  });

  test('refuses areas over the tile cap', () {
    final cache = TileCache(Directory.systemTemp);
    final huge = LatLngBounds(const LatLng(20, 88), const LatLng(26, 92));
    expect(cache.downloadArea(BaseLayer.satellite, huge, 10, 16),
        throwsA(isA<AreaTooLargeException>()));
  });
}
