import 'package:dio/dio.dart';
import '../models/sync_queue_model.dart';
import '../utils/constants.dart';
import 'database_service.dart';
import 'api_service.dart';

class SyncService {
  final DatabaseService _db;
  final ApiService _apiService;

  SyncService({
    DatabaseService? databaseService,
    ApiService? apiService,
  })  : _db = databaseService ?? DatabaseService(),
        _apiService = apiService ?? ApiService();

  /// Queue a check-in action for sync
  Future<void> queueCheckIn(
    String userId,
    double latitude,
    double longitude, {
    String? address,
  }) async {
    final item = SyncQueueItem(
      action: 'check_in',
      userId: userId,
      latitude: latitude,
      longitude: longitude,
      address: address,
      timestamp: DateTime.now(),
    );
    await _db.addToSyncQueue(item);
  }

  /// Queue a check-out action for sync
  Future<void> queueCheckOut(
    String userId,
    double latitude,
    double longitude, {
    String? address,
  }) async {
    final item = SyncQueueItem(
      action: 'check_out',
      userId: userId,
      latitude: latitude,
      longitude: longitude,
      address: address,
      timestamp: DateTime.now(),
    );
    await _db.addToSyncQueue(item);
  }

  /// Process all pending sync items
  Future<SyncResult> processPendingSync() async {
    final pendingItems = await _db.getPendingSyncItems();
    
    if (pendingItems.isEmpty) {
      return SyncResult(success: true, processed: 0, failed: 0);
    }

    int successCount = 0;
    int failCount = 0;

    for (final item in pendingItems) {
      await _db.updateSyncItemStatus(item.id!, status: 'processing');

      try {
        bool synced = false;
        
        if (item.action == 'check_in') {
          synced = await _syncCheckIn(item);
        } else if (item.action == 'check_out') {
          synced = await _syncCheckOut(item);
        }

        if (synced) {
          await _db.removeSyncItem(item.id!);
          successCount++;
        } else {
          await _db.updateSyncItemStatus(
            item.id!,
            status: 'failed',
            retryCount: item.retryCount + 1,
          );
          failCount++;
        }
      } catch (e) {
        await _db.updateSyncItemStatus(
          item.id!,
          status: 'pending',
          retryCount: item.retryCount + 1,
          errorMessage: e.toString(),
        );
        failCount++;
      }
    }

    return SyncResult(
      success: failCount == 0,
      processed: successCount,
      failed: failCount,
    );
  }

  Future<bool> _syncCheckIn(SyncQueueItem item) async {
    try {
      final response = await _apiService.dio.post(
        '/attendance/check-in',
        data: {
          'latitude': item.latitude,
          'longitude': item.longitude,
        },
      );
      return response.statusCode == 201 && response.data['success'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) {
        // Already checked in or other validation error - mark as completed
        return true;
      }
      rethrow;
    }
  }

  Future<bool> _syncCheckOut(SyncQueueItem item) async {
    try {
      final response = await _apiService.dio.post(
        '/attendance/check-out',
        data: {
          'latitude': item.latitude,
          'longitude': item.longitude,
        },
      );
      return response.statusCode == 200 && response.data['success'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) {
        // Not checked in or already checked out
        return true;
      }
      rethrow;
    }
  }

  /// Get pending sync count
  Future<int> getPendingCount() async {
    final items = await _db.getPendingSyncItems();
    return items.length;
  }

  /// Clear old completed items
  Future<void> cleanup() async {
    await _db.clearCompletedSyncItems();
  }
}

class SyncResult {
  final bool success;
  final int processed;
  final int failed;

  SyncResult({
    required this.success,
    required this.processed,
    required this.failed,
  });
}