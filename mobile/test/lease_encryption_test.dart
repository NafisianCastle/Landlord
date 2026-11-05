import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/crypto/encryption.dart';
import 'package:landlord_mobile/core/data/property_kind.dart';
import 'package:landlord_mobile/core/data/repository.dart';
import 'package:landlord_mobile/core/offline/local_db.dart';
import 'package:landlord_mobile/core/offline/sync.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  sqfliteFfiInit();
  late LocalDb db;
  late Repository repo;

  setUp(() async {
    db = await LocalDb.open(inMemoryDatabasePath, factory: databaseFactoryFfiNoIsolate);
    await db.clear();
    // Offline: writes stay queued in the outbox, so nothing reaches a server.
    final sync = SyncService(db, (_) async => throw const SocketException('offline'));
    repo = Repository(SupabaseClient('http://localhost', 'key'), db, sync, () {});
  });

  const values = {
    'tenantName': 'Rahim',
    'tenantPhone': '01700000000',
    'tenantEmail': 'Rahim@Example.com',
    'rentAmount': '15000',
    'frequency': 'monthly',
    'startDate': '2026-01-01',
    'endDate': '',
    'notes': 'Pays by bKash',
  };

  test('with the key unlocked, tenant details are only stored encrypted', () async {
    await db.upsertRow('leases', 'l1', {'apartment_id': 'a1', 'status': 'active'});
    final dek = await generateDEK();
    await repo.saveLease(PropertyKind.apartment, 'a1', 'l1', values, dek: dek);

    final cached = (await db.row('leases', 'l1'))!;
    for (final column in ['tenant_name', 'tenant_phone', 'tenant_email', 'notes']) {
      expect(cached[column], isNull, reason: column);
    }
    expect(cached['sensitive_encrypted'], startsWith(r'\x'));
    expect(cached['rent_amount'], 15000);

    final revealed = await repo.revealLease(cached, dek);
    expect(revealed['tenant_name'], 'Rahim');
    expect(revealed['tenant_phone'], '01700000000');
    expect(revealed['tenant_email'], 'rahim@example.com');
    expect(revealed['notes'], 'Pays by bKash');

    final locked = await repo.revealLease(cached, null);
    expect(locked['secrets_locked'], true);
    expect(locked['tenant_name'], isNull);

    final wrongKey = await repo.revealLease(cached, await generateDEK());
    expect(wrongKey['secrets_locked'], true);
  });

  test('reads a lease encrypted with the web field names', () async {
    final dek = await generateDEK();
    final sealed = await encryptJSON(
        {'tenantName': 'Karim', 'tenantPhone': null, 'tenantEmail': null, 'notes': null}, dek);
    final revealed = await repo.revealLease({
      'tenant_name': null,
      'sensitive_encrypted': toPgBytea(sealed.ciphertext),
      'sensitive_iv': toPgBytea(sealed.iv),
    }, dek);
    expect(revealed['tenant_name'], 'Karim');
  });

  test('without the key, leases stay plaintext and clear any old ciphertext', () async {
    await db.upsertRow('leases', 'l2', {'plot_id': 'p1', 'sensitive_encrypted': r'\x00'});
    await repo.saveLease(PropertyKind.plot, 'p1', 'l2', values, dek: null);
    final cached = (await db.row('leases', 'l2'))!;
    expect(cached['tenant_name'], 'Rahim');
    expect(cached['sensitive_encrypted'], isNull);
    expect(await repo.revealLease(cached, null), cached);
  });
}
