import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

import 'data/repository.dart';
import 'geo/units.dart';

/// Square metres per unit for every area unit code the app reads or writes.
/// Codes are stored as-is in dolil/actual/size unit columns (shared with the
/// web), so an existing code must never change meaning. Units whose size
/// differs by region (e.g. the Indian bigha) are left out rather than
/// guessed; `bigha`/`katha`/`kani`/`gonda` are the Bangladesh values.
const areaUnitSqMeters = <String, double>{
  'sqmeter': 1,
  'sqm': 1,
  'sq_meters': 1,
  'sqft': 0.09290304,
  'sq_ft': 0.09290304,
  'sq_yard': 0.83612736,
  'acre': 4046.8564224,
  'hectare': 10000,
  'are': 100,
  'sq_km': 1e6,
  'sq_mile': 2589988.110336,
  // Bangladesh (see units.dart).
  'decimal': sqMetersPerDecimal,
  'bigha': sqMetersPerDecimal * 33,
  'katha': sqMetersPerDecimal * 33 / 20,
  'kani': sqMetersPerDecimal * 40,
  'gonda': sqMetersPerDecimal * 2,
  // South Asia.
  'marla': 272.25 * 0.09290304, // Pakistan revenue marla (272.25 sq ft)
  'kanal': 20 * 272.25 * 0.09290304,
  'ropani': 508.737047, // Nepal: 74 × 74 ft
  'aana': 508.737047 / 16,
  'guntha': 4046.8564224 / 40,
  'cent': 4046.8564224 / 100,
  'perch': 4046.8564224 / 160, // Sri Lanka
  // East and Southeast Asia.
  'rai': 1600,
  'ngan': 400,
  'tsubo': 400 / 121, // Japan
  'pyeong': 400 / 121, // Korea
  'ping': 400 / 121, // Taiwan
  'mu': 10000 / 15, // China
  // Middle East and North Africa.
  'dunam': 1000,
  'feddan': 4200,
};

/// Language-neutral symbols; other units use their translated name.
const areaUnitSymbols = <String, String>{
  'sqmeter': 'm²',
  'sqm': 'm²',
  'sq_meters': 'm²',
  'sqft': 'ft²',
  'sq_ft': 'ft²',
  'sq_yard': 'yd²',
  'acre': 'ac',
  'hectare': 'ha',
  'sq_km': 'km²',
  'sq_mile': 'mi²',
};

double toSqMeters(double value, String unit) => value * areaUnitSqMeters[unit]!;
double fromSqMeters(double sqMeters, String unit) => sqMeters / areaUnitSqMeters[unit]!;

/// The three free-text address columns (upazila, district, division) are
/// shared with the web; only their labels follow the country.
typedef AddressLabels = (String local, String district, String region);

class CountryPreset {
  const CountryPreset(
    this.code,
    this.name, {
    required this.currency,
    required this.areaUnit,
    this.secondaryUnits = const [],
    required this.landUnits,
    this.sizeUnits = const ['sqmeter', 'sqft'],
    this.imperial = false,
    this.labels = ('locality', 'district', 'region'),
  });

  /// ISO 3166-1 alpha-2, or [otherCountry].
  final String code;
  final String name;

  /// ISO 4217; null means the device locale's currency.
  final String? currency;

  /// Unit for area totals, followed by [secondaryUnits] in smaller print.
  final String areaUnit;
  final List<String> secondaryUnits;

  /// Units offered for plot areas and apartment sizes.
  final List<String> landUnits;
  final List<String> sizeUnits;

  /// Feet instead of metres for lengths (GPS accuracy).
  final bool imperial;
  final AddressLabels labels;
}

const otherCountry = 'ZZ';

const _eu = ['sqmeter', 'are', 'hectare'];

