import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_localizations.dart';
import 'kyc_service.dart';

class KycHistoryScreen extends StatefulWidget {
  const KycHistoryScreen({super.key});

  static const routeName = '/profile/kyc/history';

  @override
  State<KycHistoryScreen> createState() => _KycHistoryScreenState();
}

class _KycHistoryScreenState extends State<KycHistoryScreen> {
  late final KycService _service;
  late Future<List<dynamic>> _future;

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _service = KycService(Provider.of<ApiClient>(context, listen: false));
    _future = _service.history();

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
      _future = _service.history();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.phrase('KYC History'))),
      body: SafeArea(
        child: FutureBuilder<List<dynamic>>(
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
                        l10n.phrase('Failed to load history'),
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _refresh, child: Text(l10n.retry)),
                    ],
                  ),
                ),
              );
            }

            final items = snapshot.data ?? const [];
            if (items.isEmpty) {
              return Center(
                child: Text(
                  l10n.phrase('No verification attempts'),
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: items.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final v = items[index] as dynamic;
                  final status = (v?['status'] ?? '').toString();
                  final doc = (v?['document_type'] ?? v?['documentType'] ?? '').toString();
                  final created = (v?['created_at'] ?? v?['createdAt'] ?? '').toString();
                  final verificationId = (v?['verification_id'] ?? v?['verificationId'] ?? v?['id'] ?? '').toString();

                  return ListTile(
                    leading: const Icon(Icons.verified_user),
                    title: Text(status.isEmpty ? l10n.phrase('Verification') : status),
                    subtitle: Text(
                      [if (doc.isNotEmpty) doc, if (created.isNotEmpty) created, if (verificationId.isNotEmpty) verificationId]
                          .join(' • '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
