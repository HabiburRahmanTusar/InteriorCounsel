import 'package:dio/dio.dart';
import '../models/leave_model.dart';
import '../models/api_response.dart';
import 'api_service.dart';

class LeaveService {
  final ApiService _apiService;

  LeaveService({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  /// Fetch all leave requests for the logged-in employee
  Future<ApiResponse<List<LeaveRequest>>> getMyRequests() async {
    try {
      final response = await _apiService.dio.get('/leaves/me/requests');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] ?? [];
        final requests = data.map((e) => LeaveRequest.fromJson(e)).toList();
        return ApiResponse(
          success: true,
          message: response.data['message'] ?? 'Requests fetched successfully',
          data: requests,
        );
      }
      return ApiResponse(
        success: false,
        message: response.data['message'] ?? 'Failed to fetch leave requests',
      );
    } on DioException catch (e) {
      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'An unexpected error occurred: $e',
      );
    }
  }

  /// Fetch leave balance for the logged-in employee for a specific year
  Future<ApiResponse<LeaveBalance>> getMyBalance(int year) async {
    try {
      final response = await _apiService.dio.get(
        '/leaves/me/balance',
        queryParameters: {'year': year},
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        final balance = LeaveBalance.fromJson(response.data['data']);
        return ApiResponse(
          success: true,
          message: response.data['message'] ?? 'Balance fetched successfully',
          data: balance,
        );
      }
      return ApiResponse(
        success: false,
        message: response.data['message'] ?? 'Failed to fetch leave balance',
      );
    } on DioException catch (e) {
      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'An unexpected error occurred: $e',
      );
    }
  }

  /// Submit a new leave request
  Future<ApiResponse<LeaveRequest>> submitMyRequest({
    required DateTime startDate,
    required DateTime endDate,
    required String leaveType,
    required String reason,
  }) async {
    try {
      final response = await _apiService.dio.post(
        '/leaves/me/request',
        data: {
          'startDate': startDate.toIso8601String(),
          'endDate': endDate.toIso8601String(),
          'leaveType': leaveType,
          'reason': reason,
        },
      );
      if ((response.statusCode == 200 || response.statusCode == 201) &&
          response.data['success'] == true) {
        final request = LeaveRequest.fromJson(response.data['data']);
        return ApiResponse(
          success: true,
          message: response.data['message'] ?? 'Leave request submitted successfully',
          data: request,
        );
      }
      return ApiResponse(
        success: false,
        message: response.data['message'] ?? 'Failed to submit leave request',
      );
    } on DioException catch (e) {
      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'An unexpected error occurred: $e',
      );
    }
  }

  /// Fetch work calendar settings (to determine weekends)
  Future<ApiResponse<WorkCalendarSettings>> getWorkCalendarSettings() async {
    try {
      final response = await _apiService.dio.get('/settings/work-calendar');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final settings = WorkCalendarSettings.fromJson(response.data['data']);
        return ApiResponse(
          success: true,
          message: 'Calendar settings fetched successfully',
          data: settings,
        );
      }
      return ApiResponse(
        success: false,
        message: 'Failed to fetch calendar settings',
      );
    } on DioException catch (e) {
      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'An unexpected error occurred: $e',
      );
    }
  }

  /// Fetch list of holidays
  Future<ApiResponse<List<HolidayRecord>>> getHolidays() async {
    try {
      final response = await _apiService.dio.get('/holidays');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] ?? [];
        final holidays = data.map((e) => HolidayRecord.fromJson(e)).toList();
        return ApiResponse(
          success: true,
          message: 'Holidays fetched successfully',
          data: holidays,
        );
      }
      return ApiResponse(
        success: false,
        message: 'Failed to fetch holidays',
      );
    } on DioException catch (e) {
      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'An unexpected error occurred: $e',
      );
    }
  }
}
