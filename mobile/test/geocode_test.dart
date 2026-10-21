import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:landlord_mobile/core/geo/geo.dart';
import 'package:landlord_mobile/core/geo/geocode.dart';
import 'package:latlong2/latlong.dart';

void main() {
  test('Photon results become labelled points (lib/geocode.ts)', () async {
    late Uri requested;
    final client = MockClient((req) async {
      requested = req.url;
      return http.Response(
          jsonEncode({
            'features': [
              {
                'geometry': {'type': 'Point', 'coordinates': [90.4125, 23.8103]},
                'properties': {'name': 'Gulshan', 'city': 'Dhaka', 'country': 'Bangladesh'},
              },
              {'geometry': {'type': 'LineString', 'coordinates': []}},
            ],
          }),
          200);
    });
    final results = await searchPlaces(' Gulshan ', client: client);
    expect(requested.queryParameters, {'q': 'Gulshan', 'limit': '5'});
    expect(results.single.label, 'Gulshan, Dhaka, Bangladesh');
    expect(results.single.center, const LatLng(23.8103, 90.4125));
  });

  test('short queries do not hit the network', () async {
    final client = MockClient((_) async => fail('no request expected'));
    expect(await searchPlaces('ab', client: client), isEmpty);
  });

  test('apartment coordinates bounds (lib/apartmentLocation.ts)', () {
    expect(validApartmentLocation(const LatLng(23.8, 90.4)), isTrue);
    expect(validApartmentLocation(const LatLng(-90, 180)), isTrue);
  });
}
