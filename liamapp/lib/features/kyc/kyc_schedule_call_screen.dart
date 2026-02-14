import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import 'kyc_service.dart';

class KycScheduleCallScreen extends StatefulWidget {
  const KycScheduleCallScreen({super.key});

  static const routeName = '/profile/kyc/schedule-call';

  @override
  State<KycScheduleCallScreen> createState() => _KycScheduleCallScreenState();
}

class _KycScheduleCallScreenState extends State<KycScheduleCallScreen> {
  DateTime _scheduledAt = DateTime.now().add(const Duration(days: 1));
  final _timezoneController = TextEditingController(text: 'UTC');

  bool _submitting = false;

  @override
  void dispose() {
    _timezoneController.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      initialDate: _scheduledAt,
    );
    if (date == null) return;

    if (!mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledAt),
    );
    if (time == null) return;

    setState(() {
      _scheduledAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  Future<void> _submit() async {
    if (_submitting) return;

    setState(() => _submitting = true);
    try {
      final service = KycService(Provider.of<ApiClient>(context, listen: false));
      await service.scheduleCall(
        scheduledAt: _scheduledAt,
        timezone: _timezoneController.text.trim().isEmpty ? 'UTC' : _timezoneController.text.trim(),
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
      appBar: AppBar(title: const Text('Schedule call')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.schedule),
              title: const Text('Scheduled at'),
              subtitle: Text(_scheduledAt.toString()),
              onTap: _pickDateTime,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _timezoneController,
              decoration: const InputDecoration(labelText: 'Timezone', hintText: 'America/New_York'),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _submitting ? null : _submit,
                child: Text(_submitting ? 'Scheduling...' : 'Schedule'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
