import 'dart:async';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:latlong2/latlong.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../crypto/encryption.dart';
import '../geo/geo.dart';
import '../offline/local_db.dart';
import '../offline/sync.dart';
import '../validation/documents.dart';
import 'property_kind.dart';

typedef DbRow = Map<String, dynamic>;

class RefreshResult {
  const RefreshResult({required this.offline, required this.rejected});
  final bool offline;
  final List<String> rejected;
}

class LockedException implements Exception {}

class DocumentValidationException implements Exception {
  const DocumentValidationException(this.error);
  final DocumentError error;
}

const _uuid = Uuid();

// Every column except the PostGIS `boundary` (boundary_geojson mirrors it).
const _plotColumns =
    'id,user_id,name,village,upazila,district,division,mutation_number,purchase_price,'
    'purchase_date,current_estimated_value,notes,area_sq_meters,boundary_geojson,'
    'dolil_area,dolil_area_unit,actual_area,actual_area_unit,sensitive_encrypted,'
    'sensitive_iv,created_at,updated_at';
const _profileColumns =
    'id,full_name,preferred_language,encryption_enabled,dek_salt,dek_wrapped_by_passphrase,'
    'dek_wrapped_by_passphrase_iv,recovery_salt,dek_wrapped_by_recovery,dek_wrapped_by_recovery_iv';

String _today() => DateTime.now().toIso8601String().substring(0, 10);

/// Single access point for app data. Reads come from the on-device cache;
/// writes land in the cache immediately and go to Supabase through the
/// outbox, so everything except document upload/download works offline.
class Repository {
  Repository(this._client, this._db, this._sync, this._onChanged);

  final SupabaseClient _client;
  final LocalDb _db;
  final SyncService _sync;
  final void Function() _onChanged;
  final _rejections = StreamController<String>.broadcast();

  /// Writes the server refused (RLS, constraints) after being queued.
  Stream<String> get rejections => _rejections.stream;

  String get _userId => _client.auth.currentUser!.id;

  Future<int> pendingCount() async => (await _db.pendingOps()).length;

  /// Pushes queued writes, then — only if nothing is still queued, so local
  /// edits are never overwritten — replaces the cache with server state.
  Future<RefreshResult> refresh() async {
    final flushed = await _sync.flush();
    flushed.rejected.forEach(_rejections.add);
    if (flushed.remaining > 0) {
      _onChanged();
      return RefreshResult(offline: true, rejected: flushed.rejected);
    }
    try {
      await _client.rpc('ensure_all_lease_payments');
      final [
        plots,
        apartments,
        leases,
        payments,
        plotDocs,
        aptDocs,
        expenses,
        maintenance,
        vendors,
        profile,
        plotStats,
        rentStats,
      ] = await Future.wait<List<DbRow>>([
        _client.from('land_plots').select(_plotColumns).order('created_at', ascending: false),
        _client.from('apartments').select().order('created_at', ascending: false),
        _client.from('leases').select().order('start_date', ascending: false),
        _client.from('lease_payments').select().order('due_date'),
        _client.from('plot_documents').select().order('uploaded_at', ascending: false),
        _client.from('apartment_documents').select().order('uploaded_at', ascending: false),
        // Tenants can also read expenses an owner shares with them
        // (visible_to_tenants); the app manages only the user's own.
        _client.from('expenses').select().eq('user_id', _userId),
        _client.from('maintenance_requests').select(),
        _client.from('vendors').select().order('name'),
        _client.from('profiles').select(_profileColumns).eq('id', _userId),
        _client.from('plot_stats').select(),
        _client.from('lease_payment_stats').select(),
      ]);
      await _db.replaceTable('land_plots', plots);
      await _db.replaceTable('apartments', apartments);
      await _db.replaceTable('leases', leases);
      await _db.replaceTable('lease_payments', payments);
      await _db.replaceTable('plot_documents', plotDocs);
      await _db.replaceTable('apartment_documents', aptDocs);
      await _db.replaceTable('expenses', expenses);
      await _db.replaceTable('maintenance_requests', maintenance);
      await _db.replaceTable('vendors', vendors);
      await _db.replaceTable('profiles', profile);
      await _db.replaceTable('plot_stats', plotStats);
      await _db.replaceTable('lease_payment_stats', rentStats);
    } catch (e) {
      if (!isOfflineError(e)) rethrow;
      return RefreshResult(offline: true, rejected: flushed.rejected);
    } finally {
      _onChanged();
    }
    return RefreshResult(offline: false, rejected: flushed.rejected);
  }

