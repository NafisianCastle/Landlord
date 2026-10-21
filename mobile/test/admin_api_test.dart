import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:landlord_mobile/core/data/admin_api.dart';

void main() {
  late List<http.Request> sent;
  AdminApi api(http.Response Function(http.Request) respond) {
    sent = [];
    return AdminApi('https://landlord.test', () => 'jwt',
        client: MockClient((req) async {
          sent.add(req);
          return respond(req);
        }));
  }

  test('sends the access token and decodes lists', () async {
    final client = api((_) => http.Response(jsonEncode({'users': [{'id': 'u1'}]}), 200));
    final users = await client.users(' rahim ');
    expect(users.single['id'], 'u1');
    expect(sent.single.url.toString(), 'https://landlord.test/api/admin/users?q=rahim');
    expect(sent.single.headers['authorization'], 'Bearer jwt');
  });

  test('writes go out as JSON with the right method', () async {
    final client = api((_) => http.Response('{"success":true}', 200));
    await client.setCouponActive('c1', false);
    expect(sent.single.method, 'PATCH');
    expect(jsonDecode(sent.single.body), {'id': 'c1', 'active': false});
  });

  test('server errors surface their message and status', () async {
    final client = api((_) => http.Response('{"error":"Forbidden"}', 403));
    expect(
      client.overview(),
      throwsA(isA<AdminApiException>()
          .having((e) => e.status, 'status', 403)
          .having((e) => e.message, 'message', 'Forbidden')),
    );
  });
}
