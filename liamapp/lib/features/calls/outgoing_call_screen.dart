import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_localizations.dart';
import 'call_manager.dart';
import 'active_call_screen.dart';

class OutgoingCallScreen extends StatefulWidget {
  const OutgoingCallScreen({
    super.key,
    required this.receiverId,
    required this.receiverName,
  });

  static const routeName = '/calls/outgoing';

  final String receiverId;
  final String receiverName;

  @override
  State<OutgoingCallScreen> createState() => _OutgoingCallScreenState();
}

class _OutgoingCallScreenState extends State<OutgoingCallScreen> {
  bool _isEnding = false;
  bool _isInitializing = true;
  String? _error;
  StreamSubscription<void>? _callAnsweredSub;

  @override
  void initState() {
    super.initState();
    _initializeCall();
  }

  Future<void> _initializeCall() async {
    final callManager = Provider.of<CallManager>(context, listen: false);

    _callAnsweredSub = callManager.onIncomingCall.listen((_) {});

    try {
      await callManager.initiateCall(
        receiverId: widget.receiverId,
        receiverName: widget.receiverName,
      );

      if (!mounted) return;
      setState(() => _isInitializing = false);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _error = e.toString();
      });
    }
  }

  @override
  void dispose() {
    _callAnsweredSub?.cancel();
    super.dispose();
  }

  Future<void> _endCall() async {
    if (_isEnding) return;

    setState(() => _isEnding = true);

    try {
      final callManager = Provider.of<CallManager>(context, listen: false);
      await callManager.endCall();
    } finally {
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final l10n = context.l10n;

    return Consumer<CallManager>(
      builder: (context, callManager, _) {
        final state = callManager.state;

        if (state == CallState.connected || state == CallState.connecting) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => const ActiveCallScreen(),
                ),
              );
            }
          });
        }

        if (state == CallState.ended) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              final endReason = callManager.endReason;
              callManager.resetState();

              String message;
              switch (endReason) {
                case CallEndReason.rejected:
                  message = l10n.phrase('Call was declined');
                  break;
                case CallEndReason.missed:
                  message = l10n.phrase('No answer');
                  break;
                case CallEndReason.failed:
                  message = l10n.phrase('Call failed');
                  break;
                default:
                  message = l10n.phrase('Call ended');
              }

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(message)),
              );
              Navigator.of(context).pop();
            }
          });
        }

        return Scaffold(
          backgroundColor: colorScheme.surface,
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
              child: Column(
                children: [
                  const Spacer(),
                  if (_error != null) ...[
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: colorScheme.error,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      l10n.phrase('Failed to start call'),
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: colorScheme.error,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ] else ...[
                    Text(
                      _isInitializing ? l10n.phrase('Starting call...') : l10n.phrase('Calling'),
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 24),
                    CircleAvatar(
                      radius: 64,
                      backgroundColor: colorScheme.primaryContainer,
                      child: Text(
                        widget.receiverName.isNotEmpty
                            ? widget.receiverName[0].toUpperCase()
                            : '?',
                        style: theme.textTheme.displayMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      widget.receiverName,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    if (_isInitializing)
                      const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      Text(
                        l10n.phrase('Ringing...'),
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                  ],
                  const Spacer(flex: 2),
                  SizedBox(
                    width: 72,
                    height: 72,
                    child: ElevatedButton(
                      onPressed: _isEnding ? null : _endCall,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colorScheme.error,
                        foregroundColor: colorScheme.onError,
                        shape: const CircleBorder(),
                        padding: EdgeInsets.zero,
                      ),
                      child: _isEnding
                          ? SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: colorScheme.onError,
                              ),
                            )
                          : const Icon(Icons.call_end, size: 32),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _error != null ? l10n.phrase('Go Back') : l10n.cancel,
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 48),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
