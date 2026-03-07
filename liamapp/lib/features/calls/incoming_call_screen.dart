import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_localizations.dart';
import 'call_manager.dart';
import 'active_call_screen.dart';

class IncomingCallScreen extends StatefulWidget {
  const IncomingCallScreen({
    super.key,
    required this.callId,
    required this.callerName,
    required this.callerId,
  });

  static const routeName = '/calls/incoming';

  final String callId;
  final String callerName;
  final String callerId;

  @override
  State<IncomingCallScreen> createState() => _IncomingCallScreenState();
}

class _IncomingCallScreenState extends State<IncomingCallScreen> {
  bool _isAnswering = false;
  bool _isRejecting = false;

  Future<void> _answer() async {
    if (_isAnswering || _isRejecting) return;

    setState(() => _isAnswering = true);

    try {
      final callManager = Provider.of<CallManager>(context, listen: false);
      await callManager.answerCall();

      if (!mounted) return;

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const ActiveCallScreen(),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isAnswering = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${context.l10n.phrase('Failed to answer call')}: $e')),
      );
    }
  }

  Future<void> _reject() async {
    if (_isAnswering || _isRejecting) return;

    setState(() => _isRejecting = true);

    try {
      final callManager = Provider.of<CallManager>(context, listen: false);
      await callManager.rejectCall();

      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isRejecting = false);
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
          child: Column(
            children: [
              const Spacer(),
              Text(
                l10n.phrase('Incoming Call'),
                style: theme.textTheme.titleMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),
              CircleAvatar(
                radius: 64,
                backgroundColor: colorScheme.primaryContainer,
                child: Text(
                  widget.callerName.isNotEmpty
                      ? widget.callerName[0].toUpperCase()
                      : '?',
                  style: theme.textTheme.displayMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                widget.callerName,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                l10n.phrase('Voice Call'),
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const Spacer(flex: 2),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _CallActionButton(
                    onPressed: _isRejecting ? null : _reject,
                    icon: Icons.call_end,
                    label: l10n.phrase('Decline'),
                    backgroundColor: colorScheme.error,
                    foregroundColor: colorScheme.onError,
                    isLoading: _isRejecting,
                  ),
                  _CallActionButton(
                    onPressed: _isAnswering ? null : _answer,
                    icon: Icons.call,
                    label: l10n.phrase('Accept'),
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    isLoading: _isAnswering,
                  ),
                ],
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}

class _CallActionButton extends StatelessWidget {
  const _CallActionButton({
    required this.onPressed,
    required this.icon,
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
    this.isLoading = false,
  });

  final VoidCallback? onPressed;
  final IconData icon;
  final String label;
  final Color backgroundColor;
  final Color foregroundColor;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 72,
          height: 72,
          child: ElevatedButton(
            onPressed: onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: backgroundColor,
              foregroundColor: foregroundColor,
              shape: const CircleBorder(),
              padding: EdgeInsets.zero,
            ),
            child: isLoading
                ? SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: foregroundColor,
                    ),
                  )
                : Icon(icon, size: 32),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
