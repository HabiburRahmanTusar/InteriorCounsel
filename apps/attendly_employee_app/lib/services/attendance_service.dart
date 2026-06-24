import 'package:dio/dio.dart';
import '../models/attendance_model.dart';
import '../models/api_response.dart';
import 'api_service.dart';
import 'database_service.dart';
import 'sync_service.dart';

class AttendanceService {
  final ApiService _apiService;
  final DatabaseService _db;
  final SyncService _syncService;

  AttendanceService({
    ApiService? apiService,
    DatabaseService? databaseService,
    SyncService? syncService,
  })  : _apiService = apiService ?? ApiService(),
        _db = databaseService ?? DatabaseService(),
        _syncService = syncService ?? SyncService();

  /// Get today's attendance status
  Future<AttendanceRecord?> getTodayStatus(String userId) async {
    // Try local first (for offline support)
    final local = await _db.getTodayAttendance(userId);
    
    // Try to fetch from server if online
    try {
      final response = await _apiService.dio.get('/attendance/status');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data != null) {
          final record = _parseStatusResponse(userId, data);
          await _db.insertAttendance(record);
          return record;
        }
      }
    } catch (e) {
      // Offline: return local data
    }

    return local;
  }

  /// Check in with GPS coordinates
  Future<ApiResponse<AttendanceRecord>> checkIn({
    required String userId,
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _apiService.dio.post(
        '/attendance/check-in',
        data: {'latitude': latitude, 'longitude': longitude},
      );

      if (response.statusCode == 201 && response.data['success'] == true) {
        final record = AttendanceRecord.fromJson(response.data['data']);
        await _db.insertAttendance(record);
        return ApiResponse(
          success: true,
          message: response.data['message'] ?? 'Check-in successful',
          data: record,
        );
      }

      return ApiResponse(
        success: false,
        message: response.data['message'] ?? 'Check-in failed',
      );
    } on DioException catch (e) {
      // Queue for sync if offline
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout) {
        await _syncService.queueCheckIn(userId, latitude, longitude);
        
        // Create local record
        final localRecord = AttendanceRecord(
          userId: userId,
          employeeId: '',
          attendanceDate: DateTime.now(),
          checkIn: CheckInOut(
            time: DateTime.now(),
            status: 'Pending Sync',
            location: LocationData(latitude: latitude, longitude: longitude),
          ),
          isSynced: false,
          pendingAction: 'check_in',
        );
        await _db.insertAttendance(localRecord);
        
        return ApiResponse(
          success: true,
          message: 'Check-in saved locally. Will sync when online.',
          data: localRecord,
        );
      }

      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(success: false, message: 'An unexpected error occurred');
    }
  }

  /// Check out with GPS coordinates
  Future<ApiResponse<AttendanceRecord>> checkOut({
    required String userId,
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _apiService.dio.post(
        '/attendance/check-out',
        data: {'latitude': latitude, 'longitude': longitude},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final record = AttendanceRecord.fromJson(response.data['data']);
        await _db.insertAttendance(record);
        return ApiResponse(
          success: true,
          message: response.data['message'] ?? 'Check-out successful',
          data: record,
        );
      }

      return ApiResponse(
        success: false,
        message: response.data['message'] ?? 'Check-out failed',
      );
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout) {
        await _syncService.queueCheckOut(userId, latitude, longitude);

        // Update local record
        final todayRecord = await _db.getTodayAttendance(userId);
        if (todayRecord != null) {
          final updated = todayRecord.copyWith(
            checkOut: CheckInOut(
              time: DateTime.now(),
              status: 'Pending Sync',
              location: LocationData(latitude: latitude, longitude: longitude),
            ),
            isSynced: false,
            pendingAction: 'check_out',
          );
          await _db.updateAttendance(updated);
          return ApiResponse(
            success: true,
            message: 'Check-out saved locally. Will sync when online.',
            data: updated,
          );
        }

        return ApiResponse(
          success: false,
          message: 'No check-in record found for today',
        );
      }

      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(success: false, message: 'An unexpected error occurred');
    }
  }

  /// Get attendance history
  Future<ApiResponse<List<AttendanceRecord>>> getHistory({
    String? userId,
    DateTime? from,
    DateTime? to,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (from != null) queryParams['from'] = from.toIso8601String();
      if (to != null) queryParams['to'] = to.toIso8601String();

      final response = await _apiService.dio.get(
        '/attendance/history',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] ?? [];
        final records = data.map((e) => AttendanceRecord.fromJson(e)).toList();
        
        // Cache locally
        for (final record in records) {
          await _db.insertAttendance(record);
        }

        return ApiResponse(
          success: true,
          message: 'History fetched',
          data: records,
          pagination: response.data['pagination'] != null
              ? Pagination.fromJson(response.data['pagination'])
              : null,
        );
      }

      return ApiResponse(success: false, message: 'Failed to fetch history');
    } catch (e) {
      // Return local data on error
      if (userId != null) {
        final localRecords = await _db.getAttendanceHistory(
          userId,
          from: from,
          to: to,
          page: page,
          limit: limit,
        );
        return ApiResponse(
          success: true,
          message: 'Showing cached data',
          data: localRecords,
        );
      }
      return ApiResponse(success: false, message: 'Failed to fetch history');
    }
  }

  AttendanceRecord _parseStatusResponse(String userId, Map<String, dynamic> data) {
    final status = AttendanceStatus.fromJson(data);
    
    return AttendanceRecord(
      userId: userId,
      employeeId: '',
      attendanceDate: DateTime.now(),
      checkIn: status.checkIn,
      checkOut: status.checkOut,
      workingMinutes: status.checkOut != null && status.checkIn != null
          ? status.checkOut!.time.difference(status.checkIn!.time).inMinutes
          : 0,
    );
  }
}