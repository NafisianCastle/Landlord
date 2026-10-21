// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Bengali Bangla (`bn`).
class AppLocalizationsBn extends AppLocalizations {
  AppLocalizationsBn([String locale = 'bn']) : super(locale);

  @override
  String get appTitle => 'Landlord';

  @override
  String get navDashboard => 'ড্যাশবোর্ড';

  @override
  String get navPlots => 'প্লট';

  @override
  String get navApartments => 'অ্যাপার্টমেন্ট';

  @override
  String get navSettings => 'সেটিংস';

  @override
  String get email => 'ইমেইল';

  @override
  String get password => 'পাসওয়ার্ড';

  @override
  String get fullName => 'পুরো নাম';

  @override
  String get logIn => 'লগ ইন';

  @override
  String get signUp => 'সাইন আপ';

  @override
  String get noAccount => 'অ্যাকাউন্ট নেই?';

  @override
  String get haveAccount => 'ইতিমধ্যে অ্যাকাউন্ট আছে?';

  @override
  String get continueWithGoogle => 'গুগল দিয়ে চালিয়ে যান';

  @override
  String get forgotPassword => 'পাসওয়ার্ড ভুলে গেছেন?';

  @override
  String get resetEmailSent => 'রিসেট লিংকের জন্য আপনার ইমেইল দেখুন।';

  @override
  String get passwordTooShort => 'পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে।';

  @override
  String get checkEmailToConfirm =>
      'অ্যাকাউন্ট নিশ্চিত করতে আপনার ইমেইল দেখুন, তারপর লগ ইন করুন।';

  @override
  String get referralCode => 'রেফারেল কোড (ঐচ্ছিক)';

  @override
  String get save => 'সংরক্ষণ করুন';

  @override
  String get cancel => 'বাতিল';

  @override
  String get delete => 'মুছুন';

  @override
  String get edit => 'সম্পাদনা';

  @override
  String get retry => 'আবার চেষ্টা করুন';

  @override
  String get required => 'আবশ্যক';

  @override
  String get confirmDelete => 'স্থায়ীভাবে মুছে ফেলবেন?';

  @override
  String get offlineBanner => 'অফলাইন — সংরক্ষিত তথ্য দেখানো হচ্ছে';

