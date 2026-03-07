import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';

import '../../core/app_localizations.dart';
import '../../core/toast.dart';
import 'auth_controller.dart';

class OtpLoginScreen extends StatefulWidget {
  const OtpLoginScreen({super.key});

  static const routeName = '/auth/login';

  @override
  State<OtpLoginScreen> createState() => _OtpLoginScreenState();
}

class _OtpLoginScreenState extends State<OtpLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneOrEmailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isSubmitting = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _phoneOrEmailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) return;

    setState(() => _isSubmitting = true);
    try {
      final auth = Provider.of<AuthController>(context, listen: false);
      try {
        await auth.login(
          phoneOrEmail: _phoneOrEmailController.text.trim(),
          password: _passwordController.text,
        );
      } on DioException catch (e) {
        final text = messageFromDioException(e);
        if (!mounted) return;
        showToast(context, text, isError: true);
        return;
      }

      if (!mounted) return;
      showToast(context, context.l10n.phrase('Logged in successfully'));
      Navigator.of(context).pushNamedAndRemoveUntil('/app', (r) => false);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.phrase('Login')),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Image.asset('assets/logo.png', height: 72),
                  ),
                ),
                Text(
                  l10n.phrase('Sign in'),
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.phrase('Enter your phone number or email and password.'),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 24),
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _phoneOrEmailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        decoration: InputDecoration(
                          labelText: l10n.phrase('Phone or email'),
                          hintText: l10n.phrase('+35612345678 or user@example.com'),
                        ),
                        validator: (value) {
                          final v = (value ?? '').trim();
                          if (v.isEmpty) return l10n.phrase('Phone number or email is required');
                          if (v.contains('@')) {
                            if (!RegExp(r'^[^@]+@[^@]+\.[^@]+$').hasMatch(v)) {
                              return l10n.phrase('Enter a valid email address');
                            }
                          } else {
                            if (!v.startsWith('+') || v.length < 8) {
                              return l10n.phrase('Use international format, e.g. +35612345678');
                            }
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: l10n.phrase('Password'),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                            ),
                            onPressed: () {
                              setState(() => _obscurePassword = !_obscurePassword);
                            },
                          ),
                        ),
                        validator: (value) {
                          final v = (value ?? '').trim();
                          if (v.isEmpty) return l10n.phrase('Password is required');
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _isSubmitting ? null : _submit,
                          child: Text(_isSubmitting ? l10n.phrase('Logging in...') : l10n.phrase('Log in')),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
