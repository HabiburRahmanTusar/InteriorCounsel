import 'package:flutter/material.dart';
import '../services/connectivity_service.dart';
import '../services/sync_service.dart';

class ConnectivityProvider extends ChangeNotifier {
  final ConnectivityService _connectivityService;
  final SyncService _syncService;
  bool _isOnline = true;
  bool _isSyncing = false;
  String? _lastSyncMessage;

  ConnectivityProvider({
    ConnectivityService? connectivityService,
    SyncService? syncService,
  })  : _connectivityService = connectivityService ?? ConnectivityService(),
        _syncService = syncService ?? SyncService() {
    _connectivityService.connectionStream.listen((online) {
      final wasOffline = !_isOnline && online;
      _isOnline = online;
      notifyListeners();

      if (wasOffline) {
        _triggerSync();
      }
    });
  }

  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  String? get lastSyncMessage => _lastSyncMessage;
  bool get isOffline => !_isOnline;

  Future<void> initialize() async {
    await _connectivityService.initialize();
  }

  Future<void> _triggerSync() async {
    _isSyncing = true;
    _lastSyncMessage = 'Syncing changes...';
    notifyListeners();

    try {
      final result = await _syncService.processPendingSync();
      if (result.processed > 0) {
        _lastSyncMessage = 'Synced ${result.processed} changes';
      } else {
        _lastSyncMessage = 'All changes synced';
      }
    } catch (e) {
      _lastSyncMessage = 'Sync failed';
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> manualSync() async {
    if (!_isOnline) return;
    await _triggerSync();
  }

  void clearSyncMessage() {
    _lastSyncMessage = null;
    notifyListeners();
  }
}