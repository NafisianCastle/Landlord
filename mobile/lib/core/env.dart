import 'dart:io';

import 'package:firebase_core/firebase_core.dart';

/// Build-time configuration, passed with --dart-define (see mobile/README.md).
/// Nothing secret lives here: the publishable key is public by design and RLS
/// protects the data.
class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabasePublishableKey =
      String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  /// Deep link Supabase redirects back to after Google sign-in. Must be in the
  /// Supabase dashboard's Auth → URL Configuration → Redirect URLs.
  static const authRedirect = 'io.landlord.app://login-callback';

  static const _firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const _firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const _firebaseSenderId = String.fromEnvironment('FIREBASE_SENDER_ID');
  static const _firebaseAndroidAppId =
      String.fromEnvironment('FIREBASE_ANDROID_APP_ID');
  static const _firebaseIosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');

  /// Push is optional: without Firebase config the app runs without it.
  static FirebaseOptions? get firebaseOptions {
    final appId = Platform.isIOS ? _firebaseIosAppId : _firebaseAndroidAppId;
    if (_firebaseProjectId.isEmpty || appId.isEmpty) return null;
    return FirebaseOptions(
      apiKey: _firebaseApiKey,
      appId: appId,
      messagingSenderId: _firebaseSenderId,
      projectId: _firebaseProjectId,
    );
  }
}
