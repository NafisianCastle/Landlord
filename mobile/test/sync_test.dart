import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/offline/local_db.dart';
import 'package:landlord_mobile/core/offline/sync.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  sqfliteFfiInit();
  late LocalDb db;

  setUp(() async {
    db = await LocalDb.open(inMemoryDatabasePath, factory: databaseFactoryFfiNoIsolate);
    await db.clear();
  });

  test('cache upsert merges and replaceTable resets', () async {
    await db.upsertRow('land_plots', 'a', {'name': 'A', 'district': 'Dhaka'});
    await db.upsertRow('land_plots', 'a', {'name': 'A2'});
    expect(await db.row('land_plots', 'a'),
        {'id': 'a', 'name': 'A2', 'district': 'Dhaka'});
    await db.replaceTable('land_plots', [
      {'id': 'b', 'name': 'B'}
    ]);
    expect((await db.rows('land_plots')).map((r) => r['id']), ['b']);
  });

  test('outbox replays in order and keeps ops while offline', () async {
    await db.enqueue(const OutboxOp(kind: 'insert', target: 't', rowId: '1'));
    await db.enqueue(const OutboxOp(kind: 'update', target: 't', rowId: '1'));
    await db.enqueue(const OutboxOp(kind: 'rpc', target: 'f'));

    final sent = <String>[];
    var online = false;
    final sync = SyncService(db, (op) async {
      if (!online) throw const SocketException('offline');
      sent.add('${op.kind}:${op.target}');
    });

    final offline = await sync.flush();
    expect(offline.remaining, 3);
    expect(sent, isEmpty);

    online = true;
    final result = await sync.flush();
    expect(result.remaining, 0);
    expect(sent, ['insert:t', 'update:t', 'rpc:f']);
    expect(await db.pendingOps(), isEmpty);
  });

  test('server rejections are dropped and reported, not retried', () async {
    await db.enqueue(const OutboxOp(kind: 'update', target: 't', rowId: '1'));
    await db.enqueue(const OutboxOp(kind: 'update', target: 't', rowId: '2'));
    final sync = SyncService(db, (op) async {
      if (op.rowId == '1') throw const PostgrestException(message: 'denied');
    });
    final result = await sync.flush();
    expect(result.rejected, ['denied']);
    expect(await db.pendingOps(), isEmpty);
  });
}
