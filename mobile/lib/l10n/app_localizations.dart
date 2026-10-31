import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_bn.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('bn'),
    Locale('en'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Landlord'**
  String get appTitle;

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// No description provided for @navPlots.
  ///
  /// In en, this message translates to:
  /// **'Plots'**
  String get navPlots;

  /// No description provided for @navApartments.
  ///
  /// In en, this message translates to:
  /// **'Apartments'**
  String get navApartments;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get fullName;

  /// No description provided for @logIn.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get logIn;

  /// No description provided for @signUp.
  ///
  /// In en, this message translates to:
  /// **'Sign up'**
  String get signUp;

  /// No description provided for @noAccount.
  ///
  /// In en, this message translates to:
  /// **'Don\'t have an account?'**
  String get noAccount;

  /// No description provided for @haveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get haveAccount;

  /// No description provided for @continueWithGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get continueWithGoogle;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPassword;

  /// No description provided for @resetEmailSent.
  ///
  /// In en, this message translates to:
  /// **'Check your email for a reset link.'**
  String get resetEmailSent;

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 10 characters.'**
  String get passwordTooShort;

  /// No description provided for @checkEmailToConfirm.
  ///
  /// In en, this message translates to:
  /// **'Check your email to confirm your account, then log in.'**
  String get checkEmailToConfirm;

  /// No description provided for @referralCode.
  ///
  /// In en, this message translates to:
  /// **'Referral code (optional)'**
  String get referralCode;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get required;

  /// No description provided for @confirmDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete this permanently?'**
  String get confirmDelete;

  /// No description provided for @offlineBanner.
  ///
  /// In en, this message translates to:
  /// **'Offline — showing saved data'**
  String get offlineBanner;

  /// No description provided for @pendingChanges.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 change waiting to sync} other{{count} changes waiting to sync}}'**
  String pendingChanges(int count);

  /// No description provided for @syncRejected.
  ///
  /// In en, this message translates to:
  /// **'The server rejected a change: {message}'**
  String syncRejected(String message);

  /// No description provided for @errorMessage.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong: {message}'**
  String errorMessage(String message);

  /// No description provided for @totalPlots.
  ///
  /// In en, this message translates to:
  /// **'Total plots'**
  String get totalPlots;

  /// No description provided for @totalArea.
  ///
  /// In en, this message translates to:
  /// **'Total area'**
  String get totalArea;

  /// No description provided for @totalPurchasePrice.
  ///
  /// In en, this message translates to:
  /// **'Total purchase price'**
  String get totalPurchasePrice;

  /// No description provided for @totalCurrentValue.
  ///
  /// In en, this message translates to:
  /// **'Total current value'**
  String get totalCurrentValue;

  /// No description provided for @overdueRent.
  ///
  /// In en, this message translates to:
  /// **'Overdue rent'**
  String get overdueRent;

  /// No description provided for @upcomingRent.
  ///
  /// In en, this message translates to:
  /// **'Due in 30 days'**
  String get upcomingRent;

  /// No description provided for @receivedThisMonth.
  ///
  /// In en, this message translates to:
  /// **'Received this month'**
  String get receivedThisMonth;

  /// No description provided for @addPlot.
  ///
  /// In en, this message translates to:
  /// **'Add plot'**
  String get addPlot;

  /// No description provided for @addApartment.
  ///
  /// In en, this message translates to:
  /// **'Add apartment'**
  String get addApartment;

  /// No description provided for @noPlots.
  ///
  /// In en, this message translates to:
  /// **'No plots yet.'**
  String get noPlots;

  /// No description provided for @noApartments.
  ///
  /// In en, this message translates to:
  /// **'No apartments yet.'**
  String get noApartments;

  /// No description provided for @field_name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get field_name;

  /// No description provided for @field_village.
  ///
  /// In en, this message translates to:
  /// **'Village'**
  String get field_village;

  /// No description provided for @field_upazila.
  ///
  /// In en, this message translates to:
  /// **'Upazila'**
  String get field_upazila;

  /// No description provided for @field_district.
  ///
  /// In en, this message translates to:
  /// **'District'**
  String get field_district;

  /// No description provided for @field_division.
  ///
  /// In en, this message translates to:
  /// **'Division'**
  String get field_division;

  /// No description provided for @field_mutationNumber.
  ///
  /// In en, this message translates to:
  /// **'Mutation number'**
  String get field_mutationNumber;

  /// No description provided for @field_dolilArea.
  ///
  /// In en, this message translates to:
  /// **'Area (per dolil)'**
  String get field_dolilArea;

  /// No description provided for @field_actualArea.
  ///
  /// In en, this message translates to:
  /// **'Area (actual)'**
  String get field_actualArea;

  /// No description provided for @field_purchasePrice.
  ///
  /// In en, this message translates to:
  /// **'Purchase price (BDT)'**
  String get field_purchasePrice;

  /// No description provided for @field_purchaseDate.
  ///
  /// In en, this message translates to:
  /// **'Purchase date'**
  String get field_purchaseDate;

  /// No description provided for @field_currentEstimatedValue.
  ///
  /// In en, this message translates to:
  /// **'Current estimated value (BDT)'**
  String get field_currentEstimatedValue;

  /// No description provided for @field_notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get field_notes;

  /// No description provided for @field_buildingName.
  ///
  /// In en, this message translates to:
  /// **'Building name'**
  String get field_buildingName;

  /// No description provided for @field_unitNumber.
  ///
  /// In en, this message translates to:
  /// **'Unit number'**
  String get field_unitNumber;

  /// No description provided for @field_floor.
  ///
  /// In en, this message translates to:
  /// **'Floor'**
  String get field_floor;

  /// No description provided for @field_size.
  ///
  /// In en, this message translates to:
  /// **'Size'**
  String get field_size;

  /// No description provided for @unit.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get unit;

  /// No description provided for @unit_decimal.
  ///
  /// In en, this message translates to:
  /// **'Decimal'**
  String get unit_decimal;

  /// No description provided for @unit_katha.
  ///
  /// In en, this message translates to:
  /// **'Katha'**
  String get unit_katha;

  /// No description provided for @unit_bigha.
  ///
  /// In en, this message translates to:
  /// **'Bigha'**
  String get unit_bigha;

  /// No description provided for @unit_acre.
  ///
  /// In en, this message translates to:
  /// **'Acre'**
  String get unit_acre;

  /// No description provided for @unit_sqft.
  ///
  /// In en, this message translates to:
  /// **'Sq ft'**
  String get unit_sqft;

  /// No description provided for @unit_sqmeter.
  ///
  /// In en, this message translates to:
  /// **'Sq meter'**
  String get unit_sqmeter;

  /// No description provided for @sensitiveLocked.
  ///
  /// In en, this message translates to:
  /// **'Village, mutation number, prices and notes are encrypted. Unlock encryption in Settings to view or edit them.'**
  String get sensitiveLocked;

  /// No description provided for @willEncrypt.
  ///
  /// In en, this message translates to:
  /// **'Sensitive fields will be encrypted on this device before upload.'**
  String get willEncrypt;

  /// No description provided for @encrypted.
  ///
  /// In en, this message translates to:
  /// **'Encrypted'**
  String get encrypted;

  /// No description provided for @area.
  ///
  /// In en, this message translates to:
  /// **'Area'**
  String get area;

  /// No description provided for @directions.
  ///
  /// In en, this message translates to:
  /// **'Directions'**
  String get directions;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get details;

  /// No description provided for @notFound.
  ///
  /// In en, this message translates to:
  /// **'Not found. It may have been deleted.'**
  String get notFound;

  /// No description provided for @boundary.
  ///
  /// In en, this message translates to:
  /// **'Boundary'**
  String get boundary;

  /// No description provided for @noBoundary.
  ///
  /// In en, this message translates to:
  /// **'No boundary yet.'**
  String get noBoundary;

  /// No description provided for @captureBoundary.
  ///
  /// In en, this message translates to:
  /// **'Capture boundary'**
  String get captureBoundary;

  /// No description provided for @redrawBoundary.
  ///
  /// In en, this message translates to:
  /// **'Redraw boundary'**
  String get redrawBoundary;

  /// No description provided for @gpsAccuracy.
  ///
  /// In en, this message translates to:
  /// **'GPS ±{distance}'**
  String gpsAccuracy(String distance);

  /// No description provided for @waitingForGps.
  ///
  /// In en, this message translates to:
  /// **'Waiting for GPS…'**
  String get waitingForGps;

  /// No description provided for @gpsTooWeak.
  ///
  /// In en, this message translates to:
  /// **'GPS signal too weak — move to open sky'**
  String get gpsTooWeak;

  /// No description provided for @markCorner.
  ///
  /// In en, this message translates to:
  /// **'Mark corner here'**
  String get markCorner;

  /// No description provided for @markingCorner.
  ///
  /// In en, this message translates to:
  /// **'Hold still… averaging {count} fixes'**
  String markingCorner(int count);

  /// No description provided for @cornerAdded.
  ///
  /// In en, this message translates to:
  /// **'Corner added (±{distance})'**
  String cornerAdded(String distance);

  /// No description provided for @autoTrace.
  ///
  /// In en, this message translates to:
  /// **'Trace as I walk'**
  String get autoTrace;

  /// No description provided for @boundaryHelp.
  ///
  /// In en, this message translates to:
  /// **'Walk to each corner and tap \"Mark corner\", or turn on tracing and walk the edge. You can also tap the map to add points.'**
  String get boundaryHelp;

  /// No description provided for @undo.
  ///
  /// In en, this message translates to:
  /// **'Undo'**
  String get undo;

  /// No description provided for @clear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clear;

  /// No description provided for @saveBoundary.
  ///
  /// In en, this message translates to:
  /// **'Save boundary'**
  String get saveBoundary;

  /// No description provided for @needThreePoints.
  ///
  /// In en, this message translates to:
  /// **'A boundary needs at least 3 points.'**
  String get needThreePoints;

  /// No description provided for @invalidPolygon.
  ///
  /// In en, this message translates to:
  /// **'The boundary edges cross each other. Adjust the points.'**
  String get invalidPolygon;

  /// No description provided for @pointsAndArea.
  ///
  /// In en, this message translates to:
  /// **'{count} points · ~{area}'**
  String pointsAndArea(int count, String area);

  /// No description provided for @locationPermissionDenied.
  ///
  /// In en, this message translates to:
  /// **'Location permission is needed to walk a boundary.'**
  String get locationPermissionDenied;

  /// No description provided for @trackingNotificationTitle.
  ///
  /// In en, this message translates to:
  /// **'Recording boundary'**
  String get trackingNotificationTitle;

  /// No description provided for @trackingNotificationText.
  ///
  /// In en, this message translates to:
  /// **'Landlord is using GPS while you walk the plot.'**
  String get trackingNotificationText;

  /// No description provided for @satellite.
  ///
  /// In en, this message translates to:
  /// **'Satellite'**
  String get satellite;

  /// No description provided for @streets.
  ///
  /// In en, this message translates to:
  /// **'Streets'**
  String get streets;

  /// No description provided for @documents.
  ///
  /// In en, this message translates to:
  /// **'Documents'**
  String get documents;

  /// No description provided for @noDocuments.
  ///
  /// In en, this message translates to:
  /// **'No documents yet.'**
  String get noDocuments;

  /// No description provided for @scanDocument.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get scanDocument;

  /// No description provided for @pickPdf.
  ///
  /// In en, this message translates to:
  /// **'Upload PDF'**
  String get pickPdf;

  /// No description provided for @uploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading…'**
  String get uploading;

  /// No description provided for @uploaded.
  ///
  /// In en, this message translates to:
  /// **'Uploaded.'**
  String get uploaded;

  /// No description provided for @documentsNeedConnection.
  ///
  /// In en, this message translates to:
  /// **'Documents need an internet connection.'**
  String get documentsNeedConnection;

  /// No description provided for @documentLocked.
  ///
  /// In en, this message translates to:
  /// **'This document is encrypted. Unlock encryption in Settings to open it.'**
  String get documentLocked;

  /// No description provided for @docError_onlyPdf.
  ///
  /// In en, this message translates to:
  /// **'Only PDF files are allowed.'**
  String get docError_onlyPdf;

  /// No description provided for @docError_choosePdf.
  ///
  /// In en, this message translates to:
  /// **'Choose a PDF file.'**
  String get docError_choosePdf;

  /// No description provided for @docError_fileTooLarge.
  ///
  /// In en, this message translates to:
  /// **'File is larger than 20 MB.'**
  String get docError_fileTooLarge;

  /// No description provided for @docError_invalidPdfContent.
  ///
  /// In en, this message translates to:
  /// **'This file isn\'t a valid PDF.'**
  String get docError_invalidPdfContent;

  /// No description provided for @leases.
  ///
  /// In en, this message translates to:
  /// **'Leases'**
  String get leases;

  /// No description provided for @addLease.
  ///
  /// In en, this message translates to:
  /// **'Add lease'**
  String get addLease;

  /// No description provided for @editLease.
  ///
  /// In en, this message translates to:
  /// **'Edit lease'**
  String get editLease;

  /// No description provided for @noLeases.
  ///
  /// In en, this message translates to:
  /// **'No leases yet.'**
  String get noLeases;

  /// No description provided for @tenantName.
  ///
  /// In en, this message translates to:
  /// **'Tenant name'**
  String get tenantName;

  /// No description provided for @tenantPhone.
  ///
  /// In en, this message translates to:
  /// **'Tenant phone'**
  String get tenantPhone;

  /// No description provided for @tenantEmail.
  ///
  /// In en, this message translates to:
  /// **'Tenant email'**
  String get tenantEmail;

  /// No description provided for @rentAmount.
  ///
  /// In en, this message translates to:
  /// **'Rent amount (BDT)'**
  String get rentAmount;

  /// No description provided for @frequency.
  ///
  /// In en, this message translates to:
  /// **'Payment cycle'**
  String get frequency;

  /// No description provided for @frequency_monthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get frequency_monthly;

  /// No description provided for @frequency_quarterly.
  ///
  /// In en, this message translates to:
  /// **'Quarterly'**
  String get frequency_quarterly;

  /// No description provided for @frequency_yearly.
  ///
  /// In en, this message translates to:
  /// **'Yearly'**
  String get frequency_yearly;

  /// No description provided for @startDate.
  ///
  /// In en, this message translates to:
  /// **'Start date'**
  String get startDate;

  /// No description provided for @endDate.
  ///
  /// In en, this message translates to:
  /// **'End date'**
  String get endDate;

  /// No description provided for @endDateHint.
  ///
  /// In en, this message translates to:
  /// **'Leave empty for an ongoing lease.'**
  String get endDateHint;

  /// No description provided for @status_active.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get status_active;

  /// No description provided for @status_ended.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get status_ended;

  /// No description provided for @endLease.
  ///
  /// In en, this message translates to:
  /// **'End lease'**
  String get endLease;

  /// No description provided for @payments.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get payments;

  /// No description provided for @paymentsAfterSync.
  ///
  /// In en, this message translates to:
  /// **'Payment schedule appears once synced.'**
  String get paymentsAfterSync;

  /// No description provided for @markPaid.
  ///
  /// In en, this message translates to:
  /// **'Mark paid'**
  String get markPaid;

  /// No description provided for @paidOn.
  ///
  /// In en, this message translates to:
  /// **'Paid {date}'**
  String paidOn(String date);

  /// No description provided for @dueOn.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String dueOn(String date);

  /// No description provided for @overdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get overdue;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @encryption.
  ///
  /// In en, this message translates to:
  /// **'Encryption'**
  String get encryption;

  /// No description provided for @encryptionNotSetUp.
  ///
  /// In en, this message translates to:
  /// **'Encryption isn\'t set up. Set it up from your profile on the web app; it will then unlock here too.'**
  String get encryptionNotSetUp;

  /// No description provided for @passphrase.
  ///
  /// In en, this message translates to:
  /// **'Passphrase'**
  String get passphrase;

  /// No description provided for @recoveryCode.
  ///
  /// In en, this message translates to:
  /// **'Recovery code'**
  String get recoveryCode;

  /// No description provided for @useRecoveryCode.
  ///
  /// In en, this message translates to:
  /// **'Use recovery code instead'**
  String get useRecoveryCode;

  /// No description provided for @unlock.
  ///
  /// In en, this message translates to:
  /// **'Unlock'**
  String get unlock;

  /// No description provided for @lock.
  ///
  /// In en, this message translates to:
  /// **'Lock'**
  String get lock;

  /// No description provided for @unlockedNotice.
  ///
  /// In en, this message translates to:
  /// **'Unlocked. Sensitive data is encrypted on this device before it leaves it.'**
  String get unlockedNotice;

  /// No description provided for @lockedNotice.
  ///
  /// In en, this message translates to:
  /// **'Encryption is on but locked. Enter your passphrase to view or edit sensitive data.'**
  String get lockedNotice;

  /// No description provided for @wrongPassphrase.
  ///
  /// In en, this message translates to:
  /// **'Wrong passphrase.'**
  String get wrongPassphrase;

  /// No description provided for @biometricLock.
  ///
  /// In en, this message translates to:
  /// **'Biometric lock'**
  String get biometricLock;

  /// No description provided for @biometricLockHint.
  ///
  /// In en, this message translates to:
  /// **'Require fingerprint or face to open the app, and keep the encryption key in this device\'s secure keystore.'**
  String get biometricLockHint;

  /// No description provided for @biometricUnavailable.
  ///
  /// In en, this message translates to:
  /// **'No fingerprint or face unlock is set up on this device.'**
  String get biometricUnavailable;

  /// No description provided for @biometricReason.
  ///
  /// In en, this message translates to:
  /// **'Unlock Landlord'**
  String get biometricReason;

  /// No description provided for @appLocked.
  ///
  /// In en, this message translates to:
  /// **'Landlord is locked'**
  String get appLocked;

  /// No description provided for @offlineMaps.
  ///
  /// In en, this message translates to:
  /// **'Offline maps'**
  String get offlineMaps;

  /// No description provided for @offlineMapsHint.
  ///
  /// In en, this message translates to:
  /// **'Download satellite imagery for an area so maps work without a connection in the field.'**
  String get offlineMapsHint;

  /// No description provided for @downloadVisibleArea.
  ///
  /// In en, this message translates to:
  /// **'Download visible area'**
  String get downloadVisibleArea;

  /// No description provided for @downloadProgress.
  ///
  /// In en, this message translates to:
  /// **'Downloading {done}/{total}'**
  String downloadProgress(int done, int total);

  /// No description provided for @downloadDone.
  ///
  /// In en, this message translates to:
  /// **'Saved {count} tiles for offline use.'**
  String downloadDone(int count);

  /// No description provided for @areaTooLarge.
  ///
  /// In en, this message translates to:
  /// **'That area needs {count} tiles, over the 3000 limit — zoom in first.'**
  String areaTooLarge(int count);

  /// No description provided for @cacheSize.
  ///
  /// In en, this message translates to:
  /// **'Stored: {size} MB'**
  String cacheSize(String size);

  /// No description provided for @clearCache.
  ///
  /// In en, this message translates to:
  /// **'Clear offline maps'**
  String get clearCache;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Rent reminders'**
  String get notifications;

  /// No description provided for @notificationsHint.
  ///
  /// In en, this message translates to:
  /// **'Get notified on this phone when rent is due or a lease is about to expire.'**
  String get notificationsHint;

  /// No description provided for @notificationsUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Push notifications aren\'t configured in this build.'**
  String get notificationsUnavailable;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @expenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get expenses;

  /// No description provided for @addExpense.
  ///
  /// In en, this message translates to:
  /// **'Add expense'**
  String get addExpense;

  /// No description provided for @noExpenses.
  ///
  /// In en, this message translates to:
  /// **'No expenses yet.'**
  String get noExpenses;

  /// No description provided for @expensesTotal.
  ///
  /// In en, this message translates to:
  /// **'Total: {amount}'**
  String expensesTotal(String amount);

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @category_tax.
  ///
  /// In en, this message translates to:
  /// **'Tax'**
  String get category_tax;

  /// No description provided for @category_insurance.
  ///
  /// In en, this message translates to:
  /// **'Insurance'**
  String get category_insurance;

  /// No description provided for @category_utility.
  ///
  /// In en, this message translates to:
  /// **'Utility'**
  String get category_utility;

  /// No description provided for @category_repair.
  ///
  /// In en, this message translates to:
  /// **'Repair'**
  String get category_repair;

  /// No description provided for @category_management_fee.
  ///
  /// In en, this message translates to:
  /// **'Management fee'**
  String get category_management_fee;

  /// No description provided for @category_other.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get category_other;

  /// No description provided for @amount.
  ///
  /// In en, this message translates to:
  /// **'Amount (BDT)'**
  String get amount;

  /// No description provided for @expenseDate.
  ///
  /// In en, this message translates to:
  /// **'Expense date'**
  String get expenseDate;

  /// No description provided for @maintenance.
  ///
  /// In en, this message translates to:
  /// **'Maintenance'**
  String get maintenance;

  /// No description provided for @addMaintenanceRequest.
  ///
  /// In en, this message translates to:
  /// **'Add request'**
  String get addMaintenanceRequest;

  /// No description provided for @noMaintenance.
  ///
  /// In en, this message translates to:
  /// **'No maintenance requests yet.'**
  String get noMaintenance;

  /// No description provided for @maintenanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get maintenanceTitle;

  /// No description provided for @maintenanceDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get maintenanceDescription;

  /// No description provided for @cost.
  ///
  /// In en, this message translates to:
  /// **'Cost (BDT)'**
  String get cost;

  /// No description provided for @reportedDate.
  ///
  /// In en, this message translates to:
  /// **'Reported date'**
  String get reportedDate;

  /// No description provided for @reportedOn.
  ///
  /// In en, this message translates to:
  /// **'Reported {date}'**
  String reportedOn(String date);

  /// No description provided for @maintenanceStatus_open.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get maintenanceStatus_open;

  /// No description provided for @maintenanceStatus_in_progress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get maintenanceStatus_in_progress;

  /// No description provided for @maintenanceStatus_resolved.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get maintenanceStatus_resolved;

  /// No description provided for @markInProgress.
  ///
  /// In en, this message translates to:
  /// **'Mark in progress'**
  String get markInProgress;

  /// No description provided for @markResolved.
  ///
  /// In en, this message translates to:
  /// **'Mark resolved'**
  String get markResolved;

  /// No description provided for @reopen.
  ///
  /// In en, this message translates to:
  /// **'Reopen'**
  String get reopen;

  /// No description provided for @vendors.
  ///
  /// In en, this message translates to:
  /// **'Vendors'**
  String get vendors;

  /// No description provided for @addVendor.
  ///
  /// In en, this message translates to:
  /// **'Add vendor'**
  String get addVendor;

  /// No description provided for @editVendor.
  ///
  /// In en, this message translates to:
  /// **'Edit vendor'**
  String get editVendor;

  /// No description provided for @noVendors.
  ///
  /// In en, this message translates to:
  /// **'No vendors yet.'**
  String get noVendors;

  /// No description provided for @vendorsHint.
  ///
  /// In en, this message translates to:
  /// **'Plumbers, electricians and other contacts you can assign to maintenance requests.'**
  String get vendorsHint;

  /// No description provided for @manageVendors.
  ///
  /// In en, this message translates to:
  /// **'Manage vendors'**
  String get manageVendors;

  /// No description provided for @vendorTrade.
  ///
  /// In en, this message translates to:
  /// **'Trade'**
  String get vendorTrade;

  /// No description provided for @vendorTradeHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Plumber, Electrician'**
  String get vendorTradeHint;

  /// No description provided for @phone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phone;

  /// No description provided for @call.
  ///
  /// In en, this message translates to:
  /// **'Call'**
  String get call;

  /// No description provided for @vendor.
  ///
  /// In en, this message translates to:
  /// **'Vendor'**
  String get vendor;

  /// No description provided for @noVendor.
  ///
  /// In en, this message translates to:
  /// **'No vendor'**
  String get noVendor;

  /// No description provided for @navBills.
  ///
  /// In en, this message translates to:
  /// **'Bills'**
  String get navBills;

  /// No description provided for @bills.
  ///
  /// In en, this message translates to:
  /// **'Apartment bills'**
  String get bills;

  /// No description provided for @billsPortalHint.
  ///
  /// In en, this message translates to:
  /// **'Review bills, upload payment proof and see expenses your apartment owner has shared.'**
  String get billsPortalHint;

  /// No description provided for @billsOwnerHint.
  ///
  /// In en, this message translates to:
  /// **'Add a bill copy, amount and due date each month. Approve a tenant’s payment proof to mark the bill paid. Bill collections are separate from rent and expense totals.'**
  String get billsOwnerHint;

  /// No description provided for @billTitle.
  ///
  /// In en, this message translates to:
  /// **'Bill title'**
  String get billTitle;

  /// No description provided for @billTitlePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Electricity · October 2026'**
  String get billTitlePlaceholder;

  /// No description provided for @billTenant.
  ///
  /// In en, this message translates to:
  /// **'Tenant'**
  String get billTenant;

  /// No description provided for @billAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount (BDT)'**
  String get billAmount;

  /// No description provided for @billDueDate.
  ///
  /// In en, this message translates to:
  /// **'Due date'**
  String get billDueDate;

  /// No description provided for @billCopy.
  ///
  /// In en, this message translates to:
  /// **'Bill copy'**
  String get billCopy;

  /// No description provided for @paymentProof.
  ///
  /// In en, this message translates to:
  /// **'Payment proof'**
  String get paymentProof;

  /// No description provided for @billFileHint.
  ///
  /// In en, this message translates to:
  /// **'JPEG, PNG, WebP or PDF · up to 10 MB.'**
  String get billFileHint;

  /// No description provided for @billVisible.
  ///
  /// In en, this message translates to:
  /// **'Share this bill with the selected tenant'**
  String get billVisible;

  /// No description provided for @billInviteFirst.
  ///
  /// In en, this message translates to:
  /// **'Add a tenant above (Tenant — bills only), then create a bill. The tenant needs a Landlord account.'**
  String get billInviteFirst;

  /// No description provided for @createBill.
  ///
  /// In en, this message translates to:
  /// **'Add monthly bill'**
  String get createBill;

  /// No description provided for @submitProof.
  ///
  /// In en, this message translates to:
  /// **'Upload payment proof'**
  String get submitProof;

  /// No description provided for @billCreated.
  ///
  /// In en, this message translates to:
  /// **'Bill saved.'**
  String get billCreated;

  /// No description provided for @proofSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Proof submitted for owner review.'**
  String get proofSubmitted;

  /// No description provided for @billApprovalHint.
  ///
  /// In en, this message translates to:
  /// **'Uploading proof does not mark a bill paid. The owner will review and approve it.'**
  String get billApprovalHint;

  /// No description provided for @viewBill.
  ///
  /// In en, this message translates to:
  /// **'View bill copy'**
  String get viewBill;

  /// No description provided for @viewProof.
  ///
  /// In en, this message translates to:
  /// **'View payment proof'**
  String get viewProof;

  /// No description provided for @approveProof.
  ///
  /// In en, this message translates to:
  /// **'Approve & mark paid'**
  String get approveProof;

  /// No description provided for @rejectProof.
  ///
  /// In en, this message translates to:
  /// **'Reject proof'**
  String get rejectProof;

  /// No description provided for @rejectionReason.
  ///
  /// In en, this message translates to:
  /// **'Reason for rejection'**
  String get rejectionReason;

  /// No description provided for @reviewNote.
  ///
  /// In en, this message translates to:
  /// **'Owner’s review: {note}'**
  String reviewNote(String note);

  /// No description provided for @billDue.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String billDue(String date);

  /// No description provided for @billStatus_paid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get billStatus_paid;

  /// No description provided for @billStatus_pending.
  ///
  /// In en, this message translates to:
  /// **'Awaiting review'**
  String get billStatus_pending;

  /// No description provided for @billStatus_overdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get billStatus_overdue;

  /// No description provided for @billStatus_unpaid.
  ///
  /// In en, this message translates to:
  /// **'Unpaid'**
  String get billStatus_unpaid;

  /// No description provided for @proofStatus_pending.
  ///
  /// In en, this message translates to:
  /// **'Pending review'**
  String get proofStatus_pending;

  /// No description provided for @proofStatus_approved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get proofStatus_approved;

  /// No description provided for @proofStatus_rejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get proofStatus_rejected;

  /// No description provided for @billShared.
  ///
  /// In en, this message translates to:
  /// **'Visible to tenant'**
  String get billShared;

  /// No description provided for @billPrivate.
  ///
  /// In en, this message translates to:
  /// **'Private'**
  String get billPrivate;

  /// No description provided for @billHide.
  ///
  /// In en, this message translates to:
  /// **'Hide from tenant'**
  String get billHide;

  /// No description provided for @billShare.
  ///
  /// In en, this message translates to:
  /// **'Share with tenant'**
  String get billShare;

  /// No description provided for @billTenantRemoved.
  ///
  /// In en, this message translates to:
  /// **'Tenant access removed. Historical bill and proof remain available to you.'**
  String get billTenantRemoved;

  /// No description provided for @noBills.
  ///
  /// In en, this message translates to:
  /// **'No bills yet. Owners can add monthly bills from an apartment’s details.'**
  String get noBills;

  /// No description provided for @sharedExpenses.
  ///
  /// In en, this message translates to:
  /// **'Other shared expenses'**
  String get sharedExpenses;

  /// No description provided for @sharedExpensesHint.
  ///
  /// In en, this message translates to:
  /// **'These are for reference. A shared expense is not an additional bill to pay.'**
  String get sharedExpensesHint;

  /// No description provided for @noSharedExpenses.
  ///
  /// In en, this message translates to:
  /// **'Your owner has not shared any other expenses.'**
  String get noSharedExpenses;

  /// No description provided for @shareExpense.
  ///
  /// In en, this message translates to:
  /// **'Share with tenants'**
  String get shareExpense;

  /// No description provided for @hideExpense.
  ///
  /// In en, this message translates to:
  /// **'Make private'**
  String get hideExpense;

  /// No description provided for @expenseVisibilityHint.
  ///
  /// In en, this message translates to:
  /// **'Expenses are private by default. Sharing makes the amount, date, category and notes visible to all current tenants of this apartment.'**
  String get expenseVisibilityHint;

  /// No description provided for @reviewAlert.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one {{count} bill has payment proof awaiting your review.} other {{count} bills have payment proof awaiting your review.}}'**
  String reviewAlert(int count);

  /// No description provided for @dueAlert.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{You have {count} bill due soon or overdue.} other{You have {count} bills due soon or overdue.}}'**
  String dueAlert(int count);

  /// No description provided for @billError_notFound.
  ///
  /// In en, this message translates to:
  /// **'This bill or tenant is no longer available.'**
  String get billError_notFound;

  /// No description provided for @billError_chooseFile.
  ///
  /// In en, this message translates to:
  /// **'Choose a bill copy or payment proof.'**
  String get billError_chooseFile;

  /// No description provided for @billError_fileTooLarge.
  ///
  /// In en, this message translates to:
  /// **'The file must be 10 MB or smaller.'**
  String get billError_fileTooLarge;

  /// No description provided for @billError_fileType.
  ///
  /// In en, this message translates to:
  /// **'Choose a valid JPEG, PNG, WebP image or PDF.'**
  String get billError_fileType;

  /// No description provided for @billError_saveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not save. Please refresh and try again.'**
  String get billError_saveFailed;

  /// No description provided for @billError_uploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not upload the file. Please try again.'**
  String get billError_uploadFailed;

  /// No description provided for @billError_alreadyPending.
  ///
  /// In en, this message translates to:
  /// **'A payment proof is already awaiting review.'**
  String get billError_alreadyPending;

  /// No description provided for @billError_reviewFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not review this proof. It may have already been reviewed. Refresh and try again.'**
  String get billError_reviewFailed;

  /// No description provided for @billError_noAccountFound.
  ///
  /// In en, this message translates to:
  /// **'No Landlord account found for that email.'**
  String get billError_noAccountFound;

  /// No description provided for @billError_cannotInviteSelf.
  ///
  /// In en, this message translates to:
  /// **'You can\'t invite yourself.'**
  String get billError_cannotInviteSelf;

  /// No description provided for @billError_removeBroadAccess.
  ///
  /// In en, this message translates to:
  /// **'Remove this account’s Viewer or Editor access before inviting them as a tenant.'**
  String get billError_removeBroadAccess;

  /// No description provided for @billError_alreadyShared.
  ///
  /// In en, this message translates to:
  /// **'This property is already shared with that person.'**
  String get billError_alreadyShared;

  /// No description provided for @tenants.
  ///
  /// In en, this message translates to:
  /// **'Tenants'**
  String get tenants;

  /// No description provided for @inviteTenant.
  ///
  /// In en, this message translates to:
  /// **'Invite tenant'**
  String get inviteTenant;

  /// No description provided for @roleTenant.
  ///
  /// In en, this message translates to:
  /// **'Tenant — bills only'**
  String get roleTenant;

  /// No description provided for @tenantHelp.
  ///
  /// In en, this message translates to:
  /// **'Tenants open the Bills tab. They can see assigned bills and expenses you share, without ownership records or private documents. Viewer and Editor roles have broader access.'**
  String get tenantHelp;

  /// No description provided for @removeTenantConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove {email}? Their bill, proof and shared-expense access ends; history stays with you.'**
  String removeTenantConfirm(String email);

  /// No description provided for @remove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get remove;

  /// No description provided for @invite.
  ///
  /// In en, this message translates to:
  /// **'Invite'**
  String get invite;

  /// No description provided for @noTenants.
  ///
  /// In en, this message translates to:
  /// **'No tenants yet.'**
  String get noTenants;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get takePhoto;

  /// No description provided for @chooseFile.
  ///
  /// In en, this message translates to:
  /// **'Choose file'**
  String get chooseFile;

  /// No description provided for @locationTitle.
  ///
  /// In en, this message translates to:
  /// **'Apartment location'**
  String get locationTitle;

  /// No description provided for @locationHint.
  ///
  /// In en, this message translates to:
  /// **'Save a pin for the building. Search or tap the map, drag the pin, use GPS, or enter coordinates. Changes are saved only when you choose Save location.'**
  String get locationHint;

  /// No description provided for @locationViewHint.
  ///
  /// In en, this message translates to:
  /// **'The saved building location.'**
  String get locationViewHint;

  /// No description provided for @noLocation.
  ///
  /// In en, this message translates to:
  /// **'No location saved yet.'**
  String get noLocation;

  /// No description provided for @latitude.
  ///
  /// In en, this message translates to:
  /// **'Latitude'**
  String get latitude;

  /// No description provided for @longitude.
  ///
  /// In en, this message translates to:
  /// **'Longitude'**
  String get longitude;

  /// No description provided for @useGps.
  ///
  /// In en, this message translates to:
  /// **'Use my current location'**
  String get useGps;

  /// No description provided for @locating.
  ///
  /// In en, this message translates to:
  /// **'Finding your location…'**
  String get locating;

  /// No description provided for @saveLocation.
  ///
  /// In en, this message translates to:
  /// **'Save location'**
  String get saveLocation;

  /// No description provided for @removeLocation.
  ///
  /// In en, this message translates to:
  /// **'Remove location'**
  String get removeLocation;

  /// No description provided for @locationSaved.
  ///
  /// In en, this message translates to:
  /// **'Location saved.'**
  String get locationSaved;

  /// No description provided for @gpsUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Could not get your location. Check browser permission or choose a point manually.'**
  String get gpsUnavailable;

  /// No description provided for @invalidCoordinates.
  ///
  /// In en, this message translates to:
  /// **'Enter latitude between −90 and 90 and longitude between −180 and 180.'**
  String get invalidCoordinates;

  /// No description provided for @searchPlace.
  ///
  /// In en, this message translates to:
  /// **'Search for a place'**
  String get searchPlace;

  /// No description provided for @searchPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Area, address or building name'**
  String get searchPlaceholder;

  /// No description provided for @searching.
  ///
  /// In en, this message translates to:
  /// **'Searching…'**
  String get searching;

  /// No description provided for @searchFailed.
  ///
  /// In en, this message translates to:
  /// **'Place search is unavailable. Tap the map or enter coordinates instead.'**
  String get searchFailed;

  /// No description provided for @setLocation.
  ///
  /// In en, this message translates to:
  /// **'Set location'**
  String get setLocation;

  /// No description provided for @editLocation.
  ///
  /// In en, this message translates to:
  /// **'Edit location'**
  String get editLocation;

  /// No description provided for @locationHintMobile.
  ///
  /// In en, this message translates to:
  /// **'Search, tap the map to drop the pin, use GPS, or enter coordinates. Changes are saved only when you choose Save location.'**
  String get locationHintMobile;

  /// No description provided for @savedCoordinates.
  ///
  /// In en, this message translates to:
  /// **'Saved: {lat}, {lng}'**
  String savedCoordinates(String lat, String lng);

  /// No description provided for @analytics.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get analytics;

  /// No description provided for @analyticsHint.
  ///
  /// In en, this message translates to:
  /// **'Occupancy, 12-month profit, income vs. expense and ROI.'**
  String get analyticsHint;

  /// No description provided for @occupancyRate.
  ///
  /// In en, this message translates to:
  /// **'Occupancy rate'**
  String get occupancyRate;

  /// No description provided for @unitsLeased.
  ///
  /// In en, this message translates to:
  /// **'{leased} of {total} units leased'**
  String unitsLeased(String leased, String total);

  /// No description provided for @portfolioProfit12mo.
  ///
  /// In en, this message translates to:
  /// **'Profit (last 12 months)'**
  String get portfolioProfit12mo;

  /// No description provided for @incomeVsExpense.
  ///
  /// In en, this message translates to:
  /// **'Income vs. expense'**
  String get incomeVsExpense;

  /// No description provided for @roiPerProperty.
  ///
  /// In en, this message translates to:
  /// **'ROI per property'**
  String get roiPerProperty;

  /// No description provided for @roiValue.
  ///
  /// In en, this message translates to:
  /// **'{value}% / yr'**
  String roiValue(String value);

  /// No description provided for @noPropertiesYet.
  ///
  /// In en, this message translates to:
  /// **'No properties yet.'**
  String get noPropertiesYet;

  /// No description provided for @income.
  ///
  /// In en, this message translates to:
  /// **'Income'**
  String get income;

  /// No description provided for @expense.
  ///
  /// In en, this message translates to:
  /// **'Expense'**
  String get expense;

  /// No description provided for @chartLabel.
  ///
  /// In en, this message translates to:
  /// **'Monthly income and expense trend'**
  String get chartLabel;

  /// No description provided for @month.
  ///
  /// In en, this message translates to:
  /// **'Month'**
  String get month;

  /// No description provided for @table.
  ///
  /// In en, this message translates to:
  /// **'Table'**
  String get table;

  /// No description provided for @chart.
  ///
  /// In en, this message translates to:
  /// **'Chart'**
  String get chart;

  /// No description provided for @needsConnection.
  ///
  /// In en, this message translates to:
  /// **'This needs an internet connection.'**
  String get needsConnection;

  /// No description provided for @sharedWith.
  ///
  /// In en, this message translates to:
  /// **'Shared with'**
  String get sharedWith;

  /// No description provided for @inviteEmail.
  ///
  /// In en, this message translates to:
  /// **'Email address'**
  String get inviteEmail;

  /// No description provided for @collaboratorRole.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get collaboratorRole;

  /// No description provided for @roleViewer.
  ///
  /// In en, this message translates to:
  /// **'Viewer (read-only)'**
  String get roleViewer;

  /// No description provided for @roleEditor.
  ///
  /// In en, this message translates to:
  /// **'Editor (can edit and draw boundary)'**
  String get roleEditor;

  /// No description provided for @invited.
  ///
  /// In en, this message translates to:
  /// **'Invited'**
  String get invited;

  /// No description provided for @noCollaborators.
  ///
  /// In en, this message translates to:
  /// **'Not shared with anyone yet.'**
  String get noCollaborators;

  /// No description provided for @sharedByOwner.
  ///
  /// In en, this message translates to:
  /// **'Shared with you by the plot owner.'**
  String get sharedByOwner;

  /// No description provided for @sharedAsRole.
  ///
  /// In en, this message translates to:
  /// **'Your role: {role}'**
  String sharedAsRole(String role);

  /// No description provided for @removeCollaboratorConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove {email}? They will lose access to this property.'**
  String removeCollaboratorConfirm(String email);

  /// No description provided for @inviteCollaborator.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get inviteCollaborator;

  /// No description provided for @role_viewer.
  ///
  /// In en, this message translates to:
  /// **'Viewer'**
  String get role_viewer;

  /// No description provided for @role_editor.
  ///
  /// In en, this message translates to:
  /// **'Editor'**
  String get role_editor;

  /// No description provided for @adminTitle.
  ///
  /// In en, this message translates to:
  /// **'Admin overview'**
  String get adminTitle;

  /// No description provided for @adminOverview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get adminOverview;

  /// No description provided for @adminSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get adminSettings;

  /// No description provided for @adminCoupons.
  ///
  /// In en, this message translates to:
  /// **'Coupons'**
  String get adminCoupons;

  /// No description provided for @adminUsers.
  ///
  /// In en, this message translates to:
  /// **'Users'**
  String get adminUsers;

  /// No description provided for @totalUsers.
  ///
  /// In en, this message translates to:
  /// **'Total users'**
  String get totalUsers;

  /// No description provided for @activeTrials.
  ///
  /// In en, this message translates to:
  /// **'Active trials'**
  String get activeTrials;

  /// No description provided for @paidUsers.
  ///
  /// In en, this message translates to:
  /// **'Paid users'**
  String get paidUsers;

  /// No description provided for @totalRevenue.
  ///
  /// In en, this message translates to:
  /// **'Total revenue'**
  String get totalRevenue;

  /// No description provided for @referredSignups.
  ///
  /// In en, this message translates to:
  /// **'Referred signups'**
  String get referredSignups;

  /// No description provided for @lifetimePriceBdt.
  ///
  /// In en, this message translates to:
  /// **'Lifetime price (BDT)'**
  String get lifetimePriceBdt;

  /// No description provided for @trialDays.
  ///
  /// In en, this message translates to:
  /// **'Trial length (days)'**
  String get trialDays;

  /// No description provided for @trialDaysHint.
  ///
  /// In en, this message translates to:
  /// **'Applies to new signups going forward — existing trials keep their original end date.'**
  String get trialDaysHint;

  /// No description provided for @adminSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved.'**
  String get adminSaved;

  /// No description provided for @couponCode.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get couponCode;

  /// No description provided for @discountType.
  ///
  /// In en, this message translates to:
  /// **'Discount type'**
  String get discountType;

  /// No description provided for @discountPercent.
  ///
  /// In en, this message translates to:
  /// **'Percent off'**
  String get discountPercent;

  /// No description provided for @discountFixed.
  ///
  /// In en, this message translates to:
  /// **'Fixed amount off (BDT)'**
  String get discountFixed;

  /// No description provided for @discountValue.
  ///
  /// In en, this message translates to:
  /// **'Discount value'**
  String get discountValue;

  /// No description provided for @maxRedemptions.
  ///
  /// In en, this message translates to:
  /// **'Max redemptions (optional)'**
  String get maxRedemptions;

  /// No description provided for @couponExpiresAt.
  ///
  /// In en, this message translates to:
  /// **'Expires on (optional)'**
  String get couponExpiresAt;

  /// No description provided for @createCoupon.
  ///
  /// In en, this message translates to:
  /// **'Create coupon'**
  String get createCoupon;

  /// No description provided for @deactivate.
  ///
  /// In en, this message translates to:
  /// **'Deactivate'**
  String get deactivate;

  /// No description provided for @activate.
  ///
  /// In en, this message translates to:
  /// **'Activate'**
  String get activate;

  /// No description provided for @noCouponsYet.
  ///
  /// In en, this message translates to:
  /// **'No coupons yet.'**
  String get noCouponsYet;

  /// No description provided for @searchByEmail.
  ///
  /// In en, this message translates to:
  /// **'Search by email'**
  String get searchByEmail;

  /// No description provided for @userAdmin.
  ///
  /// In en, this message translates to:
  /// **'admin'**
  String get userAdmin;

  /// No description provided for @userPaid.
  ///
  /// In en, this message translates to:
  /// **'paid'**
  String get userPaid;

  /// No description provided for @userTrialActive.
  ///
  /// In en, this message translates to:
  /// **'trial active'**
  String get userTrialActive;

  /// No description provided for @userTrialExpired.
  ///
  /// In en, this message translates to:
  /// **'trial expired'**
  String get userTrialExpired;

  /// No description provided for @noUsersFound.
  ///
  /// In en, this message translates to:
  /// **'No users found.'**
  String get noUsersFound;

  /// No description provided for @grantAccess.
  ///
  /// In en, this message translates to:
  /// **'Grant lifetime access'**
  String get grantAccess;

  /// No description provided for @accessGranted.
  ///
  /// In en, this message translates to:
  /// **'Access granted'**
  String get accessGranted;

  /// No description provided for @couponRedeemed.
  ///
  /// In en, this message translates to:
  /// **'{count}/{max} redeemed'**
  String couponRedeemed(String count, String max);

  /// No description provided for @couponExpires.
  ///
  /// In en, this message translates to:
  /// **'expires {date}'**
  String couponExpires(String date);

  /// No description provided for @adminHint.
  ///
  /// In en, this message translates to:
  /// **'Users, coupons, pricing and trial settings.'**
  String get adminHint;

  /// No description provided for @adminNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Admin needs the web app address in this build (WEB_URL).'**
  String get adminNotConfigured;

  /// No description provided for @deleted.
  ///
  /// In en, this message translates to:
  /// **'Deleted'**
  String get deleted;

  /// No description provided for @searchProperties.
  ///
  /// In en, this message translates to:
  /// **'Search by name or location'**
  String get searchProperties;

  /// No description provided for @allDistricts.
  ///
  /// In en, this message translates to:
  /// **'All districts'**
  String get allDistricts;

  /// No description provided for @sortBy.
  ///
  /// In en, this message translates to:
  /// **'Sort'**
  String get sortBy;

  /// No description provided for @sortNewest.
  ///
  /// In en, this message translates to:
  /// **'Newest first'**
  String get sortNewest;

  /// No description provided for @sortName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get sortName;

  /// No description provided for @sortArea.
  ///
  /// In en, this message translates to:
  /// **'Largest area'**
  String get sortArea;

  /// No description provided for @noSearchResults.
  ///
  /// In en, this message translates to:
  /// **'Nothing matches your search.'**
  String get noSearchResults;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loading;

  /// No description provided for @unit_kani.
  ///
  /// In en, this message translates to:
  /// **'Kani'**
  String get unit_kani;

  /// No description provided for @unit_gonda.
  ///
  /// In en, this message translates to:
  /// **'Gonda'**
  String get unit_gonda;

  /// No description provided for @unit_sq_yard.
  ///
  /// In en, this message translates to:
  /// **'Sq yard'**
  String get unit_sq_yard;

  /// No description provided for @unit_hectare.
  ///
  /// In en, this message translates to:
  /// **'Hectare'**
  String get unit_hectare;

  /// No description provided for @unit_are.
  ///
  /// In en, this message translates to:
  /// **'Are'**
  String get unit_are;

  /// No description provided for @unit_sq_km.
  ///
  /// In en, this message translates to:
  /// **'Sq km'**
  String get unit_sq_km;

  /// No description provided for @unit_sq_mile.
  ///
  /// In en, this message translates to:
  /// **'Sq mile'**
  String get unit_sq_mile;

  /// No description provided for @unit_marla.
  ///
  /// In en, this message translates to:
  /// **'Marla'**
  String get unit_marla;

  /// No description provided for @unit_kanal.
  ///
  /// In en, this message translates to:
  /// **'Kanal'**
  String get unit_kanal;

  /// No description provided for @unit_ropani.
  ///
  /// In en, this message translates to:
  /// **'Ropani'**
  String get unit_ropani;

  /// No description provided for @unit_aana.
  ///
  /// In en, this message translates to:
  /// **'Aana'**
  String get unit_aana;

  /// No description provided for @unit_guntha.
  ///
  /// In en, this message translates to:
  /// **'Guntha'**
  String get unit_guntha;

  /// No description provided for @unit_cent.
  ///
  /// In en, this message translates to:
  /// **'Cent'**
  String get unit_cent;

  /// No description provided for @unit_perch.
  ///
  /// In en, this message translates to:
  /// **'Perch'**
  String get unit_perch;

  /// No description provided for @unit_rai.
  ///
  /// In en, this message translates to:
  /// **'Rai'**
  String get unit_rai;

  /// No description provided for @unit_ngan.
  ///
  /// In en, this message translates to:
  /// **'Ngan'**
  String get unit_ngan;

  /// No description provided for @unit_tsubo.
  ///
  /// In en, this message translates to:
  /// **'Tsubo'**
  String get unit_tsubo;

  /// No description provided for @unit_pyeong.
  ///
  /// In en, this message translates to:
  /// **'Pyeong'**
  String get unit_pyeong;

  /// No description provided for @unit_ping.
  ///
  /// In en, this message translates to:
  /// **'Ping'**
  String get unit_ping;

  /// No description provided for @unit_mu.
  ///
  /// In en, this message translates to:
  /// **'Mu'**
  String get unit_mu;

  /// No description provided for @unit_dunam.
  ///
  /// In en, this message translates to:
  /// **'Dunam'**
  String get unit_dunam;

  /// No description provided for @unit_feddan.
  ///
  /// In en, this message translates to:
  /// **'Feddan'**
  String get unit_feddan;

  /// No description provided for @addr_tehsil.
  ///
  /// In en, this message translates to:
  /// **'Tehsil'**
  String get addr_tehsil;

  /// No description provided for @addr_city.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get addr_city;

  /// No description provided for @addr_municipality.
  ///
  /// In en, this message translates to:
  /// **'Municipality'**
  String get addr_municipality;

  /// No description provided for @addr_locality.
  ///
  /// In en, this message translates to:
  /// **'Locality'**
  String get addr_locality;

  /// No description provided for @addr_county.
  ///
  /// In en, this message translates to:
  /// **'County'**
  String get addr_county;

  /// No description provided for @addr_state.
  ///
  /// In en, this message translates to:
  /// **'State'**
  String get addr_state;

  /// No description provided for @addr_province.
  ///
  /// In en, this message translates to:
  /// **'Province'**
  String get addr_province;

  /// No description provided for @addr_region.
  ///
  /// In en, this message translates to:
  /// **'Region'**
  String get addr_region;

  /// No description provided for @addr_emirate.
  ///
  /// In en, this message translates to:
  /// **'Emirate'**
  String get addr_emirate;

  /// No description provided for @addr_governorate.
  ///
  /// In en, this message translates to:
  /// **'Governorate'**
  String get addr_governorate;

  /// No description provided for @addr_prefecture.
  ///
  /// In en, this message translates to:
  /// **'Prefecture'**
  String get addr_prefecture;

  /// No description provided for @addr_department.
  ///
  /// In en, this message translates to:
  /// **'Department'**
  String get addr_department;

  /// No description provided for @regionAndUnits.
  ///
  /// In en, this message translates to:
  /// **'Region & units'**
  String get regionAndUnits;

  /// No description provided for @country.
  ///
  /// In en, this message translates to:
  /// **'Country'**
  String get country;

  /// No description provided for @countryAutomatic.
  ///
  /// In en, this message translates to:
  /// **'Automatic ({country})'**
  String countryAutomatic(String country);

  /// No description provided for @otherCountry.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get otherCountry;

  /// No description provided for @currency.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get currency;

  /// No description provided for @areaUnitForTotals.
  ///
  /// In en, this message translates to:
  /// **'Area unit for totals'**
  String get areaUnitForTotals;

  /// No description provided for @lengthUnits.
  ///
  /// In en, this message translates to:
  /// **'Lengths'**
  String get lengthUnits;

  /// No description provided for @metric.
  ///
  /// In en, this message translates to:
  /// **'Metric (m)'**
  String get metric;

  /// No description provided for @imperial.
  ///
  /// In en, this message translates to:
  /// **'Imperial (ft)'**
  String get imperial;

  /// No description provided for @countryDefault.
  ///
  /// In en, this message translates to:
  /// **'Country default ({value})'**
  String countryDefault(String value);

  /// No description provided for @regionSyncHint.
  ///
  /// In en, this message translates to:
  /// **'Changes amounts and areas shown in the app; saved values are not converted.'**
  String get regionSyncHint;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['bn', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'bn':
      return AppLocalizationsBn();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