const countryPresets = <CountryPreset>[
  CountryPreset('BD', 'Bangladesh',
      currency: 'BDT',
      areaUnit: 'decimal',
      secondaryUnits: ['bigha', 'acre'],
      landUnits: ['decimal', 'katha', 'bigha', 'kani', 'gonda', 'acre'],
      sizeUnits: ['sqft', 'sqmeter', 'katha', 'decimal'],
      labels: ('upazila', 'district', 'division')),
  CountryPreset('IN', 'India',
      currency: 'INR',
      areaUnit: 'acre',
      secondaryUnits: ['hectare'],
      landUnits: ['acre', 'guntha', 'cent', 'hectare', 'sq_yard', 'sqft'],
      sizeUnits: ['sqft', 'sq_yard', 'sqmeter'],
      labels: ('tehsil', 'district', 'state')),
  CountryPreset('PK', 'Pakistan',
      currency: 'PKR',
      areaUnit: 'kanal',
      secondaryUnits: ['marla', 'acre'],
      landUnits: ['marla', 'kanal', 'acre', 'sq_yard', 'sqft'],
      sizeUnits: ['sqft', 'sq_yard', 'marla'],
      labels: ('tehsil', 'district', 'province')),
  CountryPreset('NP', 'Nepal',
      currency: 'NPR',
      areaUnit: 'ropani',
      secondaryUnits: ['aana', 'sqmeter'],
      landUnits: ['ropani', 'aana', 'sqft'],
      sizeUnits: ['sqft', 'sqmeter', 'aana'],
      labels: ('municipality', 'district', 'province')),
  CountryPreset('LK', 'Sri Lanka',
      currency: 'LKR',
      areaUnit: 'perch',
      secondaryUnits: ['acre'],
      landUnits: ['perch', 'acre', 'hectare'],
      sizeUnits: ['sqft', 'sqmeter'],
      labels: ('locality', 'district', 'province')),
  CountryPreset('US', 'United States',
      currency: 'USD',
      areaUnit: 'acre',
      secondaryUnits: ['sqft'],
      landUnits: ['acre', 'sqft', 'sq_yard'],
      sizeUnits: ['sqft'],
      imperial: true,
      labels: ('city', 'county', 'state')),
  CountryPreset('GB', 'United Kingdom',
      currency: 'GBP',
      areaUnit: 'acre',
      secondaryUnits: ['hectare'],
      landUnits: ['acre', 'hectare', 'sqft', 'sqmeter'],
      sizeUnits: ['sqft', 'sqmeter'],
      imperial: true,
      labels: ('city', 'county', 'region')),
  CountryPreset('CA', 'Canada',
      currency: 'CAD',
      areaUnit: 'acre',
      secondaryUnits: ['hectare'],
      landUnits: ['acre', 'hectare', 'sqft', 'sqmeter'],
      sizeUnits: ['sqft', 'sqmeter'],
      labels: ('city', 'district', 'province')),
  CountryPreset('AU', 'Australia',
      currency: 'AUD',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: ['sqmeter', 'hectare', 'acre'],
      labels: ('locality', 'region', 'state')),
  CountryPreset('NZ', 'New Zealand',
      currency: 'NZD', areaUnit: 'sqmeter', secondaryUnits: ['hectare'], landUnits: _eu),
  CountryPreset('AE', 'United Arab Emirates',
      currency: 'AED',
      areaUnit: 'sqft',
      secondaryUnits: ['sqmeter'],
      landUnits: ['sqft', 'sqmeter'],
      sizeUnits: ['sqft', 'sqmeter'],
      labels: ('locality', 'city', 'emirate')),
  CountryPreset('SA', 'Saudi Arabia',
      currency: 'SAR',
      areaUnit: 'sqmeter',
      landUnits: ['sqmeter', 'hectare'],
      labels: ('locality', 'city', 'region')),
  CountryPreset('QA', 'Qatar',
      currency: 'QAR',
      areaUnit: 'sqmeter',
      secondaryUnits: ['sqft'],
      landUnits: ['sqmeter', 'sqft'],
      labels: ('locality', 'city', 'municipality')),
  CountryPreset('EG', 'Egypt',
      currency: 'EGP',
      areaUnit: 'sqmeter',
      secondaryUnits: ['feddan'],
      landUnits: ['sqmeter', 'feddan'],
      labels: ('city', 'district', 'governorate')),
  CountryPreset('JO', 'Jordan',
      currency: 'JOD',
      areaUnit: 'dunam',
      secondaryUnits: ['sqmeter'],
      landUnits: ['dunam', 'sqmeter'],
      labels: ('locality', 'district', 'governorate')),
  CountryPreset('MY', 'Malaysia',
      currency: 'MYR',
      areaUnit: 'sqft',
      secondaryUnits: ['acre'],
      landUnits: ['sqft', 'acre', 'hectare', 'sqmeter'],
      labels: ('locality', 'district', 'state')),
  CountryPreset('SG', 'Singapore',
      currency: 'SGD', areaUnit: 'sqft', secondaryUnits: ['sqmeter'], landUnits: ['sqft', 'sqmeter']),
  CountryPreset('ID', 'Indonesia',
      currency: 'IDR',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: ['sqmeter', 'are', 'hectare'],
      labels: ('locality', 'district', 'province')),
  CountryPreset('PH', 'Philippines',
      currency: 'PHP',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: ['sqmeter', 'hectare'],
      labels: ('locality', 'city', 'province')),
  CountryPreset('TH', 'Thailand',
      currency: 'THB',
      areaUnit: 'rai',
      secondaryUnits: ['ngan', 'sqmeter'],
      landUnits: ['rai', 'ngan', 'sqmeter'],
      labels: ('locality', 'district', 'province')),
  CountryPreset('VN', 'Vietnam',
      currency: 'VND',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: ['sqmeter', 'hectare'],
      labels: ('locality', 'district', 'province')),
  CountryPreset('JP', 'Japan',
      currency: 'JPY',
      areaUnit: 'tsubo',
      secondaryUnits: ['sqmeter'],
      landUnits: ['tsubo', 'sqmeter', 'hectare'],
      sizeUnits: ['sqmeter', 'tsubo'],
      labels: ('locality', 'municipality', 'prefecture')),
  CountryPreset('KR', 'South Korea',
      currency: 'KRW',
      areaUnit: 'pyeong',
      secondaryUnits: ['sqmeter'],
      landUnits: ['pyeong', 'sqmeter'],
      sizeUnits: ['sqmeter', 'pyeong'],
      labels: ('locality', 'district', 'province')),
  CountryPreset('TW', 'Taiwan',
      currency: 'TWD',
      areaUnit: 'ping',
      secondaryUnits: ['sqmeter'],
      landUnits: ['ping', 'sqmeter'],
      sizeUnits: ['ping', 'sqmeter'],
      labels: ('locality', 'district', 'county')),
  CountryPreset('CN', 'China',
      currency: 'CNY',
      areaUnit: 'mu',
      secondaryUnits: ['sqmeter'],
      landUnits: ['mu', 'sqmeter', 'hectare'],
      labels: ('locality', 'district', 'province')),
  CountryPreset('DE', 'Germany',
      currency: 'EUR',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: _eu,
      labels: ('city', 'district', 'state')),
  CountryPreset('FR', 'France',
      currency: 'EUR',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: _eu,
      labels: ('city', 'department', 'region')),
  CountryPreset('ES', 'Spain',
      currency: 'EUR',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: _eu,
      labels: ('city', 'province', 'region')),
  CountryPreset('IT', 'Italy',
      currency: 'EUR',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: _eu,
      labels: ('city', 'province', 'region')),
  CountryPreset('NL', 'Netherlands',
      currency: 'EUR',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: _eu,
      labels: ('city', 'municipality', 'province')),
  CountryPreset('NG', 'Nigeria',
      currency: 'NGN',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: ['sqmeter', 'hectare', 'acre'],
      labels: ('city', 'district', 'state')),
  CountryPreset('KE', 'Kenya',
      currency: 'KES',
      areaUnit: 'acre',
      secondaryUnits: ['hectare'],
      landUnits: ['acre', 'hectare', 'sqmeter'],
      labels: ('locality', 'district', 'county')),
  CountryPreset('ZA', 'South Africa',
      currency: 'ZAR',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: ['sqmeter', 'hectare'],
      labels: ('locality', 'municipality', 'province')),
  CountryPreset('BR', 'Brazil',
      currency: 'BRL',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: ['sqmeter', 'hectare'],
      labels: ('locality', 'municipality', 'state')),
  CountryPreset('MX', 'Mexico',
      currency: 'MXN',
      areaUnit: 'sqmeter',
      secondaryUnits: ['hectare'],
      landUnits: ['sqmeter', 'hectare'],
      labels: ('locality', 'municipality', 'state')),
];

