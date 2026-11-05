import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/offline/backup_exclusion.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('landlord/backup');
  final calls = <MethodCall>[];
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  setUp(() {
    calls.clear();
    messenger.setMockMethodCallHandler(channel, (call) async {
      calls.add(call);
      return null;
    });
  });
  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  test('asks iOS to exclude the given paths', () async {
    await excludeFromBackup(['/data/landlord.db', '/data/tiles'], isIOS: true);
    expect(calls.single.method, 'excludeFromBackup');
    expect(calls.single.arguments, ['/data/landlord.db', '/data/tiles']);
  });

  test('does nothing on other platforms', () async {
    await excludeFromBackup(['/data/landlord.db'], isIOS: false);
    expect(calls, isEmpty);
  });

  test('never throws, so startup is not blocked', () async {
    messenger.setMockMethodCallHandler(
        channel, (_) async => throw PlatformException(code: 'exclude_failed'));
    await expectLater(excludeFromBackup(['/x'], isIOS: true), completes);
  });
}