  Future<void> _write(List<OutboxOp> ops) async {
    for (final op in ops) {
      await _db.enqueue(op);
    }
    _onChanged();
    // Best effort; if offline the ops wait for the next refresh.
    unawaited(refresh().then((_) {}, onError: (Object e) => _rejections.add('$e')));
  }

  // ---- Reads ---------------------------------------------------------------

  Future<List<DbRow>> properties(PropertyKind kind) async {
    final rows = await _db.rows(kind.table);
    rows.sort((a, b) =>
        (b['created_at'] as String? ?? '').compareTo(a['created_at'] as String? ?? ''));
    return rows;
  }

  Future<DbRow?> property(PropertyKind kind, String id) => _db.row(kind.table, id);

  Future<List<DbRow>> leases(PropertyKind kind, String propertyId) async =>
      (await _db.rows('leases')).where((l) => l[kind.foreignKey] == propertyId).toList()
        ..sort((a, b) => (b['start_date'] as String).compareTo(a['start_date'] as String));

  Future<DbRow?> lease(String id) => _db.row('leases', id);

  Future<List<DbRow>> payments(String leaseId) async =>
      (await _db.rows('lease_payments')).where((p) => p['lease_id'] == leaseId).toList()
        ..sort((a, b) => (a['due_date'] as String).compareTo(b['due_date'] as String));

  Future<List<DbRow>> documents(PropertyKind kind, String propertyId) async =>
      (await _db.rows(kind.documentTable))
          .where((d) => d[kind.foreignKey] == propertyId)
          .toList();

  Future<List<DbRow>> expenses(PropertyKind kind, String propertyId) async =>
      (await _db.rows('expenses')).where((e) => e[kind.foreignKey] == propertyId).toList()
        ..sort((a, b) => (b['expense_date'] as String).compareTo(a['expense_date'] as String));

  Future<List<DbRow>> maintenance(PropertyKind kind, String propertyId) async =>
      (await _db.rows('maintenance_requests'))
          .where((m) => m[kind.foreignKey] == propertyId)
          .toList()
        ..sort((a, b) => (b['reported_date'] as String).compareTo(a['reported_date'] as String));

  Future<List<DbRow>> vendors() async => (await _db.rows('vendors'))
    ..sort((a, b) => (a['name'] as String).toLowerCase().compareTo((b['name'] as String).toLowerCase()));

  Future<DbRow?> vendor(String id) => _db.row('vendors', id);

  Future<DbRow?> profile() async {
    final rows = await _db.rows('profiles');
    return rows.isEmpty ? null : rows.first;
  }

  Future<({DbRow? plots, DbRow? rent})> stats() async {
    final plots = await _db.rows('plot_stats');
    final rent = await _db.rows('lease_payment_stats');
    return (plots: plots.firstOrNull, rent: rent.firstOrNull);
  }

  /// The sensitive fields of [row] keyed like the web forms, decrypting when
  /// needed. Returns null when they're encrypted and [dek] isn't available.
  Future<Map<String, dynamic>?> sensitiveValues(
      PropertyKind kind, DbRow row, SecretKey? dek) async {
    final encrypted = row['sensitive_encrypted'] as String?;
    if (encrypted == null) {
      return {
        for (final f in kind.fields.where((f) => f.sensitive)) f.key: row[f.column]
      };
    }
    if (dek == null) return null;
    return decryptJSON(
        fromPgBytea(encrypted), fromPgBytea(row['sensitive_iv'] as String), dek);
  }

