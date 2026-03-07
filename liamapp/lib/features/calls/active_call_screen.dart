import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_localizations.dart';
import 'call_manager.dart';

class ActiveCallScreen extends StatefulWidget {
  const ActiveCallScreen({super.key});

  static const routeName = '/calls/active';

  @override
  State<ActiveCallScreen> createState() => _ActiveCallScreenState();
}

class _ActiveCallScreenState extends State<ActiveCallScreen> {
  bool _isEnding = false;

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (duration.inHours > 0) {
      final hours = duration.inHours.toString().padLeft(2, '0');
      return '$hours:$minutes:$seconds';
    }
    return '$minutes:$seconds';
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
        final currentCall = callManager.currentCall;
        final state = callManager.state;
        final duration = callManager.callDuration;

        if (state == CallState.ended) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              callManager.resetState();
              Navigator.of(context).pop();
            }
          });
        }

        final remoteName = currentCall?.remoteUserName ?? l10n.phrase('Unknown');
        final isConnected = state == CallState.connected;
        final isConnecting = state == CallState.connecting;

        String statusText;
        if (isConnected) {
          statusText = _formatDuration(duration);
        } else if (isConnecting) {
          statusText = l10n.phrase('Connecting...');
        } else {
          statusText = l10n.phrase('Call ended');
        }

        return Scaffold(
          backgroundColor: colorScheme.surface,
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
              child: Column(
                children: [
                  const Spacer(),
                  CircleAvatar(
                    radius: 64,
                    backgroundColor: colorScheme.primaryContainer,
                    child: Text(
                      remoteName.isNotEmpty ? remoteName[0].toUpperCase() : '?',
                      style: theme.textTheme.displayMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    remoteName,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    statusText,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: isConnected
                          ? Colors.green
                          : colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(flex: 2),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _CallControlButton(
                        icon: callManager.isMuted ? Icons.mic_off : Icons.mic,
                        label: callManager.isMuted ? l10n.phrase('Unmute') : l10n.phrase('Mute'),
                        isActive: callManager.isMuted,
                        onPressed: callManager.toggleMute,
                      ),
                      _CallControlButton(
                        icon: callManager.isSpeakerOn
                            ? Icons.volume_up
                            : Icons.volume_off,
                        label: l10n.phrase('Speaker'),
                        isActive: callManager.isSpeakerOn,
                        onPressed: callManager.toggleSpeaker,
                      ),
                    ],
                  ),
                  const SizedBox(height: 48),
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
                    l10n.phrase('End Call'),
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

class _CallControlButton extends StatelessWidget {
  const _CallControlButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.isActive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 56,
          height: 56,
          child: ElevatedButton(
            onPressed: onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  isActive ? colorScheme.primary : colorScheme.surfaceContainerHighest,
              foregroundColor:
                  isActive ? colorScheme.onPrimary : colorScheme.onSurface,
              shape: const CircleBorder(),
              padding: EdgeInsets.zero,
            ),
            child: Icon(icon, size: 24),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: theme.textTheme.bodySmall,
        ),
      ],
    );
  }
}
