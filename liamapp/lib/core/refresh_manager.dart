import 'dart:async';

import 'package:flutter/widgets.dart';

class RefreshManager extends ChangeNotifier {
  static final RefreshManager _instance = RefreshManager._internal();
  factory RefreshManager() => _instance;
  RefreshManager._internal();

  final Map<String, DateTime> _lastFetchTimes = {};
  final Map<String, bool> _isFetching = {};

  static const Duration defaultMinInterval = Duration(seconds: 30);
  static const Duration chatMinInterval = Duration(seconds: 10);
  static const Duration activeScreenInterval = Duration(seconds: 15);

  final _refreshTriggers = <String, StreamController<void>>{};

  bool shouldRefresh(String key, {Duration? minInterval}) {
    final interval = minInterval ?? defaultMinInterval;
    final lastFetch = _lastFetchTimes[key];

    if (lastFetch == null) return true;

    return DateTime.now().difference(lastFetch) >= interval;
  }

  bool canFetch(String key) {
    return _isFetching[key] != true;
  }

  void markFetchStarted(String key) {
    _isFetching[key] = true;
  }

  void markFetchCompleted(String key) {
    _lastFetchTimes[key] = DateTime.now();
    _isFetching[key] = false;
  }

  void invalidate(String key) {
    _lastFetchTimes.remove(key);
  }

  void invalidatePattern(String pattern) {
    final keysToRemove = _lastFetchTimes.keys
        .where((k) => k.contains(pattern))
        .toList();
    for (final key in keysToRemove) {
      _lastFetchTimes.remove(key);
    }
  }

  void triggerRefresh(String key) {
    invalidate(key);
    _refreshTriggers[key]?.add(null);
  }

  Stream<void> getRefreshStream(String key) {
    _refreshTriggers[key] ??= StreamController<void>.broadcast();
    return _refreshTriggers[key]!.stream;
  }

  void clear() {
    _lastFetchTimes.clear();
    _isFetching.clear();
  }

  @override
  void dispose() {
    for (final controller in _refreshTriggers.values) {
      controller.close();
    }
    _refreshTriggers.clear();
    super.dispose();
  }
}

mixin RefreshableMixin<T extends StatefulWidget> on State<T> {
  final RefreshManager _refreshManager = RefreshManager();
  Timer? _refreshTimer;
  StreamSubscription<void>? _refreshSubscription;
  bool _isVisible = true;

  String get refreshKey;
  Duration get refreshInterval => RefreshManager.defaultMinInterval;

  Future<void> performRefresh();

  @protected
  void initRefresh() {
    _startRefreshTimer();
    _refreshSubscription = _refreshManager.getRefreshStream(refreshKey).listen((_) {
      if (_isVisible && mounted) {
        performRefresh();
      }
    });
  }

  @protected
  void disposeRefresh() {
    _refreshTimer?.cancel();
    _refreshSubscription?.cancel();
  }

  void _startRefreshTimer() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(refreshInterval, (_) {
      if (_isVisible && mounted && _refreshManager.shouldRefresh(refreshKey, minInterval: refreshInterval)) {
        performRefresh();
      }
    });
  }

  @protected
  void onVisibilityChanged(bool visible) {
    _isVisible = visible;
    if (visible && _refreshManager.shouldRefresh(refreshKey, minInterval: refreshInterval)) {
      performRefresh();
    }
  }

  @protected
  Future<void> refreshIfNeeded() async {
    if (!_refreshManager.canFetch(refreshKey)) return;
    if (!_refreshManager.shouldRefresh(refreshKey, minInterval: refreshInterval)) return;

    _refreshManager.markFetchStarted(refreshKey);
    try {
      await performRefresh();
    } finally {
      _refreshManager.markFetchCompleted(refreshKey);
    }
  }

  @protected
  void markRefreshCompleted() {
    _refreshManager.markFetchCompleted(refreshKey);
  }

  @protected
  void triggerManualRefresh() {
    _refreshManager.invalidate(refreshKey);
    performRefresh();
  }
}