  // ---- Property writes -----------------------------------------------------

  /// Saves form [values] (camelCase keys, as typed). Mirrors the web server
  /// actions: with the key unlocked, sensitive fields go into one encrypted
  /// blob and their plaintext columns are cleared; otherwise the reverse.
  /// When the record is encrypted but the key is locked the sensitive
  /// columns are left untouched.
  Future<String> saveProperty(
    PropertyKind kind,
    String? id,
    Map<String, String> values, {
    required SecretKey? dek,
    required bool sensitiveLocked,
  }) async {
    Object? parse(FieldSpec f) {
      final v = values[f.key]?.trim() ?? '';
      if (v.isEmpty) return null;
      return f.type == FieldType.number ? num.parse(v) : v;
    }

    final payload = <String, dynamic>{
      for (final f in kind.fields.where((f) => !f.sensitive)) f.column: parse(f),
    };
    if (!sensitiveLocked) {
      final sensitive = kind.fields.where((f) => f.sensitive);
      if (dek != null) {
        final sealed = await encryptJSON({for (final f in sensitive) f.key: parse(f)}, dek);
        payload['sensitive_encrypted'] = toPgBytea(sealed.ciphertext);
        payload['sensitive_iv'] = toPgBytea(sealed.iv);
        for (final f in sensitive) {
          payload[f.column] = null;
        }
      } else {
        payload['sensitive_encrypted'] = null;
        payload['sensitive_iv'] = null;
        for (final f in sensitive) {
          payload[f.column] = parse(f);
        }
      }
    }

    if (id == null) {
      id = _uuid.v4();
      final row = {...payload, 'id': id, 'user_id': _userId};
      await _db.upsertRow(
          kind.table, id, {...row, 'created_at': DateTime.now().toUtc().toIso8601String()});
      await _write([OutboxOp(kind: 'insert', target: kind.table, rowId: id, payload: row)]);
    } else {
      await _db.upsertRow(kind.table, id, payload);
      await _write([OutboxOp(kind: 'update', target: kind.table, rowId: id, payload: payload)]);
    }
    return id;
  }

  Future<void> deleteProperty(PropertyKind kind, String id) async {
    await _db.deleteRow(kind.table, id);
    await _write([OutboxOp(kind: 'delete', target: kind.table, rowId: id)]);
  }

  /// Same RPC as the web's savePlotBoundary. The cached area is a local
  /// estimate until the server's PostGIS value comes back on refresh.
  Future<void> saveBoundary(String plotId, List<LatLng> points) async {
    final polygon = pointsToPolygon(points);
    await _db.upsertRow('land_plots', plotId,
        {'boundary_geojson': polygon, 'area_sq_meters': polygonAreaSqMeters(points)});
    await _write([
      OutboxOp(
          kind: 'rpc',
          target: 'upsert_plot_boundary',
          payload: {'p_plot_id': plotId, 'p_geojson': polygon}),
    ]);
  }

  // ---- Leases --------------------------------------------------------------

  Future<void> saveLease(PropertyKind kind, String propertyId, String? leaseId,
      Map<String, String> values) async {
    String? opt(String k) => (values[k]?.trim().isEmpty ?? true) ? null : values[k]!.trim();
    final payload = {
      'tenant_name': values['tenantName']!.trim(),
      'tenant_phone': opt('tenantPhone'),
      'tenant_email': opt('tenantEmail'),
      'rent_amount': num.parse(values['rentAmount']!),
      'frequency': values['frequency'] ?? 'monthly',
      'start_date': values['startDate'],
      'end_date': opt('endDate'),
      'notes': opt('notes'),
    };
    final id = leaseId ?? _uuid.v4();
    final ensurePayments =
        OutboxOp(kind: 'rpc', target: 'ensure_lease_payments', payload: {'p_lease_id': id});
    if (leaseId == null) {
      final row = {
        ...payload,
        'id': id,
        'user_id': _userId,
        'plot_id': kind == PropertyKind.plot ? propertyId : null,
        'apartment_id': kind == PropertyKind.apartment ? propertyId : null,
      };
      await _db.upsertRow('leases', id, {...row, 'status': 'active'});
      await _write([
        OutboxOp(kind: 'insert', target: 'leases', rowId: id, payload: row),
        ensurePayments,
      ]);
    } else {
      await _db.upsertRow('leases', id, payload);
      await _write([
        OutboxOp(kind: 'update', target: 'leases', rowId: id, payload: payload),
        ensurePayments,
      ]);
    }
  }

