import 'package:cryptography/cryptography.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import '../providers.dart';
import 'encryption.dart';

class EncryptionNotSetUpException implements Exception {}

/// Holds the unwrapped data-encryption key. As on the web it normally lives
/// in memory only; with biometric lock on, a copy is kept in the platform
/// keystore (Keychain / Android Keystore-backed storage) and released only
/// after a successful fingerprint/face check, so the passphrase isn't needed
/// on every launch.
final keyVaultProvider = NotifierProvider<KeyVault, SecretKey?>(KeyVault.new);

class KeyVault extends Notifier<SecretKey?> {
  static const _storage = FlutterSecureStorage(
    iOptions: IOSOptions(accessibility: KeychainAccessibility.unlocked_this_device),
  );
  static const _dekKey = 'landlord.dek';
  static const _biometricKey = 'landlord.biometric_lock';
  final _auth = LocalAuthentication();

  @override
  SecretKey? build() => null;

  /// Unlocks with the passphrase, or with the recovery code when [recovery].
  Future<void> unlock(String secret, {bool recovery = false}) async {
    final profile = await ref.read(repositoryProvider).profile();
    if (profile == null || profile['encryption_enabled'] != true) {
      throw EncryptionNotSetUpException();
    }
    final prefix = recovery ? 'recovery' : 'passphrase';
    final dek = await unwrapDEKWithSecret(
      secret,
      fromPgBytea(profile[recovery ? 'recovery_salt' : 'dek_salt'] as String),
      fromPgBytea(profile['dek_wrapped_by_$prefix'] as String),
      fromPgBytea(profile['dek_wrapped_by_${prefix}_iv'] as String),
    );
    state = dek;
    if (await biometricLockEnabled()) await _store(dek);
  }

  /// Forgets the key everywhere, including the keystore copy.
  Future<void> lock() async {
    state = null;
    await _storage.delete(key: _dekKey);
  }

  /// Drops the in-memory key only (app was backgrounded with biometric lock on).
  void suspend() => state = null;

  Future<bool> biometricAvailable() async =>
      await _auth.isDeviceSupported() && await _auth.canCheckBiometrics;

  Future<bool> biometricLockEnabled() async =>
      await _storage.read(key: _biometricKey) == '1';

  Future<bool> authenticate(String reason) =>
      _auth.authenticate(localizedReason: reason, persistAcrossBackgrounding: true);

  Future<bool> setBiometricLock(bool enabled, String reason) async {
    if (enabled) {
      if (!await authenticate(reason)) return false;
      await _storage.write(key: _biometricKey, value: '1');
      if (state != null) await _store(state!);
    } else {
      await _storage.delete(key: _biometricKey);
      await _storage.delete(key: _dekKey);
    }
    return true;
  }

  /// Biometric check, then restores the stored key if there is one.
  Future<bool> biometricUnlock(String reason) async {
    if (!await authenticate(reason)) return false;
    final raw = await _storage.read(key: _dekKey);
    if (raw != null) state = SecretKey(fromPgBytea(raw));
    return true;
  }

  Future<void> forgetAll() async {
    state = null;
    await _storage.deleteAll();
  }

  Future<void> _store(SecretKey dek) async =>
      _storage.write(key: _dekKey, value: toPgBytea(await dek.extractBytes()));
}

/// Whether the app is behind the biometric lock screen.
final appLockProvider = NotifierProvider<AppLock, bool>(AppLock.new);

class AppLock extends Notifier<bool> {
  @override
  bool build() => false;

  /// Locks if the user turned biometric lock on.
  Future<void> lockIfEnabled() async {
    final vault = ref.read(keyVaultProvider.notifier);
    if (await vault.biometricLockEnabled()) {
      vault.suspend();
      state = true;
    }
  }

  void unlocked() => state = false;
}
