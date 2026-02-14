import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../settings/settings_controller.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  static const routeName = '/profile/settings';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = Provider.of<SettingsController>(context, listen: true);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          TextButton(
            onPressed: () async {
              await settings.reset();
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Settings reset')),
              );
            },
            child: const Text('Reset'),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Text(
              'Accessibility',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            _DropdownTile(
              leading: Icons.text_fields,
              title: 'Font size',
              value: settings.accessibility.fontSize,
              items: const {
                'small': 'Small',
                'medium': 'Medium',
                'large': 'Large',
                'extraLarge': 'Extra Large',
              },
              onChanged: (v) => settings.updateAccessibility(
                settings.accessibility.copyWith(fontSize: v),
              ),
            ),
            _SliderTile(
              leading: Icons.record_voice_over,
              title: 'Voice speed',
              value: settings.accessibility.voiceSpeed,
              min: 0.5,
              max: 2.0,
              divisions: 15,
              onChangedEnd: (v) => settings.updateAccessibility(
                settings.accessibility.copyWith(voiceSpeed: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.vibration),
              title: const Text('Haptics'),
              value: settings.accessibility.hapticEnabled,
              onChanged: (v) => settings.updateAccessibility(
                settings.accessibility.copyWith(hapticEnabled: v),
              ),
            ),
            _DropdownTile(
              leading: Icons.vibration,
              title: 'Haptic intensity',
              value: settings.accessibility.hapticIntensity,
              items: const {
                'light': 'Light',
                'medium': 'Medium',
                'strong': 'Strong',
              },
              onChanged: (v) => settings.updateAccessibility(
                settings.accessibility.copyWith(hapticIntensity: v),
              ),
            ),
            _DropdownTile(
              leading: Icons.announcement,
              title: 'Announcement verbosity',
              value: settings.accessibility.announcementVerbosity,
              items: const {
                'brief': 'Brief',
                'normal': 'Normal',
                'detailed': 'Detailed',
              },
              onChanged: (v) => settings.updateAccessibility(
                settings.accessibility.copyWith(announcementVerbosity: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.image),
              title: const Text('Image descriptions'),
              value: settings.accessibility.enableImageDescriptions,
              onChanged: (v) => settings.updateAccessibility(
                settings.accessibility.copyWith(enableImageDescriptions: v),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Theme',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            _DropdownTile(
              leading: Icons.palette,
              title: 'Theme',
              value: settings.theme.theme,
              items: const {
                'system': 'System',
                'light': 'Light',
                'dark': 'Dark',
              },
              onChanged: (v) => settings.updateTheme(settings.theme.copyWith(theme: v)),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.contrast),
              title: const Text('High contrast'),
              value: settings.theme.highContrast,
              onChanged: (v) => settings.updateTheme(settings.theme.copyWith(highContrast: v)),
            ),
            const SizedBox(height: 20),
            Text(
              'Notifications',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.message),
              title: const Text('Message notifications'),
              value: settings.notifications.messageNotifications,
              onChanged: (v) => settings.updateNotifications(
                settings.notifications.copyWith(messageNotifications: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.favorite),
              title: const Text('Match notifications'),
              value: settings.notifications.matchNotifications,
              onChanged: (v) => settings.updateNotifications(
                settings.notifications.copyWith(matchNotifications: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.event),
              title: const Text('Event notifications'),
              value: settings.notifications.eventNotifications,
              onChanged: (v) => settings.updateNotifications(
                settings.notifications.copyWith(eventNotifications: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.group),
              title: const Text('Group notifications'),
              value: settings.notifications.groupNotifications,
              onChanged: (v) => settings.updateNotifications(
                settings.notifications.copyWith(groupNotifications: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.volume_up),
              title: const Text('Sound'),
              value: settings.notifications.soundEnabled,
              onChanged: (v) => settings.updateNotifications(
                settings.notifications.copyWith(soundEnabled: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.vibration),
              title: const Text('Vibration'),
              value: settings.notifications.vibrationEnabled,
              onChanged: (v) => settings.updateNotifications(
                settings.notifications.copyWith(vibrationEnabled: v),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Privacy',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.circle),
              title: const Text('Show online status'),
              value: settings.privacy.showOnlineStatus,
              onChanged: (v) => settings.updatePrivacy(
                settings.privacy.copyWith(showOnlineStatus: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.schedule),
              title: const Text('Show last seen'),
              value: settings.privacy.showLastSeen,
              onChanged: (v) => settings.updatePrivacy(
                settings.privacy.copyWith(showLastSeen: v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              secondary: const Icon(Icons.visibility),
              title: const Text('Allow profile views'),
              value: settings.privacy.allowProfileViews,
              onChanged: (v) => settings.updatePrivacy(
                settings.privacy.copyWith(allowProfileViews: v),
              ),
            ),
            _DropdownTile(
              leading: Icons.lock,
              title: 'Allow messages from',
              value: settings.privacy.allowMessagesFrom,
              items: const {
                'everyone': 'Everyone',
                'matches': 'Matches',
                'none': 'Nobody',
              },
              onChanged: (v) => settings.updatePrivacy(
                settings.privacy.copyWith(allowMessagesFrom: v),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DropdownTile extends StatelessWidget {
  const _DropdownTile({
    required this.leading,
    required this.title,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final IconData leading;
  final String title;
  final String value;
  final Map<String, String> items;
  final Future<void> Function(String value) onChanged;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(leading),
      title: Text(title),
      trailing: DropdownButton<String>(
        value: items.containsKey(value) ? value : items.keys.first,
        items: items.entries
            .map(
              (e) => DropdownMenuItem<String>(
                value: e.key,
                child: Text(e.value),
              ),
            )
            .toList(),
        onChanged: (v) {
          final next = v;
          if (next == null) return;
          onChanged(next);
        },
      ),
    );
  }
}

class _SliderTile extends StatefulWidget {
  const _SliderTile({
    required this.leading,
    required this.title,
    required this.value,
    required this.min,
    required this.max,
    required this.divisions,
    required this.onChangedEnd,
  });

  final IconData leading;
  final String title;
  final double value;
  final double min;
  final double max;
  final int divisions;
  final Future<void> Function(double value) onChangedEnd;

  @override
  State<_SliderTile> createState() => _SliderTileState();
}

class _SliderTileState extends State<_SliderTile> {
  late double _value;

  @override
  void initState() {
    super.initState();
    _value = widget.value;
  }

  @override
  void didUpdateWidget(covariant _SliderTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      _value = widget.value;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(widget.leading),
      title: Text(widget.title),
      subtitle: Slider(
        value: _value,
        min: widget.min,
        max: widget.max,
        divisions: widget.divisions,
        label: _value.toStringAsFixed(2),
        onChanged: (v) => setState(() => _value = v),
        onChangeEnd: (v) => widget.onChangedEnd(v),
      ),
      trailing: Text(_value.toStringAsFixed(2)),
    );
  }
}