  Future<void> endLease(DbRow lease) async {
    final payload = {'status': 'ended', 'end_date': lease['end_date'] ?? _today()};
    await _db.upsertRow('leases', lease['id'] as String, payload);
    await _write([
      OutboxOp(kind: 'update', target: 'leases', rowId: lease['id'] as String, payload: payload)
    ]);
  }

  Future<void> deleteLease(String id) async {
    await _db.deleteRow('leases', id);
    await _write([OutboxOp(kind: 'delete', target: 'leases', rowId: id)]);
  }

  Future<void> setPaymentPaid(DbRow payment, bool paid) async {
    final payload = paid
        ? {'paid': true, 'paid_date': _today(), 'paid_amount': payment['amount']}
        : {'paid': false, 'paid_date': null, 'paid_amount': null};
    final id = payment['id'] as String;
    await _db.upsertRow('lease_payments', id, payload);
    await _write([OutboxOp(kind: 'update', target: 'lease_payments', rowId: id, payload: payload)]);
  }

  // ---- Expenses & maintenance (create/delete, plus status for maintenance,
  // as on the web) ------------------------------------------------------------

  Map<String, String?> _subject(PropertyKind kind, String propertyId) => {
        'plot_id': kind == PropertyKind.plot ? propertyId : null,
        'apartment_id': kind == PropertyKind.apartment ? propertyId : null,
      };

  Future<void> _insert(String table, Map<String, dynamic> row) async {
    final id = _uuid.v4();
    final full = {...row, 'id': id, 'user_id': _userId};
    await _db.upsertRow(table, id, full);
    await _write([OutboxOp(kind: 'insert', target: table, rowId: id, payload: full)]);
  }

  Future<void> _delete(String table, String id) async {
    await _db.deleteRow(table, id);
    await _write([OutboxOp(kind: 'delete', target: table, rowId: id)]);
  }

  Future<void> addExpense(
      PropertyKind kind, String propertyId, Map<String, String> values) {
    final notes = values['notes']?.trim() ?? '';
    return _insert('expenses', {
      ..._subject(kind, propertyId),
      'category': values['category'] ?? 'other',
      'amount': num.parse(values['amount']!),
      'expense_date': (values['expenseDate'] ?? '').isEmpty ? _today() : values['expenseDate'],
      'notes': notes.isEmpty ? null : notes,
    });
  }

  Future<void> deleteExpense(String id) => _delete('expenses', id);

  Future<void> addMaintenance(
      PropertyKind kind, String propertyId, Map<String, String> values) {
    final description = values['description']?.trim() ?? '';
    final cost = values['cost']?.trim() ?? '';
    final vendorId = values['vendorId'] ?? '';
    return _insert('maintenance_requests', {
      ..._subject(kind, propertyId),
      'title': values['title']!.trim(),
      'description': description.isEmpty ? null : description,
      'cost': cost.isEmpty ? null : num.parse(cost),
      'reported_date':
          (values['reportedDate'] ?? '').isEmpty ? _today() : values['reportedDate'],
      'status': 'open',
      'vendor_id': vendorId.isEmpty ? null : vendorId,
    });
  }