  @override
  String pendingChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি পরিবর্তন সিঙ্কের অপেক্ষায়',
    );
    return '$_temp0';
  }

  @override
  String syncRejected(String message) {
    return 'সার্ভার একটি পরিবর্তন গ্রহণ করেনি: $message';
  }

  @override
  String errorMessage(String message) {
    return 'কিছু ভুল হয়েছে: $message';
  }

  @override
  String get totalPlots => 'মোট প্লট';

  @override
  String get totalArea => 'মোট জমি';

  @override
  String get totalPurchasePrice => 'মোট কেনার মূল্য';

  @override
  String get totalCurrentValue => 'মোট বর্তমান মূল্য';

  @override
  String get overdueRent => 'বকেয়া ভাড়া';

  @override
  String get upcomingRent => '৩০ দিনের মধ্যে প্রাপ্য';

  @override
  String get receivedThisMonth => 'এ মাসে প্রাপ্ত';

  @override
  String decimalValue(String value) {
    return '$value ডেসিমেল';
  }

  @override
  String areaSub(String bigha, String acre) {
    return '$bigha বিঘা · $acre একর';
  }

  @override
  String get addPlot => 'প্লট যোগ করুন';

  @override
  String get addApartment => 'অ্যাপার্টমেন্ট যোগ করুন';

  @override
  String get noPlots => 'এখনো কোনো প্লট নেই।';

  @override
  String get noApartments => 'এখনো কোনো অ্যাপার্টমেন্ট নেই।';

  @override
  String get field_name => 'নাম';

  @override
  String get field_village => 'গ্রাম';

  @override
  String get field_upazila => 'উপজেলা';

  @override
  String get field_district => 'জেলা';

  @override
  String get field_division => 'বিভাগ';

  @override
  String get field_mutationNumber => 'মিউটেশন নম্বর';

  @override
  String get field_dolilArea => 'প্লটের পরিমাণ (দলিল অনুযায়ী)';

  @override
  String get field_actualArea => 'প্লটের পরিমাণ (প্রকৃত)';

  @override
  String get field_purchasePrice => 'কেনার মূল্য (টাকা)';

  @override
  String get field_purchaseDate => 'কেনার তারিখ';

  @override
  String get field_currentEstimatedValue => 'বর্তমান আনুমানিক মূল্য (টাকা)';

  @override
  String get field_notes => 'নোট';

  @override
  String get field_buildingName => 'ভবনের নাম';

  @override
  String get field_unitNumber => 'ইউনিট নম্বর';

  @override
  String get field_floor => 'তলা';

  @override
  String get field_size => 'আয়তন';

  @override
  String get unit => 'একক';

  @override
  String get unit_decimal => 'ডেসিমেল';

  @override
  String get unit_katha => 'কাঠা';

  @override
  String get unit_bigha => 'বিঘা';

  @override
  String get unit_acre => 'একর';

  @override
  String get unit_sqft => 'বর্গফুট';

  @override
  String get unit_sqmeter => 'বর্গমিটার';

  @override
  String get sensitiveLocked =>
      'গ্রাম, মিউটেশন নম্বর, মূল্য এবং নোট এনক্রিপ্ট করা আছে। দেখতে বা সম্পাদনা করতে সেটিংসে এনক্রিপশন আনলক করুন।';

  @override
  String get willEncrypt =>
      'স্পর্শকাতর তথ্য আপলোডের আগে এই ডিভাইসেই এনক্রিপ্ট করা হবে।';

  @override
  String get encrypted => 'এনক্রিপ্টেড';

  @override
  String get area => 'আয়তন';

  @override
  String get directions => 'দিকনির্দেশনা';

  @override
  String get details => 'বিস্তারিত';

  @override
  String get notFound => 'পাওয়া যায়নি। হয়তো মুছে ফেলা হয়েছে।';

  @override
  String get boundary => 'সীমানা';

  @override
  String get noBoundary => 'এখনো কোনো সীমানা নেই।';

  @override
  String get captureBoundary => 'সীমানা নির্ধারণ করুন';

  @override
  String get redrawBoundary => 'সীমানা আবার আঁকুন';

  @override
  String gpsAccuracy(String meters) {
    return 'জিপিএস ±$meters মি.';
  }

  @override
  String get waitingForGps => 'জিপিএসের অপেক্ষায়…';

  @override
  String get gpsTooWeak => 'জিপিএস সিগন্যাল দুর্বল — খোলা আকাশের নিচে যান';

  @override
  String get markCorner => 'এখানে কোণা চিহ্নিত করুন';

  @override
  String markingCorner(int count) {
    return 'স্থির থাকুন… $countটি অবস্থান গড় করা হচ্ছে';
  }

  @override
  String cornerAdded(String meters) {
    return 'কোণা যোগ হয়েছে (±$meters মি.)';
  }

  @override
  String get autoTrace => 'হাঁটার সাথে সাথে আঁকুন';

  @override
  String get boundaryHelp =>
      'প্রতিটি কোণায় হেঁটে গিয়ে \"কোণা চিহ্নিত করুন\" চাপুন, অথবা আঁকা চালু করে সীমানা ধরে হাঁটুন। মানচিত্রে ট্যাপ করেও বিন্দু যোগ করা যায়।';

  @override
  String get undo => 'পূর্বাবস্থা';

  @override
  String get clear => 'মুছুন';

  @override
  String get saveBoundary => 'সীমানা সংরক্ষণ করুন';

  @override
  String get needThreePoints => 'সীমানার জন্য অন্তত ৩টি বিন্দু প্রয়োজন।';

  @override
  String get invalidPolygon =>
      'সীমানার রেখাগুলো একে অপরকে ছেদ করছে। বিন্দুগুলো ঠিক করুন।';

  @override
  String pointsAndArea(int count, String area) {
    return '$countটি বিন্দু · ~$area ডেসিমেল';
  }

  @override
  String get locationPermissionDenied =>
      'সীমানা ধরে হাঁটতে লোকেশন অনুমতি প্রয়োজন।';

  @override
  String get trackingNotificationTitle => 'সীমানা রেকর্ড হচ্ছে';

  @override
  String get trackingNotificationText =>
      'আপনি প্লট ধরে হাঁটার সময় Landlord জিপিএস ব্যবহার করছে।';

  @override
  String get satellite => 'স্যাটেলাইট';

  @override
  String get streets => 'রাস্তা';

  @override
  String get documents => 'নথি';

  @override
  String get noDocuments => 'এখনো কোনো নথি নেই।';

  @override
  String get scanDocument => 'স্ক্যান';

  @override
  String get pickPdf => 'পিডিএফ আপলোড';

  @override
  String get uploading => 'আপলোড হচ্ছে…';

  @override
  String get uploaded => 'আপলোড হয়েছে।';

  @override
  String get documentsNeedConnection => 'নথির জন্য ইন্টারনেট সংযোগ প্রয়োজন।';

  @override
  String get documentLocked =>
      'এই নথিটি এনক্রিপ্ট করা। খুলতে সেটিংসে এনক্রিপশন আনলক করুন।';

  @override
  String get docError_onlyPdf => 'শুধুমাত্র পিডিএফ ফাইল অনুমোদিত।';

  @override
  String get docError_choosePdf => 'একটি পিডিএফ ফাইল বেছে নিন।';

  @override
  String get docError_fileTooLarge => 'ফাইলটি ২০ এমবি-র চেয়ে বড়।';

  @override
  String get docError_invalidPdfContent => 'এটি একটি বৈধ পিডিএফ নয়।';

  @override
  String get leases => 'লিজ';

  @override
  String get addLease => 'লিজ যোগ করুন';

  @override
  String get editLease => 'লিজ সম্পাদনা';

  @override
  String get noLeases => 'এখনো কোনো লিজ নেই।';

  @override
  String get tenantName => 'ভাড়াটিয়ার নাম';

  @override
  String get tenantPhone => 'ভাড়াটিয়ার ফোন';

  @override
  String get tenantEmail => 'ভাড়াটিয়ার ইমেইল';

  @override
  String get rentAmount => 'ভাড়ার পরিমাণ (টাকা)';

  @override
  String get frequency => 'পেমেন্ট চক্র';

  @override
  String get frequency_monthly => 'মাসিক';

  @override
  String get frequency_quarterly => 'ত্রৈমাসিক';

  @override
  String get frequency_yearly => 'বার্ষিক';

  @override
  String get startDate => 'লিজ শুরুর তারিখ';

  @override
  String get endDate => 'লিজ শেষের তারিখ';

  @override
  String get endDateHint => 'চলমান লিজের জন্য খালি রাখুন।';

  @override
  String get status_active => 'সক্রিয়';

  @override
  String get status_ended => 'শেষ';

  @override
  String get endLease => 'লিজ শেষ করুন';

  @override
  String get payments => 'পেমেন্ট';

  @override
  String get paymentsAfterSync => 'সিঙ্ক হলে পেমেন্টের তালিকা দেখা যাবে।';

  @override
  String get markPaid => 'পরিশোধিত হিসেবে চিহ্নিত করুন';

  @override
  String paidOn(String date) {
    return 'পরিশোধিত $date';
  }

  @override
  String dueOn(String date) {
    return 'প্রাপ্য $date';
  }

  @override
  String get overdue => 'বকেয়া';

  @override
  String get settings => 'সেটিংস';

  @override
  String get language => 'ভাষা';

  @override
  String get encryption => 'এনক্রিপশন';

  @override
  String get encryptionNotSetUp =>
      'এনক্রিপশন সেট আপ করা হয়নি। ওয়েব অ্যাপের প্রোফাইল থেকে সেট আপ করুন; তারপর এখানেও আনলক করা যাবে।';

  @override
  String get passphrase => 'পাসফ্রেজ';

  @override
  String get recoveryCode => 'রিকভারি কোড';

  @override
  String get useRecoveryCode => 'পরিবর্তে রিকভারি কোড ব্যবহার করুন';

  @override
  String get unlock => 'আনলক করুন';

  @override
  String get lock => 'লক করুন';

  @override
  String get unlockedNotice =>
      'আনলক করা আছে। স্পর্শকাতর তথ্য এই ডিভাইস থেকে বের হওয়ার আগেই এনক্রিপ্ট করা হয়।';

  @override
  String get lockedNotice =>
      'এনক্রিপশন চালু আছে কিন্তু লক করা। স্পর্শকাতর তথ্য দেখতে বা সম্পাদনা করতে পাসফ্রেজ দিন।';

  @override
  String get wrongPassphrase => 'ভুল পাসফ্রেজ।';

  @override
  String get biometricLock => 'বায়োমেট্রিক লক';

  @override
  String get biometricLockHint =>
      'অ্যাপ খুলতে আঙুলের ছাপ বা মুখ প্রয়োজন হবে, এবং এনক্রিপশন কী এই ডিভাইসের সুরক্ষিত কী-স্টোরে থাকবে।';

  @override
  String get biometricUnavailable =>
      'এই ডিভাইসে আঙুলের ছাপ বা মুখ আনলক সেট আপ করা নেই।';

  @override
  String get biometricReason => 'Landlord আনলক করুন';

  @override
  String get appLocked => 'Landlord লক করা আছে';

  @override
  String get offlineMaps => 'অফলাইন মানচিত্র';

  @override
  String get offlineMapsHint =>
      'মাঠে সংযোগ ছাড়াই মানচিত্র ব্যবহারের জন্য একটি এলাকার স্যাটেলাইট ছবি ডাউনলোড করুন।';

  @override
  String get downloadVisibleArea => 'দৃশ্যমান এলাকা ডাউনলোড করুন';

  @override
  String downloadProgress(int done, int total) {
    return 'ডাউনলোড হচ্ছে $done/$total';
  }

  @override
  String downloadDone(int count) {
    return 'অফলাইন ব্যবহারের জন্য $countটি টাইল সংরক্ষিত।';
  }

  @override
  String areaTooLarge(int count) {
    return 'এই এলাকায় $countটি টাইল লাগবে, যা ৩০০০ সীমার বেশি — আগে জুম ইন করুন।';
  }

  @override
  String cacheSize(String size) {
    return 'সংরক্ষিত: $size এমবি';
  }

  @override
  String get clearCache => 'অফলাইন মানচিত্র মুছুন';

  @override
  String get notifications => 'ভাড়ার রিমাইন্ডার';

  @override
  String get notificationsHint =>
      'ভাড়া প্রাপ্য হলে বা লিজ শেষ হওয়ার আগে এই ফোনে নোটিফিকেশন পান।';

  @override
  String get notificationsUnavailable =>
      'এই বিল্ডে পুশ নোটিফিকেশন কনফিগার করা নেই।';

  @override
  String get signOut => 'সাইন আউট';

  @override
  String get expenses => 'খরচ';

  @override
  String get addExpense => 'খরচ যোগ করুন';

  @override
  String get noExpenses => 'এখনো কোনো খরচ নেই।';

  @override
  String expensesTotal(String amount) {
    return 'মোট: $amount';
  }

  @override
  String get category => 'বিভাগ';

  @override
  String get category_tax => 'ট্যাক্স';

  @override
  String get category_insurance => 'বীমা';

  @override
  String get category_utility => 'ইউটিলিটি';

  @override
  String get category_repair => 'মেরামত';

  @override
  String get category_management_fee => 'ব্যবস্থাপনা ফি';

  @override
  String get category_other => 'অন্যান্য';

  @override
  String get amount => 'পরিমাণ (টাকা)';

  @override
  String get expenseDate => 'খরচের তারিখ';

  @override
  String get maintenance => 'মেরামত';

  @override
  String get addMaintenanceRequest => 'রিকোয়েস্ট যোগ করুন';

  @override
  String get noMaintenance => 'এখনো কোনো মেরামত রিকোয়েস্ট নেই।';

  @override
  String get maintenanceTitle => 'শিরোনাম';

  @override
  String get maintenanceDescription => 'বিবরণ';

  @override
  String get cost => 'খরচ (টাকা)';

  @override
  String get reportedDate => 'রিপোর্ট করার তারিখ';

  @override
  String reportedOn(String date) {
    return 'রিপোর্ট করা হয়েছে $date';
  }

  @override
  String get maintenanceStatus_open => 'খোলা';

  @override
  String get maintenanceStatus_in_progress => 'চলমান';

  @override
  String get maintenanceStatus_resolved => 'সমাধান হয়েছে';

  @override
  String get markInProgress => 'চলমান হিসেবে চিহ্নিত করুন';

  @override
  String get markResolved => 'সমাধান হয়েছে চিহ্নিত করুন';

  @override
  String get reopen => 'পুনরায় খুলুন';

  @override
  String get vendors => 'ভেন্ডর';

  @override
  String get addVendor => 'ভেন্ডর যোগ করুন';

  @override
  String get editVendor => 'ভেন্ডর সম্পাদনা করুন';

  @override
  String get noVendors => 'এখনো কোনো ভেন্ডর নেই।';

  @override
  String get vendorsHint =>
      'প্লাম্বার, ইলেকট্রিশিয়ান ও অন্যান্য যোগাযোগ, যাদের মেরামত রিকোয়েস্টে যুক্ত করা যায়।';

  @override
  String get manageVendors => 'ভেন্ডর পরিচালনা করুন';

  @override
  String get vendorTrade => 'পেশা';

  @override
  String get vendorTradeHint => 'যেমন প্লাম্বার, ইলেকট্রিশিয়ান';

  @override
  String get phone => 'ফোন';

  @override
  String get call => 'কল করুন';

  @override
  String get vendor => 'ভেন্ডর';

  @override
  String get noVendor => 'কোনো ভেন্ডর নেই';

  @override
  String get navBills => 'বিল';

  @override
  String get bills => 'অ্যাপার্টমেন্টের বিল';

  @override
  String get billsPortalHint =>
      'বিল দেখুন, পরিশোধের প্রমাণ জমা দিন এবং মালিকের শেয়ার করা ব্যয় দেখুন।';

  @override
  String get billsOwnerHint =>
      'প্রতি মাসে বিলের কপি, পরিমাণ ও শেষ তারিখ যোগ করুন। ভাড়াটিয়ার প্রমাণ অনুমোদন করলে বিল পরিশোধিত হবে। বিল আদায় ভাড়া ও ব্যয়ের হিসাব থেকে আলাদা।';

  @override
  String get billTitle => 'বিলের শিরোনাম';

  @override
  String get billTitlePlaceholder => 'বিদ্যুৎ · অক্টোবর ২০২৬';

  @override
  String get billTenant => 'ভাড়াটিয়া';

  @override
  String get billAmount => 'পরিমাণ (টাকা)';

  @override
  String get billDueDate => 'পরিশোধের শেষ তারিখ';

  @override
  String get billCopy => 'বিলের কপি';

  @override
  String get paymentProof => 'পরিশোধের প্রমাণ';

  @override
  String get billFileHint => 'JPEG, PNG, WebP বা PDF · সর্বোচ্চ ১০ MB।';

  @override
  String get billVisible => 'নির্বাচিত ভাড়াটিয়ার সাথে বিলটি শেয়ার করুন';

  @override
  String get billInviteFirst =>
      'উপরে একজন ভাড়াটিয়া যোগ করুন (ভাড়াটিয়া — শুধু বিল), তারপর বিল তৈরি করুন। ভাড়াটিয়ার Landlord অ্যাকাউন্ট থাকতে হবে।';

  @override
  String get createBill => 'মাসিক বিল যোগ করুন';

  @override
  String get submitProof => 'পরিশোধের প্রমাণ আপলোড করুন';

  @override
  String get billCreated => 'বিল সংরক্ষিত হয়েছে।';

  @override
  String get proofSubmitted => 'মালিকের পর্যালোচনার জন্য প্রমাণ জমা হয়েছে।';

  @override
  String get billApprovalHint =>
      'প্রমাণ আপলোড করলেই বিল পরিশোধিত হয় না। মালিক যাচাই করে অনুমোদন দেবেন।';

  @override
  String get viewBill => 'বিলের কপি দেখুন';

  @override
  String get viewProof => 'পরিশোধের প্রমাণ দেখুন';

  @override
  String get approveProof => 'অনুমোদন ও পরিশোধিত চিহ্নিত করুন';

  @override
  String get rejectProof => 'প্রমাণ প্রত্যাখ্যান করুন';

  @override
  String get rejectionReason => 'প্রত্যাখ্যানের কারণ';

  @override
  String reviewNote(String note) {
    return 'মালিকের মন্তব্য: $note';
  }

  @override
  String billDue(String date) {
    return 'শেষ তারিখ $date';
  }

  @override
  String get billStatus_paid => 'পরিশোধিত';

  @override
  String get billStatus_pending => 'পর্যালোচনার অপেক্ষায়';

  @override
  String get billStatus_overdue => 'মেয়াদোত্তীর্ণ';

  @override
  String get billStatus_unpaid => 'অপরিশোধিত';

  @override
  String get proofStatus_pending => 'পর্যালোচনার অপেক্ষায়';

  @override
  String get proofStatus_approved => 'অনুমোদিত';

  @override
  String get proofStatus_rejected => 'প্রত্যাখ্যাত';

  @override
  String get billShared => 'ভাড়াটিয়া দেখতে পাবেন';

  @override
  String get billPrivate => 'ব্যক্তিগত';

  @override
  String get billHide => 'ভাড়াটিয়ার কাছ থেকে লুকান';

  @override
  String get billShare => 'ভাড়াটিয়ার সাথে শেয়ার করুন';

  @override
  String get billTenantRemoved =>
      'ভাড়াটিয়ার প্রবেশাধিকার সরানো হয়েছে। পুরোনো বিল ও প্রমাণ আপনার কাছে সংরক্ষিত আছে।';

  @override
  String get noBills =>
      'এখনও কোনো বিল নেই। মালিক অ্যাপার্টমেন্টের বিবরণ থেকে মাসিক বিল যোগ করতে পারেন।';

  @override
  String get sharedExpenses => 'অন্যান্য শেয়ার করা ব্যয়';

  @override
  String get sharedExpensesHint =>
      'এগুলো তথ্যের জন্য। শেয়ার করা ব্যয় পরিশোধের জন্য অতিরিক্ত বিল নয়।';

  @override
  String get noSharedExpenses => 'মালিক এখনও অন্য কোনো ব্যয় শেয়ার করেননি।';

  @override
  String get shareExpense => 'ভাড়াটিয়াদের সাথে শেয়ার করুন';

  @override
  String get hideExpense => 'ব্যক্তিগত করুন';

  @override
  String get expenseVisibilityHint =>
      'ব্যয় প্রথমে ব্যক্তিগত থাকে। শেয়ার করলে পরিমাণ, তারিখ, ধরন ও নোট এই অ্যাপার্টমেন্টের সব বর্তমান ভাড়াটিয়া দেখতে পাবেন।';

  @override
  String reviewAlert(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countটি বিলের পরিশোধের প্রমাণ আপনার পর্যালোচনার অপেক্ষায়।',
      one: '$countটি বিলের পরিশোধের প্রমাণ আপনার পর্যালোচনার অপেক্ষায়।',
    );
    return '$_temp0';
  }

  @override
  String dueAlert(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'আপনার $countটি বিলের শেষ তারিখ আসন্ন বা পেরিয়ে গেছে।',
    );
    return '$_temp0';
  }

  @override
  String get billError_notFound => 'বিল বা ভাড়াটিয়া আর পাওয়া যাচ্ছে না।';

  @override
  String get billError_chooseFile => 'বিলের কপি বা পরিশোধের প্রমাণ বেছে নিন।';

  @override
  String get billError_fileTooLarge => 'ফাইলটি ১০ MB বা তার কম হতে হবে।';

  @override
  String get billError_fileType => 'বৈধ JPEG, PNG, WebP ছবি বা PDF বেছে নিন।';

  @override
  String get billError_saveFailed =>
      'সংরক্ষণ করা যায়নি। পৃষ্ঠা রিফ্রেশ করে আবার চেষ্টা করুন।';

  @override
  String get billError_uploadFailed =>
      'ফাইল আপলোড করা যায়নি। আবার চেষ্টা করুন।';

  @override
  String get billError_alreadyPending =>
      'একটি পরিশোধের প্রমাণ ইতিমধ্যে পর্যালোচনার অপেক্ষায় আছে।';

  @override
  String get billError_reviewFailed =>
      'প্রমাণ পর্যালোচনা করা যায়নি। এটি আগেই পর্যালোচিত হয়ে থাকতে পারে। রিফ্রেশ করে আবার চেষ্টা করুন।';

  @override
  String get billError_noAccountFound =>
      'এই ইমেইলের জন্য কোনো ল্যান্ডলর্ড অ্যাকাউন্ট পাওয়া যায়নি।';

  @override
  String get billError_cannotInviteSelf =>
      'আপনি নিজেকে আমন্ত্রণ করতে পারবেন না।';

  @override
  String get billError_removeBroadAccess =>
      'ভাড়াটিয়া হিসেবে যোগ করার আগে এই অ্যাকাউন্টের দর্শক বা সম্পাদক প্রবেশাধিকার সরান।';

  @override
  String get billError_alreadyShared =>
      'এই সম্পত্তি ইতিমধ্যে সেই ব্যক্তির সাথে শেয়ার করা আছে।';

  @override
  String get tenants => 'ভাড়াটিয়া';

  @override
  String get inviteTenant => 'ভাড়াটিয়া আমন্ত্রণ করুন';

  @override
  String get roleTenant => 'ভাড়াটিয়া — শুধু বিল';

  @override
  String get tenantHelp =>
      'ভাড়াটিয়া মেনুর বিল থেকে তার বিল ও আপনার শেয়ার করা ব্যয় দেখতে পাবেন। মালিকানার তথ্য ও ব্যক্তিগত দলিল দেখতে পাবেন না। দর্শক ও সম্পাদকের প্রবেশাধিকার বেশি।';

  @override
  String removeTenantConfirm(String email) {
    return '$email কে সরাবেন? তার বিল, প্রমাণ ও শেয়ার করা ব্যয়ের প্রবেশাধিকার শেষ হবে; ইতিহাস আপনার কাছে থাকবে।';
  }

  @override
  String get remove => 'সরান';

  @override
  String get invite => 'আমন্ত্রণ করুন';

  @override
  String get noTenants => 'এখনো কোনো ভাড়াটিয়া নেই।';

  @override
  String get takePhoto => 'ছবি তুলুন';

  @override
  String get chooseFile => 'ফাইল বেছে নিন';

  @override
  String get locationTitle => 'অ্যাপার্টমেন্টের অবস্থান';

  @override
  String get locationHint =>
      'ভবনের জন্য একটি পিন সংরক্ষণ করুন। ম্যাপে খুঁজুন বা ট্যাপ করুন, পিন টানুন, GPS ব্যবহার করুন অথবা স্থানাঙ্ক লিখুন। অবস্থান সংরক্ষণ চাপলে পরিবর্তন সংরক্ষিত হবে।';

  @override
  String get locationViewHint => 'ভবনের সংরক্ষিত অবস্থান।';

  @override
  String get noLocation => 'এখনও অবস্থান সংরক্ষিত নেই।';

  @override
  String get latitude => 'অক্ষাংশ';

  @override
  String get longitude => 'দ্রাঘিমাংশ';

  @override
  String get useGps => 'আমার বর্তমান অবস্থান ব্যবহার করুন';

  @override
  String get locating => 'আপনার অবস্থান খোঁজা হচ্ছে…';

  @override
  String get saveLocation => 'অবস্থান সংরক্ষণ';

  @override
  String get removeLocation => 'অবস্থান সরান';

  @override
  String get locationSaved => 'অবস্থান সংরক্ষিত হয়েছে।';

  @override
  String get gpsUnavailable =>
      'আপনার অবস্থান পাওয়া যায়নি। ব্রাউজারের অনুমতি দেখুন অথবা নিজে অবস্থান বেছে নিন।';

  @override
  String get invalidCoordinates =>
      'অক্ষাংশ −৯০ থেকে ৯০ এবং দ্রাঘিমাংশ −১৮০ থেকে ১৮০ এর মধ্যে লিখুন।';

  @override
  String get searchPlace => 'স্থান খুঁজুন';

  @override
  String get searchPlaceholder => 'এলাকা, ঠিকানা বা ভবনের নাম';

  @override
  String get searching => 'খোঁজা হচ্ছে…';

  @override
  String get searchFailed =>
      'স্থান খোঁজা যাচ্ছে না। ম্যাপে ট্যাপ করুন অথবা স্থানাঙ্ক লিখুন।';

  @override
  String get setLocation => 'অবস্থান নির্ধারণ করুন';

  @override
  String get editLocation => 'অবস্থান সম্পাদনা করুন';

  @override
  String get locationHintMobile =>
      'খুঁজুন, ম্যাপে ট্যাপ করে পিন বসান, GPS ব্যবহার করুন অথবা স্থানাঙ্ক লিখুন। অবস্থান সংরক্ষণ চাপলে পরিবর্তন সংরক্ষিত হবে।';

  @override
  String savedCoordinates(String lat, String lng) {
    return 'সংরক্ষিত: $lat, $lng';
  }

  @override
  String get analytics => 'বিশ্লেষণ';

  @override
  String get analyticsHint => 'দখল হার, ১২ মাসের লাভ, আয় বনাম খরচ ও ROI।';

  @override
  String get occupancyRate => 'দখল হার';

  @override
  String unitsLeased(String leased, String total) {
    return '$totalটির মধ্যে $leasedটি ইউনিট ভাড়া দেওয়া';
  }

  @override
  String get portfolioProfit12mo => 'লাভ (গত ১২ মাস)';

  @override
  String get incomeVsExpense => 'আয় বনাম খরচ';

  @override
  String get roiPerProperty => 'সম্পত্তি অনুযায়ী ROI';

  @override
  String roiValue(String value) {
    return '$value% / বছর';
  }

  @override
  String get noPropertiesYet => 'এখনো কোনো সম্পত্তি নেই।';

  @override
  String get income => 'আয়';

  @override
  String get expense => 'খরচ';

  @override
  String get chartLabel => 'মাসিক আয় ও খরচের প্রবণতা';

  @override
  String get month => 'মাস';

  @override
  String get table => 'টেবিল';

  @override
  String get chart => 'চার্ট';

  @override
  String get needsConnection => 'এর জন্য ইন্টারনেট সংযোগ প্রয়োজন।';

  @override
  String get sharedWith => 'যাদের সাথে শেয়ার করা';

  @override
  String get inviteEmail => 'ইমেইল ঠিকানা';

  @override
  String get collaboratorRole => 'ভূমিকা';

  @override
  String get roleViewer => 'দর্শক (শুধু দেখতে পারবে)';

  @override
  String get roleEditor => 'সম্পাদক (সম্পাদনা ও সীমানা আঁকতে পারবে)';

  @override
  String get invited => 'আমন্ত্রণ পাঠানো হয়েছে';

  @override
  String get noCollaborators => 'এখনো কারো সাথে শেয়ার করা হয়নি।';

  @override
  String get sharedByOwner => 'প্লটের মালিক আপনার সাথে এটি শেয়ার করেছেন।';

  @override
  String sharedAsRole(String role) {
    return 'আপনার ভূমিকা: $role';
  }

  @override
  String removeCollaboratorConfirm(String email) {
    return '$email কে সরাবেন? তিনি এই সম্পত্তিতে আর প্রবেশ করতে পারবেন না।';
  }

  @override
  String get inviteCollaborator => 'শেয়ার করুন';

  @override
  String get role_viewer => 'দর্শক';

  @override
  String get role_editor => 'সম্পাদক';

  @override
  String get adminTitle => 'অ্যাডমিন ওভারভিউ';

  @override
  String get adminOverview => 'ওভারভিউ';

  @override
  String get adminSettings => 'সেটিংস';

  @override
  String get adminCoupons => 'কুপন';

  @override
  String get adminUsers => 'ব্যবহারকারী';

  @override
  String get totalUsers => 'মোট ব্যবহারকারী';

  @override
  String get activeTrials => 'সক্রিয় ট্রায়াল';

  @override
  String get paidUsers => 'পেইড ব্যবহারকারী';

  @override
  String get totalRevenue => 'মোট আয়';

  @override
  String get referredSignups => 'রেফার করা সাইনআপ';

  @override
  String get lifetimePriceBdt => 'লাইফটাইম মূল্য (টাকা)';

  @override
  String get trialDays => 'ট্রায়ালের মেয়াদ (দিন)';

  @override
  String get trialDaysHint =>
      'এখন থেকে নতুন সাইনআপের জন্য প্রযোজ্য — বিদ্যমান ট্রায়ালের মেয়াদ অপরিবর্তিত থাকবে।';

  @override
  String get adminSaved => 'সংরক্ষিত হয়েছে।';

  @override
  String get couponCode => 'কোড';

  @override
  String get discountType => 'ছাড়ের ধরন';

  @override
  String get discountPercent => 'শতাংশ ছাড়';

  @override
  String get discountFixed => 'নির্দিষ্ট পরিমাণ ছাড় (টাকা)';

  @override
  String get discountValue => 'ছাড়ের পরিমাণ';

  @override
  String get maxRedemptions => 'সর্বোচ্চ ব্যবহার (ঐচ্ছিক)';

  @override
  String get couponExpiresAt => 'মেয়াদ শেষ (ঐচ্ছিক)';

  @override
  String get createCoupon => 'কুপন তৈরি করুন';

  @override
  String get deactivate => 'নিষ্ক্রিয় করুন';

  @override
  String get activate => 'সক্রিয় করুন';

  @override
  String get noCouponsYet => 'এখনো কোনো কুপন নেই।';

  @override
  String get searchByEmail => 'ইমেইল দিয়ে খুঁজুন';

  @override
  String get userAdmin => 'অ্যাডমিন';

  @override
  String get userPaid => 'পেইড';

  @override
  String get userTrialActive => 'ট্রায়াল সক্রিয়';

  @override
  String get userTrialExpired => 'ট্রায়াল শেষ';

  @override
  String get noUsersFound => 'কোনো ব্যবহারকারী পাওয়া যায়নি।';

  @override
  String get grantAccess => 'লাইফটাইম অ্যাক্সেস দিন';

  @override
  String get accessGranted => 'অ্যাক্সেস দেওয়া হয়েছে';

  @override
  String couponRedeemed(String count, String max) {
    return '$count/$max ব্যবহৃত';
  }

  @override
  String couponExpires(String date) {
    return 'মেয়াদ শেষ $date';
  }

  @override
  String get adminHint => 'ব্যবহারকারী, কুপন, মূল্য ও ট্রায়াল সেটিংস।';

  @override
  String get adminNotConfigured =>
      'অ্যাডমিনের জন্য এই বিল্ডে ওয়েব অ্যাপের ঠিকানা (WEB_URL) প্রয়োজন।';
}
