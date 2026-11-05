import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

const _channel = MethodChannel('landlord/backup');

/// Marks [paths] as excluded from iCloud backups (iOS only; Android excludes
/// app data in AndroidManifest.xml). The offline database and map tiles are
/// rebuilt from the server on sign-in, so nothing is lost. Never throws:
/// failing to set the flag must not block startup.
Future<void> excludeFromBackup(List<String> paths, {bool? isIOS}) async {
  if (!(isIOS ?? Platform.isIOS)) return;
  try {
    await _channel.invokeMethod<void>('excludeFromBackup', paths);
  } catch (e) {
    debugPrint('Backup exclusion failed: $e');
  }
}
