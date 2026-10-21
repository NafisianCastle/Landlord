import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/router.dart';

void main() {
  test('notification URLs open the matching property', () {
    const id = '0b7e9a8e-2c1d-4c55-9a51-2f0f2a1d9e10';
    expect(appPathForWebUrl('/apartments/$id'), '/apartments/$id');
    expect(appPathForWebUrl('/plots/$id'), '/plots/$id');
    expect(appPathForWebUrl('/leases'), '/dashboard');
    expect(appPathForWebUrl('/plots/../../etc'), '/dashboard');
  });
}
