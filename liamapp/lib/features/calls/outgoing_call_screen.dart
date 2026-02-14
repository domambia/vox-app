import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import 'calls_service.dart';

class OutgoingCallScreen extends StatefulWidget {
  const OutgoingCallScreen({
    super.key,
    required this.callId,
    required this.receiverId,
    required this.receiverName,
  });

  static const routeName = '/calls/outgoing';

  final String callId;
  final String receiverId;
  final String receiverName;

  @override
  State<OutgoingCallScreen> createState() => _OutgoingCallScreenState();
}

class _OutgoingCallScreenState extends State<OutgoingCallScreen> {
  late final CallsService _service;
  bool _ending = false;

  @override
  void initState() {
    super.initState();
    _service = CallsService(Provider.of<ApiClient>(context, listen: false));
  }

  Future<void> _end() async {
    if (_ending) return;
    setState(() => _ending = true);
    try {
      await _service.endCall(callId: widget.callId);
    } finally {
      if (!mounted) return;
      Navigator.of(context).pop();
    }
  }

  Future<void> _markAnswered() async {
    await _service.updateStatus(callId: widget.callId, status: 'ANSWERED');
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Call answered (API state updated).')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Calling')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
          child: Column(
            children: [
              const SizedBox(height: 24),
              CircleAvatar(
                radius: 48,
                child: Text(
                  widget.receiverName.isNotEmpty ? widget.receiverName[0].toUpperCase() : '?',
                  style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                widget.receiverName,
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                'Ringing…',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const Spacer(),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _markAnswered,
                      icon: const Icon(Icons.call),
                      label: const Text('Simulate Answer'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _ending ? null : _end,
                      icon: const Icon(Icons.call_end),
                      label: Text(_ending ? 'Ending…' : 'End'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
