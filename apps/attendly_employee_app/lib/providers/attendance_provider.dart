import 'package:flutter/material.dart';
import '../models/attendance_model.dart';
import '../services/attendance_service.dart';
import '../services/database_service.dart';
import '../services/location_service.dart';

class AttendanceProvider extends ChangeNotifier {
  final AttendanceService _attendanceService;
  final LocationService _locationService;
  final DatabaseService _db;

  AttendanceProvider({
    AttendanceService? attendanceService,
    LocationService? locationService,
    DatabaseService? databaseService,
  })  : _attendanceService = attendanceService ?? AttendanceService(),
        _locationService = locationService ?? LocationService(),
        _db = databaseService ?? DatabaseService();

  // State
  AttendanceRecord? _todayRecord;
  List<AttendanceRecord> _history = [];
  bool _isLoading = false;
  bool _isProcessingAction = false;
  String? _error;
  LocationData? _currentLocation;
  String? _currentAddress;
  bool _isGettingLocation = false;

  // Getters
  AttendanceRecord? get todayRecord => _todayRecord;
  List<AttendanceRecord> get history => _history;
  bool get isLoading => _isLoading;
  bool get isProcessingAction => _isProcessingAction;
  String? get error => _error;
  LocationData? get currentLocation => _currentLocation;
  String? get currentAddress => _currentAddress;
  bool get isGettingLocation => _isGettingLocation;

  bool get isCheckedIn => _todayRecord?.checkedIn ?? false;
  bool get isCheckedOut => _todayRecord?.checkedOut ?? false;
  bool get canCheckIn => !isCheckedIn;
  bool get canCheckOut => isCheckedIn && !isCheckedOut;

  /// Load today's attendance status
  Future<void> loadTodayStatus(String userId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _todayRecord = await _attendanceService.getTodayStatus(userId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get current location
  Future<bool> getCurrentLocation() async {
    _isGettingLocation = true;
    _error = null;
    notifyListeners();

    try {
      final status = await _locationService.checkPermission();
      if (status == LocationPermissionStatus.serviceDisabled) {
        _error = 'Location services are disabled. Opening location settings...';
        _isGettingLocation = false;
        notifyListeners();
        await _locationService.openLocationSettings();
        return false;
      } else if (status == LocationPermissionStatus.deniedForever) {
        _error = 'Location permission is permanently denied. Opening app settings...';
        _isGettingLocation = false;
        notifyListeners();
        await _locationService.openAppSettings();
        return false;
      } else if (status == LocationPermissionStatus.denied) {
        _error = 'Location permission is required to check in/out.';
        _isGettingLocation = false;
        notifyListeners();
        return false;
      }

      final loc = await _locationService.getLocationData();
      if (loc.latitude == 0.0 && loc.longitude == 0.0) {
        _error = 'Failed to get a valid GPS signal. Please try again.';
        _currentLocation = null;
        _isGettingLocation = false;
        notifyListeners();
        return false;
      }

      _currentLocation = loc;
      _currentAddress = _currentLocation?.address;
      _isGettingLocation = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Failed to get location: $e';
      _isGettingLocation = false;
      notifyListeners();
      return false;
    }
  }

  /// Perform check-in
  Future<bool> checkIn(String userId) async {
    _isProcessingAction = true;
    _error = null;
    notifyListeners();

    try {
      final hasLocation = await getCurrentLocation();
      
      if (!hasLocation || _currentLocation == null) {
        _isProcessingAction = false;
        notifyListeners();
        return false;
      }

      final response = await _attendanceService.checkIn(
        userId: userId,
        latitude: _currentLocation!.latitude,
        longitude: _currentLocation!.longitude,
        address: _currentAddress,
      );

      if (response.success && response.data != null) {
        _todayRecord = response.data;
        _error = null;
        _isProcessingAction = false;
        notifyListeners();
        return true;
      } else {
        _error = response.message;
        _isProcessingAction = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Check-in failed. Please try again.';
      _isProcessingAction = false;
      notifyListeners();
      return false;
    }
  }

  /// Perform check-out
  Future<bool> checkOut(String userId) async {
    _isProcessingAction = true;
    _error = null;
    notifyListeners();

    try {
      final hasLocation = await getCurrentLocation();

      if (!hasLocation || _currentLocation == null) {
        _isProcessingAction = false;
        notifyListeners();
        return false;
      }

      final response = await _attendanceService.checkOut(
        userId: userId,
        latitude: _currentLocation!.latitude,
        longitude: _currentLocation!.longitude,
        address: _currentAddress,
      );

      if (response.success && response.data != null) {
        _todayRecord = response.data;
        _error = null;
        _isProcessingAction = false;
        notifyListeners();
        return true;
      } else {
        _error = response.message;
        _isProcessingAction = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Check-out failed. Please try again.';
      _isProcessingAction = false;
      notifyListeners();
      return false;
    }
  }

  /// Load attendance history
  Future<void> loadHistory(
    String userId, {
    DateTime? from,
    DateTime? to,
    int page = 1,
  }) async {
    if (page == 1) {
      _isLoading = true;
    }
    _error = null;
    notifyListeners();

    try {
      final response = await _attendanceService.getHistory(
        userId: userId,
        from: from,
        to: to,
        page: page,
      );

      if (response.success && response.data != null) {
        if (page == 1) {
          _history = response.data!;
        } else {
          _history.addAll(response.data!);
        }
      } else {
        _error = response.message;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh all data
  Future<void> refresh(String userId) async {
    await loadTodayStatus(userId);
    await loadHistory(userId);
  }

  /// Get elapsed time since check-in
  String getElapsedTime() {
    if (_todayRecord?.checkIn == null) return '00:00:00';
    
    final diff = DateTime.now().difference(_todayRecord!.checkIn!.time);
    final hours = diff.inHours.toString().padLeft(2, '0');
    final minutes = (diff.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (diff.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearLocation() {
    _currentLocation = null;
    _currentAddress = null;
    notifyListeners();
  }
}