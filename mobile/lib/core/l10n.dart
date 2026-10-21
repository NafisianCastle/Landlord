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

  String billError(BillError error) => switch (error) {
        BillError.notFound => billError_notFound,
        BillError.chooseFile => billError_chooseFile,
        BillError.fileTooLarge => billError_fileTooLarge,
        BillError.fileType => billError_fileType,
        BillError.saveFailed => billError_saveFailed,
        BillError.uploadFailed => billError_uploadFailed,
        BillError.alreadyPending => billError_alreadyPending,
        BillError.reviewFailed => billError_reviewFailed,
        BillError.noAccountFound => billError_noAccountFound,
        BillError.cannotInviteSelf => billError_cannotInviteSelf,
        BillError.removeBroadAccess => billError_removeBroadAccess,
        BillError.alreadyShared => billError_alreadyShared,
      };

  String documentError(DocumentError error) => switch (error) {
        DocumentError.onlyPdf => docError_onlyPdf,
        DocumentError.choosePdf => docError_choosePdf,
        DocumentError.fileTooLarge => docError_fileTooLarge,
        DocumentError.invalidPdfContent => docError_invalidPdfContent,
      };
}
