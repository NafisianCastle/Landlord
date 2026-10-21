import 'package:flutter/widgets.dart';

import '../l10n/app_localizations.dart';
import 'validation/documents.dart';

export '../l10n/app_localizations.dart';

extension L10nContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}

/// Lookups for labels chosen at runtime (form field specs, enum values).
extension DynamicLabels on AppLocalizations {
  String field(String key) => switch (key) {
        'name' => field_name,
        'village' => field_village,
        'upazila' => field_upazila,
        'district' => field_district,
        'division' => field_division,
        'mutationNumber' => field_mutationNumber,
        'dolilArea' => field_dolilArea,
        'actualArea' => field_actualArea,
        'purchasePrice' => field_purchasePrice,
        'purchaseDate' => field_purchaseDate,
        'currentEstimatedValue' => field_currentEstimatedValue,
        'notes' => field_notes,
        'buildingName' => field_buildingName,
        'unitNumber' => field_unitNumber,
        'floor' => field_floor,
        'size' => field_size,
        _ => unit,
      };

  String areaUnit(String unit) => switch (unit) {
        'decimal' => unit_decimal,
        'katha' => unit_katha,
        'bigha' => unit_bigha,
        'acre' => unit_acre,
        'sqft' => unit_sqft,
        'sqmeter' => unit_sqmeter,
        _ => unit,
      };

  String frequencyLabel(String value) => switch (value) {
        'quarterly' => frequency_quarterly,
        'yearly' => frequency_yearly,
        _ => frequency_monthly,
      };

  String statusLabel(String value) =>
      value == 'ended' ? status_ended : status_active;

  String documentError(DocumentError error) => switch (error) {
        DocumentError.onlyPdf => docError_onlyPdf,
        DocumentError.choosePdf => docError_choosePdf,
        DocumentError.fileTooLarge => docError_fileTooLarge,
        DocumentError.invalidPdfContent => docError_invalidPdfContent,
      };
}
