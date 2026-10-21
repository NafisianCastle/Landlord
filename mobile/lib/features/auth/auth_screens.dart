import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/env.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme.dart';
import '../../core/validation/forms.dart';

const _minPasswordLength = 10; // same as app/actions/auth.ts

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _busy = false;
  String? _error;

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = context.l10n.errorMessage('$e'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _logIn() async {
    if (!_form.currentState!.validate()) return;
    await _run(() => ref
        .read(supabaseProvider)
        .auth
        .signInWithPassword(email: _email.text.trim(), password: _password.text));
  }

  Future<void> _google() => _run(() async {
        await ref.read(supabaseProvider).auth.signInWithOAuth(
              OAuthProvider.google,
              redirectTo: Env.authRedirect,
            );
      });

  Future<void> _forgot() async {
    final email = _email.text.trim();
    if (!emailPattern.hasMatch(email)) {
      _form.currentState!.validate();
      return;
    }
    await _run(() async {
      await ref.read(supabaseProvider).auth.resetPasswordForEmail(email);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(context.l10n.resetEmailSent)));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return _AuthScaffold(
      title: l.logIn,
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            OutlinedButton.icon(
              onPressed: _busy ? null : _google,
              icon: const Icon(Icons.g_mobiledata, size: 28),
              label: Text(l.continueWithGoogle),
            ),
            const SizedBox(height: 24),
            _EmailField(controller: _email),
            const SizedBox(height: 12),
            TextFormField(
              controller: _password,
              obscureText: true,
              autofillHints: const [AutofillHints.password],
              decoration: InputDecoration(labelText: l.password),
              validator: (v) => (v ?? '').isEmpty ? l.required : null,
            ),
            if (_error != null) _ErrorText(_error!),
            const SizedBox(height: 16),
            FilledButton(onPressed: _busy ? null : _logIn, child: Text(l.logIn)),
            TextButton(onPressed: _busy ? null : _forgot, child: Text(l.forgotPassword)),
            TextButton(
              onPressed: () => context.go('/signup'),
              child: Text('${l.noAccount} ${l.signUp}'),
            ),
          ],
        ),
      ),
    );
  }
}

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _referral = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _busy = false;
  String? _error;

  Future<void> _signUp() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final l = context.l10n;
    final client = ref.read(supabaseProvider);
    try {
      final code = _referral.text.trim();
      // Same metadata the web's signUp action sends.
      final res = await client.auth.signUp(
        email: _email.text.trim(),
        password: _password.text,
        data: {'full_name': _name.text.trim(), if (code.isNotEmpty) 'referral_code': code},
        emailRedirectTo: Env.authRedirect,
      );
      if (res.session == null && mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l.checkEmailToConfirm)));
        context.go('/login');
      }
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return _AuthScaffold(
      title: l.signUp,
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _name,
              decoration: InputDecoration(labelText: l.fullName),
              validator: (v) => (v ?? '').length > 200 ? l.required : null,
            ),
            const SizedBox(height: 12),
            _EmailField(controller: _email),
            const SizedBox(height: 12),
            TextFormField(
              controller: _password,
              obscureText: true,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(labelText: l.password),
              validator: (v) => (v ?? '').length < _minPasswordLength ? l.passwordTooShort : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _referral,
              decoration: InputDecoration(labelText: l.referralCode),
            ),
            if (_error != null) _ErrorText(_error!),
            const SizedBox(height: 16),
            FilledButton(onPressed: _busy ? null : _signUp, child: Text(l.signUp)),
            TextButton(
              onPressed: () => context.go('/login'),
              child: Text('${l.haveAccount} ${l.logIn}'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthScaffold extends StatelessWidget {
  const _AuthScaffold({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.landscape, size: 56, color: Brand.forest),
                  const SizedBox(height: 8),
                  Text(context.l10n.appTitle,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text(title,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 24),
                  child,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmailField extends StatelessWidget {
  const _EmailField({required this.controller});
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.emailAddress,
      autofillHints: const [AutofillHints.email],
      decoration: InputDecoration(labelText: context.l10n.email),
      validator: (v) => emailPattern.hasMatch(v?.trim() ?? '') ? null : context.l10n.required,
    );
  }
}

class _ErrorText extends StatelessWidget {
  const _ErrorText(this.message);
  final String message;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Text(message, style: TextStyle(color: Theme.of(context).colorScheme.error)),
      );
}
