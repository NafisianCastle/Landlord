import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

/// Port of the web app's lib/geocode.ts: free, keyless place search via
/// Photon (komoot, OSM-based). https://photon.komoot.io
class GeocodeResult {
  const GeocodeResult(this.label, this.center);
  final String label;
  final LatLng center;
}

Future<List<GeocodeResult>> searchPlaces(String query, {http.Client? client}) async {
  final trimmed = query.trim();
  if (trimmed.length < 3) return const [];
  final uri = Uri.https('photon.komoot.io', '/api/', {'q': trimmed, 'limit': '5'});
  final res = await (client ?? http.Client()).get(uri);
  if (res.statusCode != 200) throw Exception('Search failed');
  final features = (jsonDecode(res.body) as Map<String, dynamic>)['features'] as List? ?? [];
  return [
    for (final f in features.cast<Map<String, dynamic>>())
      if ((f['geometry'] as Map?)?['type'] == 'Point')
        GeocodeResult(
          [
            f['properties']?['name'],
            f['properties']?['city'] ?? f['properties']?['county'],
            f['properties']?['state'],
            f['properties']?['country'],
          ].whereType<String>().where((s) => s.isNotEmpty).join(', '),
          LatLng(
            ((f['geometry']['coordinates'] as List)[1] as num).toDouble(),
            ((f['geometry']['coordinates'] as List)[0] as num).toDouble(),
          ),
        ),
  ];
}
