import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;
  
  User? _user;
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _error;

  AuthProvider({AuthService? authService}) 
      : _authService = authService ?? AuthService();

  // Getters
  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get error => _error;
  String get userName => _user?.name ?? 'Employee';
  String get employeeId => _user?.employeeId ?? '';
  String get email => _user?.email ?? '';
  String get designation => _user?.designation ?? 'Employee';

  /// Initialize auth state on app startup
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      final isLoggedIn = await _authService.isLoggedIn();
      if (isLoggedIn) {
        _user = await _authService.getCurrentUser();
        _isAuthenticated = _user != null;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Login
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.login(email, password);
      if (response.success && response.user != null) {
        _user = response.user;
        _isAuthenticated = true;
        _error = null;
        notifyListeners();
        return true;
      } else {
        _error = response.message;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error. Please check your connection.';
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Logout
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    await _authService.logout();
    _user = null;
    _isAuthenticated = false;
    _error = null;

    _isLoading = false;
    notifyListeners();
  }

  /// Refresh user profile
  Future<void> refreshUser() async {
    try {
      final user = await _authService.getCurrentUser();
      if (user != null) {
        _user = user;
        notifyListeners();
      }
    } catch (e) {
      // Silently fail for refresh
    }
  }

  /// Change password
  Future<bool> changePassword(String oldPassword, String newPassword) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await _authService.changePassword(oldPassword, newPassword);
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}