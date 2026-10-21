import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/analytics/analytics_screen.dart';
import '../features/auth/auth_screens.dart';
import '../features/bills/bill_screens.dart';
import '../features/boundary/boundary_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/expenses/expense_screens.dart';
import '../features/leases/lease_screens.dart';
import '../features/maintenance/maintenance_screens.dart';
import '../features/properties/apartment_location.dart';
import '../features/properties/property_detail_screen.dart';
import '../features/properties/property_form_screen.dart';
import '../features/properties/property_list_screen.dart';
import '../features/settings/lock_screen.dart';
import '../features/settings/offline_maps_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/shell/home_shell.dart';
import '../features/vendors/vendor_screens.dart';
import 'crypto/key_vault.dart';
import 'data/property_kind.dart';

/// Re-runs the router's redirect when auth or the app lock changes.
class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(Ref ref) {
    Supabase.instance.client.auth.onAuthStateChange.listen((_) => notifyListeners());
    ref.listen(appLockProvider, (_, _) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: _RouterRefresh(ref),
    redirect: (context, state) {
      final signedIn = Supabase.instance.client.auth.currentSession != null;
      final path = state.matchedLocation;
      final onAuthPage = path == '/login' || path == '/signup';
      if (!signedIn) return onAuthPage ? null : '/login';
      if (ref.read(appLockProvider)) return path == '/lock' ? null : '/lock';
      if (onAuthPage || path == '/lock') return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, _) => const SignupScreen()),
      GoRoute(path: '/lock', builder: (_, _) => const LockScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => HomeShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/dashboard',
              builder: (_, _) => const DashboardScreen(),
              routes: [GoRoute(path: 'analytics', builder: (_, _) => const AnalyticsScreen())],
            ),
          ]),
          for (final kind in PropertyKind.values)
            StatefulShellBranch(routes: [
              GoRoute(
                path: '/${kind.route}',
                builder: (_, _) => PropertyListScreen(kind: kind),
                routes: [
                  GoRoute(
                    path: 'new',
                    builder: (_, _) => PropertyFormScreen(kind: kind),
                  ),
                  GoRoute(
                    path: ':id',
                    builder: (_, s) =>
                        PropertyDetailScreen(kind: kind, id: s.pathParameters['id']!),
                    routes: [
                      GoRoute(
                        path: 'edit',
                        builder: (_, s) =>
                            PropertyFormScreen(kind: kind, id: s.pathParameters['id']),
                      ),
                      if (kind == PropertyKind.apartment)
                        GoRoute(
                          path: 'location',
                          builder: (_, s) =>
                              ApartmentLocationScreen(apartmentId: s.pathParameters['id']!),
                        ),
                      if (kind == PropertyKind.apartment)
                        GoRoute(
                          path: 'bills/new',
                          builder: (_, s) => BillFormScreen(apartmentId: s.pathParameters['id']!),
                        ),
                      if (kind == PropertyKind.plot)
                        GoRoute(
                          path: 'boundary',
                          builder: (_, s) => BoundaryScreen(plotId: s.pathParameters['id']!),
                        ),
                      GoRoute(
                        path: 'expenses/new',
                        builder: (_, s) =>
                            ExpenseFormScreen(kind: kind, propertyId: s.pathParameters['id']!),
                      ),
                      GoRoute(
                        path: 'maintenance/new',
                        builder: (_, s) =>
                            MaintenanceFormScreen(kind: kind, propertyId: s.pathParameters['id']!),
                      ),
                      GoRoute(
                        path: 'leases/new',
                        builder: (_, s) =>
                            LeaseFormScreen(kind: kind, propertyId: s.pathParameters['id']!),
                      ),
                      GoRoute(
                        path: 'leases/:leaseId',
                        builder: (_, s) => LeaseDetailScreen(
                            kind: kind,
                            propertyId: s.pathParameters['id']!,
                            leaseId: s.pathParameters['leaseId']!),
                        routes: [
                          GoRoute(
                            path: 'edit',
                            builder: (_, s) => LeaseFormScreen(
                                kind: kind,
                                propertyId: s.pathParameters['id']!,
                                leaseId: s.pathParameters['leaseId']),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/bills', builder: (_, _) => const BillsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/settings',
              builder: (_, _) => const SettingsScreen(),
              routes: [
                GoRoute(path: 'offline-maps', builder: (_, _) => const OfflineMapsScreen()),
                GoRoute(
                  path: 'vendors',
                  builder: (_, _) => const VendorsScreen(),
                  routes: [
                    GoRoute(path: 'new', builder: (_, _) => const VendorFormScreen()),
                    GoRoute(
                      path: ':vendorId',
                      builder: (_, s) => VendorFormScreen(id: s.pathParameters['vendorId']),
                    ),
                  ],
                ),
              ],
            ),
          ]),
        ],
      ),
    ],
  );
});

/// Notification payloads carry web paths (`/plots/{id}`, `/apartments/{id}`,
/// `/bills#bill-{id}`, `/leases`); open the matching screen when we have one.
String appPathForWebUrl(String url) {
  final path = Uri.tryParse(url)?.path ?? '';
  if (path == '/bills') return '/bills';
  final match = RegExp(r'^/(plots|apartments)/([0-9a-f-]{36})').firstMatch(path);
  return match == null ? '/dashboard' : '/${match[1]}/${match[2]}';
}
