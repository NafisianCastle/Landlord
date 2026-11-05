import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/crypto/key_vault.dart';
import '../../core/l10n.dart';

class LockScreen extends ConsumerStatefulWidget {
  const LockScreen({super.key});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _unlock());
  }

  Future<void> _unlock() async {
    final ok = await ref
        .read(keyVaultProvider.notifier)
        .biometricUnlock(context.l10n.biometricReason)
        .catchError((_) => false);
    if (ok) ref.read(appLockProvider.notifier).unlocked();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_outline, size: 64),
            const SizedBox(height: 16),
            Text(l.appLocked, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _unlock,
              icon: const Icon(Icons.fingerprint),
              label: Text(l.unlock),
            ),
          ],
        ),
      ),
    );
  }
}
