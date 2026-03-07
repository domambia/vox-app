import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';

import '../../core/app_localizations.dart';
import '../../core/toast.dart';
import 'auth_controller.dart';

class OtpRegisterScreen extends StatefulWidget {
  const OtpRegisterScreen({super.key});

  static const routeName = '/auth/register';

  @override
  State<OtpRegisterScreen> createState() => _OtpRegisterScreenState();
}

class _OtpRegisterScreenState extends State<OtpRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _countryCodeController = TextEditingController(text: 'MT');

  bool _isSubmitting = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _countryCodeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) return;

    setState(() => _isSubmitting = true);
    try {
      final auth = Provider.of<AuthController>(context, listen: false);
      if (!mounted) return;
      await auth.register(
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        email: _emailController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        password: _passwordController.text,
        countryCode: _countryCodeController.text.trim().toUpperCase(),
      );

      if (!mounted) return;
      showToast(context, context.l10n.phrase('Account created. Please sign in.'));
      Navigator.of(context).pushNamedAndRemoveUntil('/auth/login', (r) => false);
    } on DioException catch (e) {
      if (!mounted) return;
      showToast(context, messageFromDioException(e), isError: true);
    } catch (e) {
      if (!mounted) return;
      showToast(context, context.l10n.phrase('Registration failed. Please try again.'), isError: true);
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
        title: Text(l10n.phrase('Sign up')),
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
                  l10n.phrase('Create an account'),
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.phrase('Sign up with your details.'),
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
                    controller: _firstNameController,
                    decoration: InputDecoration(
                      labelText: l10n.phrase('First name'),
                    ),
                    validator: (value) {
                      final v = (value ?? '').trim();
                      if (v.isEmpty) return l10n.phrase('First name is required');
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _lastNameController,
                    decoration: InputDecoration(
                      labelText: l10n.phrase('Last name'),
                    ),
                    validator: (value) {
                      final v = (value ?? '').trim();
                      if (v.isEmpty) return l10n.phrase('Last name is required');
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: l10n.phrase('Email'),
                    ),
                    validator: (value) {
                      final v = (value ?? '').trim();
                      if (v.isEmpty) return l10n.phrase('Email is required');
                      if (!v.contains('@')) return l10n.phrase('Enter a valid email');
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: l10n.phrase('Phone number'),
                      hintText: l10n.phrase('+1234567890'),
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9+]')),
                    ],
                    onChanged: (raw) {
                      final v = raw.trim();
                      if (v.isEmpty) return;
                      if (!v.startsWith('+')) {
                        final fixed = '+${v.replaceAll('+', '')}';
                        _phoneController.value = _phoneController.value.copyWith(
                          text: fixed,
                          selection: TextSelection.collapsed(offset: fixed.length),
                          composing: TextRange.empty,
                        );
                      }
                    },
                    validator: (value) {
                      final v = (value ?? '').trim();
                      if (v.isEmpty) return l10n.phrase('Phone number is required');
                      if (!v.startsWith('+') || v.length < 8) {
                        return l10n.phrase('Use international format, e.g. +1234567890');
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _countryCodeController,
                    enabled: false,
                    decoration: InputDecoration(
                      labelText: l10n.phrase('Country code'),
                      hintText: l10n.phrase('MT'),
                    ),
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
                      if (v.length < 8) return l10n.phrase('Password must be at least 8 characters');
                      if (!RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$').hasMatch(v)) {
                        return l10n.phrase('Use at least one uppercase, one lowercase and one number');
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _isSubmitting ? null : _submit,
                      child: Text(_isSubmitting ? l10n.phrase('Registering...') : l10n.phrase('Register')),
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
