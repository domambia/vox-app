import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import 'kyc_history_screen.dart';
import 'kyc_initiate_screen.dart';
import 'kyc_schedule_call_screen.dart';
import 'kyc_service.dart';
import 'kyc_upload_document_screen.dart';

class KycHomeScreen extends StatefulWidget {
  const KycHomeScreen({super.key});

  static const routeName = '/profile/kyc';

  @override
  State<KycHomeScreen> createState() => _KycHomeScreenState();
}

class _KycHomeScreenState extends State<KycHomeScreen> {
  late final KycService _service;
  late Future<Map<String, dynamic>> _future;

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _service = KycService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.status();

    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (!mounted) return;
      _refresh();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _service.status();
    });
    await _future;
  }

  String _statusLabel(String raw) {
    switch (raw.toLowerCase()) {
      case 'pending':
        return context.l10n.phrase('Pending');
      case 'in_review':
        return context.l10n.phrase('In review');
      case 'approved':
        return context.l10n.phrase('Approved');
      case 'rejected':
        return context.l10n.phrase('Rejected');
      default:
        return raw.isEmpty ? context.l10n.phrase('Not started') : raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.kycVerification)),
      body: SafeArea(
        child: FutureBuilder<Map<String, dynamic>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        l10n.phrase('Failed to load KYC status'),
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _refresh, child: Text(l10n.retry)),
                    ],
                  ),
                ),
              );
            }

            final data = snapshot.data ?? const <String, dynamic>{};
            final status = (data['status'] ?? '').toString();
            final verificationId = (data['verification_id'] ?? data['verificationId'] ?? '').toString();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.verified_user),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.phrase('Status'),
                              style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _statusLabel(status),
                              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            if (verificationId.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                verificationId,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: _refresh,
                        icon: const Icon(Icons.refresh),
                        tooltip: l10n.phrase('Refresh'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.play_arrow),
                  title: Text(l10n.phrase('Initiate verification')),
                  onTap: () => Navigator.of(context).pushNamed(KycInitiateScreen.routeName),
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.upload_file),
                  title: Text(l10n.phrase('Upload document')),
                  onTap: () => Navigator.of(context).pushNamed(KycUploadDocumentScreen.routeName),
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.video_call),
                  title: Text(l10n.phrase('Schedule verification call')),
                  onTap: () => Navigator.of(context).pushNamed(KycScheduleCallScreen.routeName),
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.history),
                  title: Text(l10n.phrase('Verification history')),
                  onTap: () => Navigator.of(context).pushNamed(KycHistoryScreen.routeName),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
