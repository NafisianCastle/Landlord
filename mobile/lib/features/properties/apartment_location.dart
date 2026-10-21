import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/data/property_kind.dart';
import '../../core/data/repository.dart';
import '../../core/geo/geo.dart' show googleMapsDirectionsUrl;
import '../../core/geo/geocode.dart';
import '../../core/geo/gps_filter.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../common.dart';
import '../map/base_map.dart';

LatLng? _savedPoint(DbRow apartment) {
  final lat = apartment['latitude'] as num?;
  final lng = apartment['longitude'] as num?;
  return lat == null || lng == null ? null : LatLng(lat.toDouble(), lng.toDouble());
}

String _coords(LatLng p) => '${p.latitude.toStringAsFixed(6)}, ${p.longitude.toStringAsFixed(6)}';

MarkerLayer _pin(LatLng point) => MarkerLayer(markers: [
      Marker(
        point: point,
        width: 40,
        height: 40,
        alignment: Alignment.topCenter,
        child: const Icon(Icons.location_pin, color: Brand.forest, size: 40),
      ),
    ]);

final _canEditProvider = FutureProvider.family<bool, String>((ref, apartmentId) async {
  final row = await ref.watch(propertyProvider((PropertyKind.apartment, apartmentId)).future);
  return row != null && await ref.read(repositoryProvider).canEditApartment(row);
});

