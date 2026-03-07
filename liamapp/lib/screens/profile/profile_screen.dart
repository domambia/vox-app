import 'package:flutter/material.dart';

import '../../core/app_localizations.dart';
import '../../core/toast.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  static const routeName = '/profile';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.phrase('Profile')),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).pushReplacementNamed('/'),
            icon: const Icon(Icons.logout),
            tooltip: l10n.logout,
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: theme.colorScheme.onPrimary,
                      child: const Text(
                        'LA',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.phrase('LiamApp User'),
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l10n.phrase('Accessibility-first community member'),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.settings),
                title: Text(l10n.settings),
                subtitle: Text(l10n.phrase('Preferences for accessibility and app behavior')),
                onTap: () {
                  showToast(context, l10n.phrase('Next: implement settings like mob-app.'));
                },
              ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.event),
                title: Text(l10n.phrase('Events')),
                subtitle: Text(l10n.phrase('Create and RSVP to community events')),
                onTap: () {
                  showToast(context, l10n.phrase('Next: implement events screens.'));
                },
              ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.group),
                title: Text(l10n.phrase('Groups')),
                subtitle: Text(l10n.phrase('Join groups and chat with members')),
                onTap: () {
                  showToast(context, l10n.phrase('Next: implement groups screens.'));
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