const _otherPreset = CountryPreset(otherCountry, 'Other',
    currency: null,
    areaUnit: 'sqmeter',
    secondaryUnits: ['hectare'],
    landUnits: ['sqmeter', 'hectare', 'acre', 'sqft']);

CountryPreset presetFor(String? code) =>
    countryPresets.where((p) => p.code == code).firstOrNull ?? _otherPreset;

/// Units every country can also pick, after its own.
const _universalUnits = ['sqmeter', 'sqft', 'hectare', 'acre'];

/// The account's resolved region: profile overrides, else the country's
/// defaults. The country is the profile's, else the device's region.
class RegionSettings {
  RegionSettings._(this.preset, this.currency, this.areaUnit, this.imperial);

  factory RegionSettings.resolve({DbRow? profile, String? deviceCountry, String? deviceLocale}) {
    final preset = presetFor(profile?['country_code'] as String? ?? deviceCountry);
    final unit = profile?['area_unit'] as String?;
    final system = profile?['measurement_system'] as String?;
    return RegionSettings._(
      preset,
      profile?['currency_code'] as String? ??
          preset.currency ??
          NumberFormat.simpleCurrency(locale: deviceLocale).currencyName ??
          'USD',
      areaUnitSqMeters.containsKey(unit) ? unit! : preset.areaUnit,
      system == null ? preset.imperial : system == 'imperial',
    );
  }

  /// Today's behaviour; used where no region is in scope (tests).
  static final fallback = RegionSettings.resolve(deviceCountry: 'BD');

  final CountryPreset preset;
  final String currency;
  final String areaUnit;
  final bool imperial;

  AddressLabels get labels => preset.labels;

  /// [areaUnit] then the country's other totals units.
  List<String> get totalUnits =>
      [areaUnit, ...preset.secondaryUnits.where((u) => u != areaUnit)];

  /// Choices for a unit field: the country's, then universal ones, plus
  /// [current] so editing never drops a unit saved elsewhere.
  List<String> unitChoices({required bool land, String? current}) => {
        ...(land ? preset.landUnits : preset.sizeUnits),
        ..._universalUnits,
        if (current != null && current.isNotEmpty) current,
      }.toList();
}

/// Makes the resolved region available to formatting helpers below the app.
class RegionScope extends InheritedWidget {
  const RegionScope({super.key, required this.region, required super.child});
  final RegionSettings region;

  static RegionSettings of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<RegionScope>()?.region ??
      RegionSettings.fallback;

  @override
  bool updateShouldNotify(RegionScope oldWidget) => region != oldWidget.region;
}
