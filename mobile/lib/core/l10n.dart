import 'package:flutter/widgets.dart';

import '../l10n/app_localizations.dart';
import 'data/repository.dart';
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
        'kani' => unit_kani,
        'gonda' => unit_gonda,
        'acre' => unit_acre,
        'sqft' => unit_sqft,
        'sqmeter' => unit_sqmeter,
        'sq_yard' => unit_sq_yard,
        'hectare' => unit_hectare,
        'are' => unit_are,
        'sq_km' => unit_sq_km,
        'sq_mile' => unit_sq_mile,
        'marla' => unit_marla,
        'kanal' => unit_kanal,
        'ropani' => unit_ropani,
        'aana' => unit_aana,
        'guntha' => unit_guntha,
        'cent' => unit_cent,
        'perch' => unit_perch,
        'rai' => unit_rai,
        'ngan' => unit_ngan,
        'tsubo' => unit_tsubo,
        'pyeong' => unit_pyeong,
        'ping' => unit_ping,
        'mu' => unit_mu,
        'dunam' => unit_dunam,
        'feddan' => unit_feddan,
        'sqm' || 'sq_meters' => unit_sqmeter,
        'sq_ft' => unit_sqft,
        _ => unit,
      };

  /// Label for an address level code from a country preset.
  String addressLabel(String code) => switch (code) {
        'upazila' => field_upazila,
        'district' => field_district,
        'division' => field_division,
        'tehsil' => addr_tehsil,
        'city' => addr_city,
        'municipality' => addr_municipality,
        'locality' => addr_locality,
        'county' => addr_county,
        'state' => addr_state,
        'province' => addr_province,
        'region' => addr_region,
        'emirate' => addr_emirate,
        'governorate' => addr_governorate,
        'prefecture' => addr_prefecture,
        'department' => addr_department,
        _ => code,
      };

  String frequencyLabel(String value) => switch (value) {
        'quarterly' => frequency_quarterly,
        'yearly' => frequency_yearly,
        _ => frequency_monthly,
      };

  String statusLabel(String value) =>
      value == 'ended' ? status_ended : status_active;

  String expenseCategory(String value) => switch (value) {
        'tax' => category_tax,
        'insurance' => category_insurance,
        'utility' => category_utility,
        'repair' => category_repair,
        'management_fee' => category_management_fee,
        _ => category_other,
      };

  String maintenanceStatus(String value) => switch (value) {
        'in_progress' => maintenanceStatus_in_progress,
        'resolved' => maintenanceStatus_resolved,
        _ => maintenanceStatus_open,
      };

  String billStatusLabel(String value) => switch (value) {
        'paid' => billStatus_paid,
        'pending' => billStatus_pending,
        'overdue' => billStatus_overdue,
        _ => billStatus_unpaid,
      };

  String proofStatusLabel(String value) => switch (value) {
        'approved' => proofStatus_approved,
        'rejected' => proofStatus_rejected,
        _ => proofStatus_pending,
      };

  String actionError(ActionError error) => switch (error) {
        ActionError.notFound => billError_notFound,
        ActionError.chooseFile => billError_chooseFile,
        ActionError.fileTooLarge => billError_fileTooLarge,
        ActionError.fileType => billError_fileType,
        ActionError.saveFailed => billError_saveFailed,
        ActionError.uploadFailed => billError_uploadFailed,
        ActionError.alreadyPending => billError_alreadyPending,
        ActionError.reviewFailed => billError_reviewFailed,
        ActionError.noAccountFound => billError_noAccountFound,
        ActionError.cannotInviteSelf => billError_cannotInviteSelf,
        ActionError.removeBroadAccess => billError_removeBroadAccess,
        ActionError.alreadyShared => billError_alreadyShared,
      };

  String documentError(DocumentError error) => switch (error) {
        DocumentError.onlyPdf => docError_onlyPdf,
        DocumentError.choosePdf => docError_choosePdf,
        DocumentError.fileTooLarge => docError_fileTooLarge,
        DocumentError.invalidPdfContent => docError_invalidPdfContent,
      };
}
