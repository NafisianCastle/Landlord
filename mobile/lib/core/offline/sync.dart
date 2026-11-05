import 'dart:async';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'local_db.dart';

/// True for failures that mean "couldn't reach the server" rather than "the
/// server said no" — those ops stay queued for the next attempt.
bool isOfflineError(Object error) =>
    error is SocketException ||
    error is TimeoutException ||
    error is http.ClientException ||
    (error is AuthRetryableFetchException);

class SyncResult {
  const SyncResult({required this.remaining, required this.rejected});

  /// Ops still queued because the device is offline.
  final int remaining;

  /// Server-side rejections (RLS, CHECK constraints…). Those ops are dropped
  /// so one bad write can't block the queue forever.
  final List<String> rejected;
}

/// Replays the outbox in order. Last write wins: every op carries the full
/// set of fields the user saved, keyed by a client-generated row id.
class SyncService {
  SyncService(this._db, this._send);

  final LocalDb _db;
  final Future<void> Function(OutboxOp op) _send;
  Future<SyncResult>? _running;

  Future<SyncResult> flush() => _running ??= _flush().whenComplete(() => _running = null);

  Future<SyncResult> _flush() async {
    final rejected = <String>[];
    final ops = await _db.pendingOps();
    for (final (i, op) in ops.indexed) {
      try {
        await _send(op);
      } catch (e) {
        if (isOfflineError(e)) {
          return SyncResult(remaining: ops.length - i, rejected: rejected);
        }
        rejected.add(e is PostgrestException ? e.message : e.toString());
      }
      await _db.removeOp(op.id!);
    }
    return SyncResult(remaining: 0, rejected: rejected);
  }
}

/// Sends one op to Supabase. A replayed insert whose first attempt actually
/// landed (response lost) hits a primary-key conflict — that's success.
Future<void> sendToSupabase(SupabaseClient client, OutboxOp op) async {
  switch (op.kind) {
    case 'insert':
      try {
        await client.from(op.target).insert(op.payload);
      } on PostgrestException catch (e) {
        if (e.code != '23505') rethrow;
      }
    case 'update':
      await client.from(op.target).update(op.payload).eq('id', op.rowId!);
    case 'delete':
      await client.from(op.target).delete().eq('id', op.rowId!);
    case 'rpc':
      await client.rpc(op.target, params: op.payload);
    default:
      throw ArgumentError('Unknown outbox op ${op.kind}');
  }
}
