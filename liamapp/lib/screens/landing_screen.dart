import 'package:flutter/material.dart';

import '../core/app_localizations.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final l10n = context.l10n;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              backgroundColor: colorScheme.surface,
              foregroundColor: colorScheme.onSurface,
              title: Text(l10n.appTitle),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Semantics(
                        image: true,
                        label: l10n.phrase('LiamApp icon'),
                        child: Image.asset(
                          'assets/logo.png',
                          width: 96,
                          height: 96,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      l10n.phrase('Welcome to LiamApp'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.phrase('A voice-first, accessibility-first community app.'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: 24),
                    _FeatureSection(
                      title: l10n.phrase('Made for accessibility'),
                      body:
                          l10n.phrase(
                            'Designed to work great with screen readers, clear labels, and simple navigation patterns.',
                          ),
                    ),
                    const SizedBox(height: 12),
                    _FeatureSection(
                      title: l10n.phrase('Connect with people'),
                      body:
                          l10n.phrase(
                            'Meet, chat, and build community with people who share similar experiences.',
                          ),
                    ),
                    const SizedBox(height: 12),
                    _FeatureSection(
                      title: l10n.phrase('Events and groups'),
                      body:
                          l10n.phrase('Discover community events and join groups that match your interests.'),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => Navigator.of(context).pushNamed('/auth/login'),
                      child: Text(l10n.phrase('Login')),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () => Navigator.of(context).pushNamed('/auth/register'),
                      child: Text(l10n.phrase('Sign up')),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureSection extends StatelessWidget {
  const _FeatureSection({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Semantics(
      container: true,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              body,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
