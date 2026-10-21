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

  /// No description provided for @decimalValue.
  ///
  /// In en, this message translates to:
  /// **'{value} decimal'**
  String decimalValue(String value);

  /// No description provided for @areaSub.
  ///
  /// In en, this message translates to:
  /// **'{bigha} bigha · {acre} acre'**
  String areaSub(String bigha, String acre);

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
  /// **'GPS ±{meters} m'**
  String gpsAccuracy(String meters);

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
  /// **'Corner added (±{meters} m)'**
  String cornerAdded(String meters);

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
  /// **'{count} points · ~{area} decimal'**
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
