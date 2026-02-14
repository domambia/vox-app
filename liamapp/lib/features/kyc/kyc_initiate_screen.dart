import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import 'kyc_service.dart';

class KycInitiateScreen extends StatefulWidget {
  const KycInitiateScreen({super.key});

  static const routeName = '/profile/kyc/initiate';

  @override
  State<KycInitiateScreen> createState() => _KycInitiateScreenState();
}

class _KycInitiateScreenState extends State<KycInitiateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _countryController = TextEditingController();

  String _documentType = 'passport';
  bool _submitting = false;

  @override
  void dispose() {
    _countryController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final ok = _formKey.currentState?.validate() ?? false;
    if (!ok) return;

    setState(() => _submitting = true);
    try {
      final service = KycService(Provider.of<ApiClient>(context, listen: false));
      await service.initiate(
        documentType: _documentType,
        country: _countryController.text.trim().isEmpty ? null : _countryController.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Initiate KYC')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Form(
              key: _formKey,
              child: Column(
                children: [
                  DropdownButtonFormField<String>(
                    value: _documentType,
                    decoration: const InputDecoration(labelText: 'Document type'),
                    items: const [
                      DropdownMenuItem(value: 'passport', child: Text('Passport')),
                      DropdownMenuItem(value: 'id_card', child: Text('ID Card')),
                      DropdownMenuItem(value: 'driver_license', child: Text('Driver License')),
                    ],
                    onChanged: (v) {
                      if (v == null) return;
                      setState(() => _documentType = v);
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _countryController,
                    decoration: const InputDecoration(labelText: 'Country (optional)', hintText: 'US'),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: Text(_submitting ? 'Submitting...' : 'Initiate'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