/// The building pin on an apartment's detail screen (web: ApartmentLocation).
class ApartmentLocationCard extends ConsumerWidget {
  const ApartmentLocationCard({super.key, required this.apartment});
  final DbRow apartment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final id = apartment['id'] as String;
    final point = _savedPoint(apartment);
    final canEdit = ref.watch(_canEditProvider(id)).value ?? false;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (point != null)
            SizedBox(
              height: 200,
              child: BaseMap(
                interactive: false,
                initialCenter: point,
                initialZoom: 17,
                children: [_pin(point)],
              ),
            ),
          ListTile(
            leading: const Icon(Icons.location_on_outlined),
            title: Text(l.locationTitle),
            subtitle: Text(point == null ? l.noLocation : l.savedCoordinates(
                point.latitude.toStringAsFixed(6), point.longitude.toStringAsFixed(6))),
          ),
          OverflowBar(
            alignment: MainAxisAlignment.end,
            children: [
              if (point != null)
                TextButton.icon(
                  icon: const Icon(Icons.directions),
                  label: Text(l.directions),
                  onPressed: () => launchUrl(googleMapsDirectionsUrl(point),
                      mode: LaunchMode.externalApplication),
                ),
              if (canEdit)
                FilledButton.icon(
                  icon: const Icon(Icons.edit_location_alt_outlined),
                  label: Text(point == null ? l.setLocation : l.editLocation),
                  onPressed: () => context.go('/apartments/$id/location'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Pick the building pin: search, tap the map, GPS, or typed coordinates.
/// Nothing is saved until "Save location", as on the web.
class ApartmentLocationScreen extends ConsumerStatefulWidget {
  const ApartmentLocationScreen({super.key, required this.apartmentId});
  final String apartmentId;

  @override
  ConsumerState<ApartmentLocationScreen> createState() => _ApartmentLocationScreenState();
}

class _ApartmentLocationScreenState extends ConsumerState<ApartmentLocationScreen> {
  final _map = MapController();
  final _lat = TextEditingController();
  final _lng = TextEditingController();
  final _search = TextEditingController();
  LatLng? _saved;
  bool _loaded = false;
  bool _locating = false;
  bool _searching = false;
  List<GeocodeResult> _results = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final row =
        await ref.read(repositoryProvider).property(PropertyKind.apartment, widget.apartmentId);
    _saved = row == null ? null : _savedPoint(row);
    if (_saved != null) _setDraft(_saved!, move: false);
    if (mounted) setState(() => _loaded = true);
  }

  LatLng? get _draft {
    final lat = double.tryParse(_lat.text.trim());
    final lng = double.tryParse(_lng.text.trim());
    // Range-check before building a LatLng, which asserts its own bounds.
    if (lat == null || lng == null || !lat.isFinite || !lng.isFinite) return null;
    if (lat.abs() > 90 || lng.abs() > 180) return null;
    return LatLng(lat, lng);
  }

  void _setDraft(LatLng point, {bool move = true}) {
    _lat.text = point.latitude.toStringAsFixed(6);
    _lng.text = point.longitude.toStringAsFixed(6);
    if (move) _map.move(point, _map.camera.zoom < 16 ? 17 : _map.camera.zoom);
    setState(() {});
  }

  /// A few seconds of fixes, averaged by accuracy, instead of one GPS reading.
  Future<void> _useGps() async {
    final l = context.l10n;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever ||
        !await Geolocator.isLocationServiceEnabled()) {
      if (mounted) showMessage(context, l.gpsUnavailable);
      return;
    }
    setState(() => _locating = true);
    final fixes = <GpsFix>[];
    try {
      await Geolocator.getPositionStream(
              locationSettings: const LocationSettings(accuracy: LocationAccuracy.best))
          .map((p) => GpsFix(LatLng(p.latitude, p.longitude), p.accuracy, p.timestamp))
          .take(8)
          .timeout(const Duration(seconds: 12), onTimeout: (sink) => sink.close())
          .forEach(fixes.add);
    } catch (_) {
      // Fall through with whatever fixes arrived.
    }
    if (!mounted) return;
    setState(() => _locating = false);
    final good = goodFixes(fixes).toList();
    // Indoors, accept the best fix rather than nothing.
    final point = averageFixes(good.isNotEmpty
        ? good
        : (fixes..sort((a, b) => a.accuracyM.compareTo(b.accuracyM))).take(1));
    if (point == null) return showMessage(context, l.gpsUnavailable);
    _setDraft(point);
  }

  Future<void> _runSearch() async {
    setState(() => _searching = true);
    try {
      final results = await searchPlaces(_search.text);
      if (mounted) setState(() => _results = results);
    } catch (_) {
      if (mounted) showMessage(context, context.l10n.searchFailed);
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _save(LatLng? point) async {
    await ref.read(repositoryProvider).saveApartmentLocation(widget.apartmentId, point);
    if (!mounted) return;
    showMessage(context, context.l10n.locationSaved);
    context.go('/apartments/${widget.apartmentId}');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final draft = _draft;
    return Scaffold(
      appBar: AppBar(title: Text(l.locationTitle)),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: TextField(
                    controller: _search,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _runSearch(),
                    decoration: InputDecoration(
                      labelText: l.searchPlace,
                      hintText: l.searchPlaceholder,
                      suffixIcon: _searching
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox.square(
                                  dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          : IconButton(icon: const Icon(Icons.search), onPressed: _runSearch),
                    ),
                  ),
                ),
                if (_results.isNotEmpty)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 180),
                    child: ListView(shrinkWrap: true, children: [
                      for (final r in _results)
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.place_outlined),
                          title: Text(r.label),
                          onTap: () {
                            setState(() => _results = const []);
                            _setDraft(r.center);
                          },
                        ),
                    ]),
                  ),
                Expanded(
                  child: BaseMap(
                    controller: _map,
                    initialCenter: draft ?? bangladeshCenter,
                    initialZoom: draft == null ? 7 : 17,
                    onTap: _locating ? null : _setDraft,
                    children: [if (draft != null) _pin(draft)],
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(l.locationHintMobile, style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(height: 8),
                        Row(children: [
                          Expanded(
                            child: TextField(
                              controller: _lat,
                              keyboardType: const TextInputType.numberWithOptions(
                                  decimal: true, signed: true),
                              decoration: InputDecoration(labelText: l.latitude),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _lng,
                              keyboardType: const TextInputType.numberWithOptions(
                                  decimal: true, signed: true),
                              decoration: InputDecoration(labelText: l.longitude),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                        ]),
                        if (_lat.text.isNotEmpty && _lng.text.isNotEmpty && draft == null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(l.invalidCoordinates,
                                style: TextStyle(color: Theme.of(context).colorScheme.error)),
                          ),
                        const SizedBox(height: 8),
                        Wrap(spacing: 8, runSpacing: 8, children: [
                          OutlinedButton.icon(
                            onPressed: _locating ? null : _useGps,
                            icon: const Icon(Icons.my_location),
                            label: Text(_locating ? l.locating : l.useGps),
                          ),
                          FilledButton(
                            onPressed: draft == null || _locating ? null : () => _save(draft),
                            child: Text(l.saveLocation),
                          ),
                          if (_saved != null)
                            TextButton(
                              onPressed: _locating ? null : () => _save(null),
                              child: Text(l.removeLocation),
                            ),
                        ]),
                        if (draft != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(_coords(draft), style: Theme.of(context).textTheme.bodySmall),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
