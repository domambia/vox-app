import 'package:flutter/material.dart';

import 'push_notification_router.dart';

/// WhatsApp-style top banner for foreground FCM (slides in, auto-dismiss, tap to open).
void showInAppPushBanner({
  required BuildContext context,
  required String title,
  required String body,
  required Map<String, String> data,
  Duration displayDuration = const Duration(seconds: 4),
}) {
  final overlay = Overlay.maybeOf(context);
  if (overlay == null) return;

  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (ctx) => _InAppPushBannerLayer(
      title: title,
      body: body,
      data: data,
      displayDuration: displayDuration,
      onRemove: () {
        entry.remove();
      },
    ),
  );
  overlay.insert(entry);
}

class _InAppPushBannerLayer extends StatefulWidget {
  const _InAppPushBannerLayer({
    required this.title,
    required this.body,
    required this.data,
    required this.displayDuration,
    required this.onRemove,
  });

  final String title;
  final String body;
  final Map<String, String> data;
  final Duration displayDuration;
  final VoidCallback onRemove;

  @override
  State<_InAppPushBannerLayer> createState() => _InAppPushBannerLayerState();
}

class _InAppPushBannerLayerState extends State<_InAppPushBannerLayer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _slide = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();

    Future<void>.delayed(widget.displayDuration, () {
      if (!mounted) return;
      _dismiss();
    });
  }

  Future<void> _dismiss() async {
    if (!mounted) return;
    await _controller.reverse();
    if (!mounted) return;
    widget.onRemove();
  }

  void _onTap() {
    if (widget.data.isNotEmpty) {
      PushNotificationRouter.notify(Map<String, String>.from(widget.data));
    }
    _dismiss();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Positioned(
      left: 0,
      right: 0,
      top: 0,
      child: Material(
        color: Colors.transparent,
        child: Padding(
          padding: EdgeInsets.only(left: 10, right: 10, top: top + 6),
          child: SlideTransition(
            position: _slide,
            child: GestureDetector(
              onVerticalDragEnd: (details) {
                if ((details.primaryVelocity ?? 0) < -80) {
                  _dismiss();
                }
              },
              onTap: _onTap,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xFF1E2A30),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFF25D366).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.notifications_active_rounded, color: Color(0xFF25D366), size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                            if (widget.body.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                widget.body,
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.82),
                                  fontSize: 14,
                                  height: 1.25,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
