// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Landlord';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navPlots => 'Plots';

  @override
  String get navApartments => 'Apartments';

  @override
  String get navSettings => 'Settings';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get fullName => 'Full name';

  @override
  String get logIn => 'Log in';

  @override
  String get signUp => 'Sign up';

  @override
  String get noAccount => 'Don\'t have an account?';

  @override
  String get haveAccount => 'Already have an account?';

  @override
  String get continueWithGoogle => 'Continue with Google';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get resetEmailSent => 'Check your email for a reset link.';

  @override
  String get passwordTooShort => 'Password must be at least 10 characters.';

  @override
  String get checkEmailToConfirm =>
      'Check your email to confirm your account, then log in.';

  @override
  String get referralCode => 'Referral code (optional)';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get delete => 'Delete';

  @override
  String get edit => 'Edit';

  @override
  String get retry => 'Retry';

  @override
  String get required => 'Required';

  @override
  String get confirmDelete => 'Delete this permanently?';

  @override
  String get offlineBanner => 'Offline — showing saved data';

  @override
  String pendingChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count changes waiting to sync',
      one: '1 change waiting to sync',
    );
    return '$_temp0';
  }

  @override
  String syncRejected(String message) {
    return 'The server rejected a change: $message';
  }

  @override
  String errorMessage(String message) {
    return 'Something went wrong: $message';
  }

  @override
  String get totalPlots => 'Total plots';

  @override
  String get totalArea => 'Total area';

  @override
  String get totalPurchasePrice => 'Total purchase price';

  @override
  String get totalCurrentValue => 'Total current value';

  @override
  String get overdueRent => 'Overdue rent';

  @override
  String get upcomingRent => 'Due in 30 days';

  @override
  String get receivedThisMonth => 'Received this month';

  @override
  String decimalValue(String value) {
    return '$value decimal';
  }

  @override
  String areaSub(String bigha, String acre) {
    return '$bigha bigha · $acre acre';
  }

  @override
  String get addPlot => 'Add plot';

  @override
  String get addApartment => 'Add apartment';

  @override
  String get noPlots => 'No plots yet.';

  @override
  String get noApartments => 'No apartments yet.';

  @override
  String get field_name => 'Name';

  @override
  String get field_village => 'Village';

  @override
  String get field_upazila => 'Upazila';

  @override
  String get field_district => 'District';

  @override
  String get field_division => 'Division';

  @override
  String get field_mutationNumber => 'Mutation number';

  @override
  String get field_dolilArea => 'Area (per dolil)';

  @override
  String get field_actualArea => 'Area (actual)';

  @override
  String get field_purchasePrice => 'Purchase price (BDT)';

  @override
  String get field_purchaseDate => 'Purchase date';

  @override
  String get field_currentEstimatedValue => 'Current estimated value (BDT)';

  @override
  String get field_notes => 'Notes';

  @override
  String get field_buildingName => 'Building name';

  @override
  String get field_unitNumber => 'Unit number';

  @override
  String get field_floor => 'Floor';

  @override
  String get field_size => 'Size';

  @override
  String get unit => 'Unit';

  @override
  String get unit_decimal => 'Decimal';

  @override
  String get unit_katha => 'Katha';

  @override
  String get unit_bigha => 'Bigha';

  @override
  String get unit_acre => 'Acre';

  @override
  String get unit_sqft => 'Sq ft';

  @override
  String get unit_sqmeter => 'Sq meter';

  @override
  String get sensitiveLocked =>
      'Village, mutation number, prices and notes are encrypted. Unlock encryption in Settings to view or edit them.';

  @override
  String get willEncrypt =>
      'Sensitive fields will be encrypted on this device before upload.';

  @override
  String get encrypted => 'Encrypted';

  @override
  String get area => 'Area';

  @override
  String get directions => 'Directions';

  @override
  String get details => 'Details';

  @override
  String get notFound => 'Not found. It may have been deleted.';

  @override
  String get boundary => 'Boundary';

  @override
  String get noBoundary => 'No boundary yet.';

  @override
  String get captureBoundary => 'Capture boundary';

  @override
  String get redrawBoundary => 'Redraw boundary';

  @override
  String gpsAccuracy(String meters) {
    return 'GPS ±$meters m';
  }

  @override
  String get waitingForGps => 'Waiting for GPS…';

  @override
  String get gpsTooWeak => 'GPS signal too weak — move to open sky';

  @override
  String get markCorner => 'Mark corner here';

  @override
  String markingCorner(int count) {
    return 'Hold still… averaging $count fixes';
  }

  @override
  String cornerAdded(String meters) {
    return 'Corner added (±$meters m)';
  }

  @override
  String get autoTrace => 'Trace as I walk';

  @override
  String get boundaryHelp =>
      'Walk to each corner and tap \"Mark corner\", or turn on tracing and walk the edge. You can also tap the map to add points.';

  @override
  String get undo => 'Undo';

  @override
  String get clear => 'Clear';

  @override
  String get saveBoundary => 'Save boundary';

  @override
  String get needThreePoints => 'A boundary needs at least 3 points.';

  @override
  String get invalidPolygon =>
      'The boundary edges cross each other. Adjust the points.';

  @override
  String pointsAndArea(int count, String area) {
    return '$count points · ~$area decimal';
  }

  @override
  String get locationPermissionDenied =>
      'Location permission is needed to walk a boundary.';

  @override
  String get trackingNotificationTitle => 'Recording boundary';

  @override
  String get trackingNotificationText =>
      'Landlord is using GPS while you walk the plot.';

  @override
  String get satellite => 'Satellite';

  @override
  String get streets => 'Streets';

  @override
  String get documents => 'Documents';

  @override
  String get noDocuments => 'No documents yet.';

  @override
  String get scanDocument => 'Scan';

  @override
  String get pickPdf => 'Upload PDF';

  @override
  String get uploading => 'Uploading…';

  @override
  String get uploaded => 'Uploaded.';

  @override
  String get documentsNeedConnection =>
      'Documents need an internet connection.';

  @override
  String get documentLocked =>
      'This document is encrypted. Unlock encryption in Settings to open it.';

  @override
  String get docError_onlyPdf => 'Only PDF files are allowed.';

  @override
  String get docError_choosePdf => 'Choose a PDF file.';

  @override
  String get docError_fileTooLarge => 'File is larger than 20 MB.';

  @override
  String get docError_invalidPdfContent => 'This file isn\'t a valid PDF.';

  @override
  String get leases => 'Leases';

  @override
  String get addLease => 'Add lease';

  @override
  String get editLease => 'Edit lease';

  @override
  String get noLeases => 'No leases yet.';

  @override
  String get tenantName => 'Tenant name';

  @override
  String get tenantPhone => 'Tenant phone';

  @override
  String get tenantEmail => 'Tenant email';

  @override
  String get rentAmount => 'Rent amount (BDT)';

  @override
  String get frequency => 'Payment cycle';

  @override
  String get frequency_monthly => 'Monthly';

  @override
  String get frequency_quarterly => 'Quarterly';

  @override
  String get frequency_yearly => 'Yearly';

  @override
  String get startDate => 'Start date';

  @override
  String get endDate => 'End date';

  @override
  String get endDateHint => 'Leave empty for an ongoing lease.';

  @override
  String get status_active => 'Active';

  @override
  String get status_ended => 'Ended';

  @override
  String get endLease => 'End lease';

  @override
  String get payments => 'Payments';

  @override
  String get paymentsAfterSync => 'Payment schedule appears once synced.';

  @override
  String get markPaid => 'Mark paid';

  @override
  String paidOn(String date) {
    return 'Paid $date';
  }

  @override
  String dueOn(String date) {
    return 'Due $date';
  }

  @override
  String get overdue => 'Overdue';

  @override
  String get settings => 'Settings';

  @override
  String get language => 'Language';

  @override
  String get encryption => 'Encryption';

  @override
  String get encryptionNotSetUp =>
      'Encryption isn\'t set up. Set it up from your profile on the web app; it will then unlock here too.';

  @override
  String get passphrase => 'Passphrase';

  @override
  String get recoveryCode => 'Recovery code';

  @override
  String get useRecoveryCode => 'Use recovery code instead';

  @override
  String get unlock => 'Unlock';

  @override
  String get lock => 'Lock';

  @override
  String get unlockedNotice =>
      'Unlocked. Sensitive data is encrypted on this device before it leaves it.';

  @override
  String get lockedNotice =>
      'Encryption is on but locked. Enter your passphrase to view or edit sensitive data.';

  @override
  String get wrongPassphrase => 'Wrong passphrase.';

  @override
  String get biometricLock => 'Biometric lock';

  @override
  String get biometricLockHint =>
      'Require fingerprint or face to open the app, and keep the encryption key in this device\'s secure keystore.';

  @override
  String get biometricUnavailable =>
      'No fingerprint or face unlock is set up on this device.';

  @override
  String get biometricReason => 'Unlock Landlord';

  @override
  String get appLocked => 'Landlord is locked';

  @override
  String get offlineMaps => 'Offline maps';

  @override
  String get offlineMapsHint =>
      'Download satellite imagery for an area so maps work without a connection in the field.';

  @override
  String get downloadVisibleArea => 'Download visible area';

  @override
  String downloadProgress(int done, int total) {
    return 'Downloading $done/$total';
  }

  @override
  String downloadDone(int count) {
    return 'Saved $count tiles for offline use.';
  }

  @override
  String areaTooLarge(int count) {
    return 'That area needs $count tiles, over the 3000 limit — zoom in first.';
  }

  @override
  String cacheSize(String size) {
    return 'Stored: $size MB';
  }

  @override
  String get clearCache => 'Clear offline maps';

  @override
  String get notifications => 'Rent reminders';

  @override
  String get notificationsHint =>
      'Get notified on this phone when rent is due or a lease is about to expire.';

  @override
  String get notificationsUnavailable =>
      'Push notifications aren\'t configured in this build.';

  @override
  String get signOut => 'Sign out';

  @override
  String get expenses => 'Expenses';

  @override
  String get addExpense => 'Add expense';

  @override
  String get noExpenses => 'No expenses yet.';

  @override
  String expensesTotal(String amount) {
    return 'Total: $amount';
  }

  @override
  String get category => 'Category';

  @override
  String get category_tax => 'Tax';

  @override
  String get category_insurance => 'Insurance';

  @override
  String get category_utility => 'Utility';

  @override
  String get category_repair => 'Repair';

  @override
  String get category_management_fee => 'Management fee';

  @override
  String get category_other => 'Other';

  @override
  String get amount => 'Amount (BDT)';

  @override
  String get expenseDate => 'Expense date';

  @override
  String get maintenance => 'Maintenance';

  @override
  String get addMaintenanceRequest => 'Add request';

  @override
  String get noMaintenance => 'No maintenance requests yet.';

  @override
  String get maintenanceTitle => 'Title';

  @override
  String get maintenanceDescription => 'Description';

  @override
  String get cost => 'Cost (BDT)';

  @override
  String get reportedDate => 'Reported date';

  @override
  String reportedOn(String date) {
    return 'Reported $date';
  }

  @override
  String get maintenanceStatus_open => 'Open';

  @override
  String get maintenanceStatus_in_progress => 'In progress';

  @override
  String get maintenanceStatus_resolved => 'Resolved';

  @override
  String get markInProgress => 'Mark in progress';

  @override
  String get markResolved => 'Mark resolved';

  @override
  String get reopen => 'Reopen';

  @override
  String get vendors => 'Vendors';

  @override
  String get addVendor => 'Add vendor';

  @override
  String get editVendor => 'Edit vendor';

  @override
  String get noVendors => 'No vendors yet.';

  @override
  String get vendorsHint =>
      'Plumbers, electricians and other contacts you can assign to maintenance requests.';

  @override
  String get manageVendors => 'Manage vendors';

  @override
  String get vendorTrade => 'Trade';

  @override
  String get vendorTradeHint => 'e.g. Plumber, Electrician';

  @override
  String get phone => 'Phone';

  @override
  String get call => 'Call';

  @override
  String get vendor => 'Vendor';

  @override
  String get noVendor => 'No vendor';
}
