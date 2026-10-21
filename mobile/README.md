# Landlord mobile (Flutter)

This is the Android and iOS app for Landlord. It uses the **same Supabase
backend** as the web app, so plots, apartments, leases, documents and
encrypted fields stay in sync between the two.

## What it adds over the web app

| Feature | How |
| --- | --- |
| **Walk the boundary with GPS** | You walk the plot and the app records it, including with the screen off (Android foreground service, iOS background location). Fixes worse than 10 m are dropped. **Mark corner** averages 8 fixes, weighting the more accurate ones higher (`lib/core/geo/gps_filter.dart`). **Trace as I walk** records the path, and Douglas–Peucker smoothing cleans it up before saving. You can also tap the map to add points. |
| **Camera document scan** | The phone's own document scanner (ML Kit on Android, VisionKit on iOS) detects page edges and produces a PDF. It is then encrypted and uploaded the same way the web does it. |
| **Biometric lock and secure keystore** | Fingerprint or face is required to open the app. The encryption key is kept in Keychain or Android secure storage, so you don't have to type the passphrase on every launch. |
| **Native push** | Rent-due and lease-expiry reminders come through FCM. The existing cron routes now also send to `device_push_tokens` (migration `0035`). |
| **Offline data** | Everything is cached in SQLite. Changes made offline wait in a queue (`lib/core/offline/`) and upload when you're back online. If two edits conflict, the last one saved wins. Uploading and opening documents still needs a connection. |
| **Offline maps** | Save the satellite tiles for any area, up to 3,000 tiles (same limit as the web). Areas you've already looked at are cached too. |

## Compatibility with the web app

- **Encryption.** `lib/core/crypto/encryption.dart` is a port of
  `lib/crypto/encryption.ts`: AES-256-GCM, PBKDF2-SHA256 with 600k iterations,
  and bytea sent as `\x`-hex. `test/encryption_test.dart` decrypts test values
  produced by the web code.
- **Validation and geometry.** Validation (`lib/core/validation/`), geometry
  (`lib/core/geo/geo.dart`) and area units are ports of the matching web
  files.
- **Encryption setup.** You set up encryption (passphrase and recovery code) on
  the web profile page. The app can unlock with either one.
- **Payments.** There are no payments in the app.

## Setup

1. Install Flutter (stable, 3.47 or newer). Then:
   ```sh
   cd mobile
   flutter pub get
   ```
2. Run the app with the same Supabase project the web uses:
   ```sh
   flutter run \
     --dart-define=SUPABASE_URL=https://<project>.supabase.co \
     --dart-define=SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```
3. Add `io.landlord.app://login-callback` in Supabase → Authentication →
   URL Configuration → Redirect URLs. Google sign-in and email confirmation
   need it.
4. Apply migration `supabase/migrations/0035_device_push_tokens.sql`.

### Push notifications (optional)

The app works without push. To turn it on:

1. Create a Firebase project and register the Android app
   (`io.landlord.landlord_mobile`) and the iOS app.
2. For iOS, upload an APNs key to Firebase.
3. Pass the app's Firebase settings at build time. No `google-services.json`
   is needed:
   ```sh
   --dart-define=FIREBASE_PROJECT_ID=... \
   --dart-define=FIREBASE_API_KEY=... \
   --dart-define=FIREBASE_SENDER_ID=... \
   --dart-define=FIREBASE_ANDROID_APP_ID=... \
   --dart-define=FIREBASE_IOS_APP_ID=...
   ```
4. On the web deployment, set `FCM_SERVICE_ACCOUNT_JSON` to a Firebase
   service-account key (the JSON on one line). This is server-only; never put
   it in a `NEXT_PUBLIC_` variable.
5. Enable rent reminders on the phone in **Settings → Rent reminders**.

### iOS

- In Xcode, enable these capabilities: *Push Notifications*,
  *Background Modes → Location updates, Remote notifications*.
- `Info.plist` already contains the usage text for location, camera and
  Face ID, and the URL scheme.

## Checks

```sh
flutter analyze
flutter test
flutter build apk --debug
```

CI runs the same checks (`.github/workflows/mobile.yml`).

## Not in this version yet

These are in the web app but not here yet: analytics, collaborators and
audit log, admin, CSV reports, payments, and guest mode.
