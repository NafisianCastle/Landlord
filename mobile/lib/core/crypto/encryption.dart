import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

/// Dart port of the web app's lib/crypto/encryption.ts. The wire format must
/// stay byte-for-byte compatible so records and documents encrypted on one
/// client decrypt on the other:
///
/// - DEK: random AES-256-GCM key, wrapped ("raw" WebCrypto wrapKey, i.e. plain
///   AES-GCM encryption of the 32 key bytes) by a key derived from the
///   passphrase or recovery code via PBKDF2-SHA256, 600k iterations.
/// - Ciphertext is WebCrypto-style: cipher bytes followed by the 16-byte tag.
/// - IVs are 12 bytes, salts 16 bytes.
/// - bytea travels over PostgREST as "\x" + lowercase hex.
const pbkdf2Iterations = 600000;
const _tagLength = 16;

final _aes = AesGcm.with256bits();
final _random = Random.secure();

Uint8List randomBytes(int length) =>
    Uint8List.fromList(List<int>.generate(length, (_) => _random.nextInt(256)));

class WrappedKey {
  const WrappedKey({required this.salt, required this.wrapped, required this.iv});
  final Uint8List salt;
  final Uint8List wrapped;
  final Uint8List iv;
}

class Ciphertext {
  const Ciphertext({required this.ciphertext, required this.iv});
  final Uint8List ciphertext;
  final Uint8List iv;
}

Future<SecretKey> _deriveWrappingKey(String secret, List<int> salt) {
  final pbkdf2 = Pbkdf2(
    macAlgorithm: Hmac.sha256(),
    iterations: pbkdf2Iterations,
    bits: 256,
  );
  return pbkdf2.deriveKey(
    secretKey: SecretKey(utf8.encode(secret)),
    nonce: salt,
  );
}

Future<Uint8List> _seal(List<int> plaintext, SecretKey key, List<int> iv) async {
  final box = await _aes.encrypt(plaintext, secretKey: key, nonce: iv);
  return Uint8List.fromList([...box.cipherText, ...box.mac.bytes]);
}

Future<Uint8List> _open(List<int> ciphertext, SecretKey key, List<int> iv) async {
  if (ciphertext.length < _tagLength) {
    throw const FormatException('Ciphertext is shorter than the GCM tag.');
  }
  final split = ciphertext.length - _tagLength;
  final box = SecretBox(
    ciphertext.sublist(0, split),
    nonce: iv,
    mac: Mac(ciphertext.sublist(split)),
  );
  return Uint8List.fromList(await _aes.decrypt(box, secretKey: key));
}

Future<SecretKey> generateDEK() => _aes.newSecretKey();

Future<WrappedKey> wrapDEKWithSecret(SecretKey dek, String secret) async {
  final salt = randomBytes(16);
  final iv = randomBytes(12);
  final wrappingKey = await _deriveWrappingKey(secret, salt);
  final raw = await dek.extractBytes();
  return WrappedKey(salt: salt, wrapped: await _seal(raw, wrappingKey, iv), iv: iv);
}

Future<SecretKey> unwrapDEKWithSecret(
  String secret,
  Uint8List salt,
  Uint8List wrapped,
  Uint8List iv,
) async {
  final wrappingKey = await _deriveWrappingKey(secret, salt);
  return SecretKey(await _open(wrapped, wrappingKey, iv));
}

Future<Ciphertext> encryptBytes(List<int> plaintext, SecretKey dek) async {
  final iv = randomBytes(12);
  return Ciphertext(ciphertext: await _seal(plaintext, dek, iv), iv: iv);
}

Future<Uint8List> decryptBytes(
        Uint8List ciphertext, Uint8List iv, SecretKey dek) =>
    _open(ciphertext, dek, iv);

Future<Ciphertext> encryptJSON(Object? data, SecretKey dek) =>
    encryptBytes(utf8.encode(jsonEncode(data)), dek);

Future<Map<String, dynamic>> decryptJSON(
    Uint8List ciphertext, Uint8List iv, SecretKey dek) async {
  final bytes = await decryptBytes(ciphertext, iv, dek);
  return jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
}

/// Postgres/PostgREST bytea wire format for inserts: "\x" + hex.
String toPgBytea(List<int> bytes) =>
    '\\x${bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join()}';

/// PostgREST returns bytea as "\x"-prefixed hex on select.
Uint8List fromPgBytea(String hex) {
  final clean = hex.startsWith('\\x') ? hex.substring(2) : hex;
  final bytes = Uint8List(clean.length ~/ 2);
  for (var i = 0; i < bytes.length; i++) {
    bytes[i] = int.parse(clean.substring(i * 2, i * 2 + 2), radix: 16);
  }
  return bytes;
}
