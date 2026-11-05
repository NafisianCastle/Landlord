import 'dart:convert';

import 'package:sqflite/sqflite.dart';

/// A queued write that hasn't reached Supabase yet. [kind] is insert, update,
/// delete or rpc; [target] is the table (or RPC function) name.
class OutboxOp {
  const OutboxOp({
    this.id,
    required this.kind,
    required this.target,
    this.rowId,
    this.payload = const {},
  });

  final int? id;
  final String kind;
  final String target;
  final String? rowId;
  final Map<String, dynamic> payload;
}

/// On-device copy of the signed-in user's rows (one JSON blob per row, keyed
/// by table + id) plus an ordered outbox of pending writes. A landlord's data
/// is small, so whole tables are cached and filtered in Dart.
class LocalDb {
  LocalDb._(this._db);
  final Database _db;

  static Future<LocalDb> open(String path, {DatabaseFactory? factory}) async {
    final db = await (factory ?? databaseFactory).openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: 1,
        onCreate: (db, _) async {
          await db.execute(
              'CREATE TABLE rows (tbl TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (tbl, id))');
          await db.execute(
              'CREATE TABLE outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, target TEXT NOT NULL, row_id TEXT, payload TEXT NOT NULL)');
        },
      ),
    );
    return LocalDb._(db);
  }

  Future<void> replaceTable(String table, List<Map<String, dynamic>> rows,
      {String idKey = 'id'}) {
    return _db.transaction((txn) async {
      await txn.delete('rows', where: 'tbl = ?', whereArgs: [table]);
      for (final (i, row) in rows.indexed) {
        await txn.insert('rows', {
          'tbl': table,
          'id': row[idKey]?.toString() ?? '$i',
          'data': jsonEncode(row),
        });
      }
    });
  }

  Future<List<Map<String, dynamic>>> rows(String table) async {
    final result = await _db.query('rows',
        columns: ['data'], where: 'tbl = ?', whereArgs: [table]);
    return [
      for (final r in result)
        jsonDecode(r['data'] as String) as Map<String, dynamic>
    ];
  }

  Future<Map<String, dynamic>?> row(String table, String id) async {
    final result = await _db.query('rows',
        columns: ['data'], where: 'tbl = ? AND id = ?', whereArgs: [table, id]);
    if (result.isEmpty) return null;
    return jsonDecode(result.first['data'] as String) as Map<String, dynamic>;
  }

  /// Inserts the row, or merges [values] into the cached one.
  Future<void> upsertRow(String table, String id, Map<String, dynamic> values) async {
    final existing = await row(table, id) ?? {'id': id};
    await _db.insert(
      'rows',
      {'tbl': table, 'id': id, 'data': jsonEncode({...existing, ...values})},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> deleteRow(String table, String id) =>
      _db.delete('rows', where: 'tbl = ? AND id = ?', whereArgs: [table, id]);

  Future<void> enqueue(OutboxOp op) => _db.insert('outbox', {
        'kind': op.kind,
        'target': op.target,
        'row_id': op.rowId,
        'payload': jsonEncode(op.payload),
      });

  Future<List<OutboxOp>> pendingOps() async {
    final result = await _db.query('outbox', orderBy: 'id');
    return [
      for (final r in result)
        OutboxOp(
          id: r['id'] as int,
          kind: r['kind'] as String,
          target: r['target'] as String,
          rowId: r['row_id'] as String?,
          payload: jsonDecode(r['payload'] as String) as Map<String, dynamic>,
        )
    ];
  }

  Future<void> removeOp(int id) =>
      _db.delete('outbox', where: 'id = ?', whereArgs: [id]);

  /// Wipes everything — on sign-out, so the next account starts clean.
  Future<void> clear() async {
    await _db.delete('rows');
    await _db.delete('outbox');
  }
}
