import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'data/property_kind.dart';
import 'data/repository.dart';
import 'offline/local_db.dart';
import 'offline/sync.dart';
import 'offline/tile_cache.dart';

/// Overridden in main() once the database file is open.
final localDbProvider = Provider<LocalDb>((ref) => throw UnimplementedError());
final tileCacheProvider = Provider<TileCache>((ref) => throw UnimplementedError());

final supabaseProvider = Provider<SupabaseClient>((ref) => Supabase.instance.client);

final sessionProvider = StreamProvider<Session?>((ref) {
  final auth = ref.watch(supabaseProvider).auth;
  return auth.onAuthStateChange.map((s) => s.session);
});

/// Bumped whenever cached data changes; data providers watch it to re-read.
final dataRevisionProvider = NotifierProvider<DataRevision, int>(DataRevision.new);

class DataRevision extends Notifier<int> {
  @override
  int build() => 0;
  void bump() => state++;
}

final repositoryProvider = Provider<Repository>((ref) {
  final client = ref.watch(supabaseProvider);
  final db = ref.watch(localDbProvider);
  return Repository(
    client,
    db,
    SyncService(db, (op) => sendToSupabase(client, op)),
    () => ref.read(dataRevisionProvider.notifier).bump(),
  );
});

final propertiesProvider = FutureProvider.family<List<DbRow>, PropertyKind>((ref, kind) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).properties(kind);
});

final propertyProvider =
    FutureProvider.family<DbRow?, (PropertyKind, String)>((ref, args) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).property(args.$1, args.$2);
});

final leasesProvider =
    FutureProvider.family<List<DbRow>, (PropertyKind, String)>((ref, args) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).leases(args.$1, args.$2);
});

final leaseProvider = FutureProvider.family<DbRow?, String>((ref, id) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).lease(id);
});

final paymentsProvider = FutureProvider.family<List<DbRow>, String>((ref, leaseId) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).payments(leaseId);
});

final documentsProvider =
    FutureProvider.family<List<DbRow>, (PropertyKind, String)>((ref, args) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).documents(args.$1, args.$2);
});

final expensesProvider =
    FutureProvider.family<List<DbRow>, (PropertyKind, String)>((ref, args) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).expenses(args.$1, args.$2);
});

final maintenanceProvider =
    FutureProvider.family<List<DbRow>, (PropertyKind, String)>((ref, args) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).maintenance(args.$1, args.$2);
});

final vendorsProvider = FutureProvider<List<DbRow>>((ref) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).vendors();
});

final profileProvider = FutureProvider<DbRow?>((ref) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).profile();
});

final statsProvider = FutureProvider((ref) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).stats();
});

final pendingCountProvider = FutureProvider<int>((ref) {
  ref.watch(dataRevisionProvider);
  return ref.read(repositoryProvider).pendingCount();
});

/// App language: the profile's preferred_language once signed in (shared
/// with the web app), otherwise the device default.
final localeProvider = Provider<Locale?>((ref) {
  final code = ref.watch(profileProvider).value?['preferred_language'] as String?;
  return code == null ? null : Locale(code);
});