  /// Mirrors updateMaintenanceStatus: resolving stamps today's date.
  Future<void> setMaintenanceStatus(String id, String status) async {
    final payload = {
      'status': status,
      'resolved_date': status == 'resolved' ? _today() : null,
    };
    await _db.upsertRow('maintenance_requests', id, payload);
    await _write([
      OutboxOp(kind: 'update', target: 'maintenance_requests', rowId: id, payload: payload)
    ]);
  }

  Future<void> deleteMaintenance(String id) => _delete('maintenance_requests', id);

  // ---- Vendors (shared across properties, like the web /vendors page) ------

  Future<void> saveVendor(String? id, Map<String, String> values) async {
    String? opt(String k) => (values[k]?.trim().isEmpty ?? true) ? null : values[k]!.trim();
    final payload = {
      'name': values['name']!.trim(),
      'trade': opt('trade'),
      'phone': opt('phone'),
      'notes': opt('notes'),
    };
    if (id == null) return _insert('vendors', payload);
    await _db.upsertRow('vendors', id, payload);
    await _write([OutboxOp(kind: 'update', target: 'vendors', rowId: id, payload: payload)]);
  }

  /// The FK is `on delete set null`; mirror that in the cache so requests
  /// stop showing the vendor before the next refresh.
  Future<void> deleteVendor(String id) async {
    for (final m in await _db.rows('maintenance_requests')) {
      if (m['vendor_id'] == id) {
        await _db.upsertRow('maintenance_requests', m['id'] as String, {'vendor_id': null});
      }
    }
    await _delete('vendors', id);
  }

  Future<void> setLanguage(String code) async {
    await _db.upsertRow('profiles', _userId, {'preferred_language': code});
    await _write([
      OutboxOp(
          kind: 'update', target: 'profiles', rowId: _userId, payload: {'preferred_language': code})
    ]);
  }

  // ---- Documents (need a connection) ---------------------------------------

  /// Same storage layout and row shape as the web's uploadDocument, so files
  /// uploaded here open on the web and vice versa.
  Future<void> uploadDocument(PropertyKind kind, String propertyId, String fileName,
      Uint8List bytes, SecretKey? dek) async {
    final name = safePdfName(fileName);
    final error = validatePdf(name, bytes);
    if (error != null) throw DocumentValidationException(error);

    final storagePath = '$_userId/$propertyId/${_uuid.v4()}.pdf';
    var body = bytes;
    String? ivHex;
    if (dek != null) {
      final sealed = await encryptBytes(bytes, dek);
      body = sealed.ciphertext;
      ivHex = toPgBytea(sealed.iv);
    }
    final storage = _client.storage.from(kind.bucket);
    await storage.uploadBinary(storagePath, body,
        fileOptions: FileOptions(
            contentType: dek != null ? 'application/octet-stream' : 'application/pdf'));
    try {
      await _client.from(kind.documentTable).insert({
        kind.foreignKey: propertyId,
        'user_id': _userId,
        'storage_path': storagePath,
        'file_name': name,
        'file_size_bytes': body.length,
        'mime_type': 'application/pdf',
        'is_encrypted': dek != null,
        'encryption_iv': ivHex,
      });
    } catch (_) {
      await storage.remove([storagePath]);
      rethrow;
    }
    await refresh();
  }

  Future<Uint8List> downloadDocument(PropertyKind kind, DbRow doc, SecretKey? dek) async {
    final bytes = await _client.storage.from(kind.bucket).download(doc['storage_path'] as String);
    if (doc['is_encrypted'] != true) return bytes;
    if (dek == null) throw LockedException();
    return decryptBytes(bytes, fromPgBytea(doc['encryption_iv'] as String), dek);
  }

  Future<void> deleteDocument(PropertyKind kind, DbRow doc) async {
    await _client.storage.from(kind.bucket).remove([doc['storage_path'] as String]);
    await _client.from(kind.documentTable).delete().eq('id', doc['id'] as String);
    await _db.deleteRow(kind.documentTable, doc['id'] as String);
    _onChanged();
  }

  Future<void> signOut() async {
    await _db.clear();
    await _client.auth.signOut();
  }
}
