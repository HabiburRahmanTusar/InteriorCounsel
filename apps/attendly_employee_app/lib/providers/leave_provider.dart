import 'package:flutter/material.dart';
import '../models/leave_model.dart';
import '../services/leave_service.dart';

class LeaveProvider extends ChangeNotifier {
  final LeaveService _leaveService;

  LeaveBalance? _balance;
  List<LeaveRequest> _requests = [];
  List<String> _weekends = ['Friday', 'Saturday'];
  List<DateTime> _holidays = [];

  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;

  LeaveProvider({LeaveService? leaveService})
      : _leaveService = leaveService ?? LeaveService();

  // Getters
  LeaveBalance? get balance => _balance;
  List<LeaveRequest> get requests => _requests;
  List<String> get weekends => _weekends;
  List<DateTime> get holidays => _holidays;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String? get errorMessage => _errorMessage;

  /// Load leave balance and requests from the API
  Future<void> loadLeaveData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final currentYear = DateTime.now().year;
      
      // Fetch balance and requests concurrently
      final responses = await Future.wait([
        _leaveService.getMyBalance(currentYear),
        _leaveService.getMyRequests(),
      ]);

      final balanceResponse = responses[0];
      final requestsResponse = responses[1];

      if (balanceResponse.success) {
        _balance = balanceResponse.data as LeaveBalance?;
      } else {
        _errorMessage = balanceResponse.message;
      }

      if (requestsResponse.success) {
        _requests = requestsResponse.data as List<LeaveRequest>? ?? [];
      } else {
        _errorMessage = _errorMessage ?? requestsResponse.message;
      }
    } catch (e) {
      _errorMessage = 'An error occurred while loading data: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load weekends and holiday data from the settings API
  Future<void> fetchCalendarAndHolidays() async {
    try {
      final responses = await Future.wait([
        _leaveService.getWorkCalendarSettings(),
        _leaveService.getHolidays(),
      ]);

      final settingsResponse = responses[0];
      final holidaysResponse = responses[1];

      if (settingsResponse.success && settingsResponse.data != null) {
        _weekends = (settingsResponse.data as WorkCalendarSettings).weekends;
      }

      if (holidaysResponse.success && holidaysResponse.data != null) {
        _holidays = (holidaysResponse.data as List<HolidayRecord>)
            .map((h) => h.date)
            .toList();
      }
    } catch (e) {
      debugPrint('Failed to load calendar settings: $e');
    }
  }

  /// Replicates client-side working days calculation excluding weekends and holidays
  int calculateWorkingDays(DateTime startDate, DateTime endDate) {
    DateTime start = DateTime(startDate.year, startDate.month, startDate.day);
    DateTime end = DateTime(endDate.year, endDate.month, endDate.day);

    if (end.isBefore(start)) return 0;

    return end.difference(start).inDays + 1;
  }

  /// Submit a new leave request
  Future<bool> submitLeave({
    required DateTime startDate,
    required DateTime endDate,
    required String leaveType,
    required String reason,
  }) async {
    _isSaving = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _leaveService.submitMyRequest(
        startDate: startDate,
        endDate: endDate,
        leaveType: leaveType,
        reason: reason,
      );

      if (response.success) {
        _isSaving = false;
        // Reload fresh data to update UI
        await loadLeaveData();
        return true;
      } else {
        _errorMessage = response.message;
        _isSaving = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'An error occurred while submitting leave: $e';
      _isSaving = false;
      notifyListeners();
      return false;
    }
  }

  /// Clear errors
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
