import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:path/path.dart' as p;

/// Base layers. Satellite matches the web app (Esri World Imagery). The web
/// streets layer is an OpenFreeMap vector style, which flutter_map can't
/// render, so streets use OSM raster tiles.
enum BaseLayer {
  satellite(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      19),
  streets('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 19);

  const BaseLayer(this.urlTemplate, this.maxZoom);
  final String urlTemplate;
  final int maxZoom;

  String url(int z, int x, int y) => urlTemplate
      .replaceAll('{z}', '$z')
      .replaceAll('{x}', '$x')
      .replaceAll('{y}', '$y');
}

const userAgent = 'io.landlord.app';

/// Same cap as the web's lib/offline/tileDownload.ts.
const maxDownloadTiles = 3000;
const _concurrency = 6;

typedef TileCoord = ({int z, int x, int y});

int lngToTileX(double lng, int z) => ((lng + 180) / 360 * (1 << z)).floor();

int latToTileY(double lat, int z) {
  final rad = lat * math.pi / 180;
  return ((1 - math.log(math.tan(rad) + 1 / math.cos(rad)) / math.pi) /
          2 *
          (1 << z))
      .floor();
}

List<TileCoord> tilesForBounds(LatLngBounds bounds, int minZoom, int maxZoom) => [
      for (var z = minZoom; z <= maxZoom; z++)
        for (var x = lngToTileX(bounds.west, z); x <= lngToTileX(bounds.east, z); x++)
          // Latitude decreases as tile y increases, so north gives the min y.
          for (var y = latToTileY(bounds.north, z); y <= latToTileY(bounds.south, z); y++)
            (z: z, x: x, y: y)
    ];

/// File-backed tile store. Tiles fetched while browsing are kept too, so
/// anywhere you've looked at stays available offline.
class TileCache {
  TileCache(this.root, {http.Client? client}) : _client = client ?? http.Client();

  final Directory root;
  final http.Client _client;

  File fileFor(BaseLayer layer, TileCoord t) =>
      File(p.join(root.path, layer.name, '${t.z}', '${t.x}', '${t.y}'));

  Future<Uint8List> load(BaseLayer layer, TileCoord t) async {
    final file = fileFor(layer, t);
    if (await file.exists()) return file.readAsBytes();
    final res = await _client.get(Uri.parse(layer.url(t.z, t.x, t.y)),
        headers: {'User-Agent': userAgent});
    if (res.statusCode != 200) {
      throw HttpException('Tile ${res.statusCode}', uri: res.request?.url);
    }
    await file.parent.create(recursive: true);
    // Write-then-rename so a concurrent reader never sees a partial tile.
    final tmp = File('${file.path}.${DateTime.now().microsecondsSinceEpoch}');
    await tmp.writeAsBytes(res.bodyBytes);
    await tmp.rename(file.path);
    return res.bodyBytes;
  }

  /// Downloads every tile in [bounds] between the zooms. Throws
  /// [AreaTooLargeException] past [maxDownloadTiles].
  Future<int> downloadArea(
    BaseLayer layer,
    LatLngBounds bounds,
    int minZoom,
    int maxZoom, {
    void Function(int done, int total)? onProgress,
    bool Function()? cancelled,
  }) async {
    final tiles = tilesForBounds(bounds, minZoom, maxZoom);
    if (tiles.length > maxDownloadTiles) throw AreaTooLargeException(tiles.length);
    var next = 0, done = 0;
    Future<void> worker() async {
      while (next < tiles.length && !(cancelled?.call() ?? false)) {
        final tile = tiles[next++];
        try {
          await load(layer, tile);
        } catch (_) {
          // One missing tile shouldn't abort the area; it'll show blank.
        }
        done++;
        onProgress?.call(done, tiles.length);
      }
    }

    await Future.wait(List.generate(_concurrency, (_) => worker()));
    return done;
  }

  Future<int> sizeBytes() async {
    if (!await root.exists()) return 0;
    var total = 0;
    await for (final e in root.list(recursive: true)) {
      if (e is File) total += await e.length();
    }
    return total;
  }

  Future<void> clear() async {
    if (await root.exists()) await root.delete(recursive: true);
  }
}

class AreaTooLargeException implements Exception {
  const AreaTooLargeException(this.tileCount);
  final int tileCount;
}

/// flutter_map tile provider that reads through [TileCache].
class CachedTileProvider extends TileProvider {
  CachedTileProvider(this.cache, this.layer);
  final TileCache cache;
  final BaseLayer layer;

  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) =>
      _CachedTileImage(cache, layer, (z: coordinates.z, x: coordinates.x, y: coordinates.y));
}

@immutable
class _CachedTileImage extends ImageProvider<_CachedTileImage> {
  const _CachedTileImage(this.cache, this.layer, this.tile);
  final TileCache cache;
  final BaseLayer layer;
  final TileCoord tile;

  @override
  Future<_CachedTileImage> obtainKey(ImageConfiguration configuration) =>
      SynchronousFuture(this);

  @override
  ImageStreamCompleter loadImage(_CachedTileImage key, ImageDecoderCallback decode) =>
      OneFrameImageStreamCompleter(_load(decode));

  Future<ImageInfo> _load(ImageDecoderCallback decode) async {
    final bytes = await cache.load(layer, tile);
    final codec = await decode(await ui.ImmutableBuffer.fromUint8List(bytes));
    final frame = await codec.getNextFrame();
    return ImageInfo(image: frame.image);
  }

  @override
  bool operator ==(Object other) =>
      other is _CachedTileImage && other.layer == layer && other.tile == tile;

  @override
  int get hashCode => Object.hash(layer, tile);
}

LatLngBounds boundsAround(LatLng center, double meters) {
  final dLat = meters / 111320;
  final dLng = meters / (111320 * math.cos(center.latitude * math.pi / 180));
  return LatLngBounds(LatLng(center.latitude - dLat, center.longitude - dLng),
      LatLng(center.latitude + dLat, center.longitude + dLng));
}
