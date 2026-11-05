import 'dart:convert';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/crypto/encryption.dart';

// Produced by the web app's lib/crypto/encryption.ts (WebCrypto) so this test
// proves the Dart port reads what the browser writes.
const webVector = {
  'rawDek': r'\x9a8d028eae7fd0d31f465c9ae714bbe62153cef1fb8aaf0b3a46a2fffaa4dda6',
  'passphrase': 'correct horse battery staple',
  'salt': r'\x487bf0f80a1f5d7787d4e9d0d74ee3fa',
  'wrapped':
      r'\x012baf12c671e7b8be63211b7c4e3dabf06ee42d66b9003c419c2f7f288dc293bc2562aa2db16b0fd592035f2e0d8dc1',
  'wrapIv': r'\x29d715b51e33161ba4d60040',
  'json':
      r'\xd0c28d009d80bb1a7f273fba84e25dee009d3658cb78c843ddd0188118dc345170af7af3e1ac236675c69d794903f957fa85ee903d3e0e61f62564c1700f0c23aeb2c9c050f4e06e8b12c5d033cac8ebcf362ac2d99e34b2cafdac9afadbcc605eb909793e9c74c1b31936676b34b5441c87de7a4c49438a9270018e625b34d95cbae3b3b1ab415c590144b5fd2aa68a22462397f6b7d152bd26739cd4fc2c2f9f',
  'jsonIv': r'\xfc59326e7c92c815337c48d7',
  'bytes': r'\x0f5f4824e8893123861b004db183c38710eef5efee7f0698117ec25b0059',
  'bytesIv': r'\xa27abd223f948c3dc08b9313',
};

void main() {
  test('bytea hex round-trips', () {
    final bytes = [0, 1, 15, 16, 255];
    expect(toPgBytea(bytes), r'\x00010f10ff');
    expect(fromPgBytea(toPgBytea(bytes)), bytes);
  });

  test('unwraps a DEK wrapped by the web app', () async {
    final dek = await unwrapDEKWithSecret(
      webVector['passphrase']!,
      fromPgBytea(webVector['salt']!),
      fromPgBytea(webVector['wrapped']!),
      fromPgBytea(webVector['wrapIv']!),
    );
    expect(await dek.extractBytes(), fromPgBytea(webVector['rawDek']!));
  });

  test('rejects the wrong passphrase', () async {
    expect(
      unwrapDEKWithSecret(
        'wrong',
        fromPgBytea(webVector['salt']!),
        fromPgBytea(webVector['wrapped']!),
        fromPgBytea(webVector['wrapIv']!),
      ),
      throwsA(isA<SecretBoxAuthenticationError>()),
    );
  });

  test('decrypts web-encrypted JSON and file bytes', () async {
    final dek = SecretKey(fromPgBytea(webVector['rawDek']!));
    final json = await decryptJSON(
      fromPgBytea(webVector['json']!),
      fromPgBytea(webVector['jsonIv']!),
      dek,
    );
    expect(json['village'], 'গ্রাম');
    expect(json['purchasePrice'], 1200000);
    expect(json['currentEstimatedValue'], isNull);

    final bytes = await decryptBytes(
      fromPgBytea(webVector['bytes']!),
      fromPgBytea(webVector['bytesIv']!),
      dek,
    );
    expect(utf8.decode(bytes), '%PDF-1.4 hello');
  });

  test('wrap/encrypt round-trip in the web format', () async {
    final dek = await generateDEK();
    final wrapped = await wrapDEKWithSecret(dek, 'pass phrase');
    expect(wrapped.salt.length, 16);
    expect(wrapped.iv.length, 12);
    // 32 key bytes + 16-byte GCM tag, as WebCrypto wrapKey("raw") produces.
    expect(wrapped.wrapped.length, 48);

    final unwrapped = await unwrapDEKWithSecret(
        'pass phrase', wrapped.salt, wrapped.wrapped, wrapped.iv);
    expect(await unwrapped.extractBytes(), await dek.extractBytes());

    final sealed = await encryptJSON({'notes': 'hi'}, dek);
    expect(await decryptJSON(sealed.ciphertext, sealed.iv, unwrapped),
        {'notes': 'hi'});
  });
}
