import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:landlord_mobile/core/geo/units.dart';
import 'package:landlord_mobile/core/l10n.dart';
import 'package:landlord_mobile/core/region.dart';
import 'package:landlord_mobile/core/validation/forms.dart';
import 'package:landlord_mobile/features/common.dart';

void main() {
  group('area units', () {
    test('existing Bangladesh codes keep their meaning', () {
      const a = AreaConversions(1000);
      expect(fromSqMeters(1000, 'decimal'), closeTo(a.decimal, 1e-9));
      expect(fromSqMeters(1000, 'bigha'), closeTo(a.bigha, 1e-9));
      expect(fromSqMeters(1000, 'katha'), closeTo(a.katha, 1e-9));
      expect(fromSqMeters(1000, 'kani'), closeTo(a.kani, 1e-9));
      expect(fromSqMeters(1000, 'gonda'), closeTo(a.gonda, 1e-9));
      expect(fromSqMeters(1000, 'acre'), closeTo(a.acre, 1e-9));
      expect(fromSqMeters(1000, 'sqft'), closeTo(a.sqFt, 1e-9));
    });

    test('national units convert as defined', () {
      expect(toSqMeters(1, 'hectare'), 10000);
      expect(toSqMeters(1, 'kanal'), closeTo(20 * toSqMeters(1, 'marla'), 1e-9));
      expect(toSqMeters(16, 'aana'), closeTo(toSqMeters(1, 'ropani'), 1e-9));
      expect(toSqMeters(4, 'ngan'), toSqMeters(1, 'rai'));
      expect(toSqMeters(1, 'tsubo'), closeTo(3.3058, 1e-4));
      expect(fromSqMeters(toSqMeters(2.5, 'feddan'), 'feddan'), closeTo(2.5, 1e-12));
    });

    test('every unit a preset offers is known and passes validation', () {
      for (final p in [...countryPresets, presetFor(null)]) {
        for (final u in [p.areaUnit, ...p.secondaryUnits, ...p.landUnits, ...p.sizeUnits]) {
          expect(areaUnitSqMeters, contains(u), reason: '${p.code}: $u');
          expect(
              validateFields(
                  {'actualAreaUnit': u}, {'actualAreaUnit': propertyRules['actualAreaUnit']!}),
              isNull,
              reason: '${p.code}: $u');
        }
      }
    });
  });

  group('RegionSettings.resolve', () {
    test('profile overrides win over the country, which wins over the device', () {
      final r = RegionSettings.resolve(
        profile: {
          'country_code': 'JP',
          'currency_code': 'USD',
          'area_unit': 'sqmeter',
          'measurement_system': 'imperial',
        },
        deviceCountry: 'BD',
      );
      expect(r.preset.code, 'JP');
      expect(r.currency, 'USD');
      expect(r.totalUnits, ['sqmeter']);
      expect(r.imperial, isTrue);
      expect(r.labels.$3, 'prefecture');
    });

    test('an unset profile follows the device, so Bangladesh users see no change', () {
      final r = RegionSettings.resolve(profile: {'country_code': null}, deviceCountry: 'BD');
      expect(r.currency, 'BDT');
      expect(r.totalUnits, ['decimal', 'bigha', 'acre']);
      expect(r.labels, ('upazila', 'district', 'division'));
      expect(r.imperial, isFalse);
    });

    test('an unlisted country falls back to metric with the locale currency', () {
      final r = RegionSettings.resolve(deviceCountry: 'CH', deviceLocale: 'de_CH');
      expect(r.preset.code, otherCountry);
      expect(r.totalUnits, ['sqmeter', 'hectare']);
      expect(r.currency, 'CHF');
    });

    test('an unknown saved area unit is ignored', () {
      final r = RegionSettings.resolve(profile: {'area_unit': 'furlong'}, deviceCountry: 'US');
      expect(r.areaUnit, 'acre');
    });

    test('unit choices keep a saved unit from another country', () {
      final us = RegionSettings.resolve(deviceCountry: 'US');
      final choices = us.unitChoices(land: true, current: 'bigha');
      expect(choices.first, 'acre');
      expect(choices, containsAll(['sqmeter', 'hectare', 'bigha']));
      expect(choices.toSet().length, choices.length);
    });
  });

  group('formatting', () {
    Future<Map<String, String>> render(WidgetTester tester, String country,
        {double sqMeters = 4046.8564224, num money = 1500, double meters = 3}) async {
      late Map<String, String> out;
      await tester.pumpWidget(MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: RegionScope(
          region: RegionSettings.resolve(deviceCountry: country),
          child: Builder(builder: (context) {
            final area = formatArea(context, sqMeters);
            out = {
              'money': formatMoney(context, money),
              'area': area.main,
              'sub': area.sub,
              'length': formatLength(context, meters),
            };
            return const SizedBox();
          }),
        ),
      ));
      return out;
    }

    testWidgets('Bangladesh keeps taka and decimal/bigha/acre', (tester) async {
      final r = await render(tester, 'BD');
      expect(r['money'], '৳1,500');
      expect(r['area'], '100.00 Decimal');
      expect(r['sub'], '3.03 Bigha · 1.00 ac');
      expect(r['length'], '3.0 m');
    });

    testWidgets('United States uses dollars, acres and feet', (tester) async {
      final r = await render(tester, 'US', money: 1250.5);
      expect(r['money'], r'$1,250.50');
      expect(r['area'], '1.00 ac');
      expect(r['sub'], '43,560.00 ft²');
      expect(r['length'], '9.8 ft');
    });

    testWidgets('Japan uses yen and tsubo', (tester) async {
      final r = await render(tester, 'JP', sqMeters: 330.578512);
      expect(r['money'], '¥1,500');
      expect(r['area'], '100.00 Tsubo');
      expect(r['sub'], '330.58 m²');
    });
  });
}
