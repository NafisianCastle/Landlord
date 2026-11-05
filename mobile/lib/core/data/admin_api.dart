import 'dart:convert';

import 'package:http/http.dart' as http;

/// Client for the web app's /api/admin routes (lib/adminApi.ts). Admin data
/// needs the service role, which must never ship in the app, so the web
/// server checks this user's access token and is_admin, then does the work
/// with the same code as the web admin pages.
class AdminApiException implements Exception {
  const AdminApiException(this.message, this.status);
  final String message;
  final int status;
  @override
  String toString() => message;
}

class AdminApi {
  AdminApi(this._baseUrl, this._accessToken, {http.Client? client})
      : _client = client ?? http.Client();

  final String _baseUrl;
  final String? Function() _accessToken;
  final http.Client _client;

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('$_baseUrl/api/admin/$path').replace(queryParameters: query);

  Future<Map<String, dynamic>> _send(String method, String path,
      {Map<String, Object?>? body, Map<String, String>? query}) async {
    final request = http.Request(method, _uri(path, query))
      ..headers['authorization'] = 'Bearer ${_accessToken() ?? ''}'
      ..headers['content-type'] = 'application/json';
    if (body != null) request.body = jsonEncode(body);
    final res = await http.Response.fromStream(await _client.send(request));
    final decoded = res.body.isEmpty ? <String, dynamic>{} : jsonDecode(res.body);
    final json = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
    if (res.statusCode >= 400) {
      throw AdminApiException(json['error'] as String? ?? 'Error ${res.statusCode}', res.statusCode);
    }
    return json;
  }

  Future<Map<String, dynamic>> overview() => _send('GET', 'overview');

  Future<List<Map<String, dynamic>>> users(String query) async =>
      ((await _send('GET', 'users', query: query.trim().isEmpty ? null : {'q': query.trim()}))['users']
              as List)
          .cast<Map<String, dynamic>>();

  Future<void> grantLifetimeAccess(String userId) =>
      _send('POST', 'users', body: {'userId': userId});

  Future<List<Map<String, dynamic>>> coupons() async =>
      ((await _send('GET', 'coupons'))['coupons'] as List).cast<Map<String, dynamic>>();

  Future<void> createCoupon(Map<String, Object?> coupon) => _send('POST', 'coupons', body: coupon);

  Future<void> setCouponActive(String id, bool active) =>
      _send('PATCH', 'coupons', body: {'id': id, 'active': active});

  Future<Map<String, dynamic>> settings() => _send('GET', 'settings');

  Future<void> updateSettings(num lifetimePriceBdt, int trialDays) => _send('PUT', 'settings',
      body: {'lifetimePriceBdt': lifetimePriceBdt, 'trialDays': trialDays});
}
