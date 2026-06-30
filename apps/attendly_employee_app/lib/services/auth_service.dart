import 'package:dio/dio.dart';
import '../models/auth_model.dart';
import '../models/user_model.dart';
import '../utils/constants.dart';
import 'api_service.dart';
import 'secure_storage_service.dart';
import 'database_service.dart';

class AuthService {
  final ApiService _apiService;
  final SecureStorageService _storage;
  final DatabaseService _db;

  AuthService({
    ApiService? apiService,
    SecureStorageService? storage,
    DatabaseService? databaseService,
  })  : _apiService = apiService ?? ApiService(),
        _storage = storage ?? SecureStorageService(),
        _db = databaseService ?? DatabaseService();

  /// Login with email and password
  Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await _apiService.dio.post(
        '/auth/login',
        data: {'email': email, 'password': password, 'rememberMe': true},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];

        // Store tokens
        if (data['accessToken'] != null) {
          await _storage.write(
              AppConstants.accessTokenKey, data['accessToken']);
        }
        if (data['refreshToken'] != null) {
          await _storage.write(
              AppConstants.refreshTokenKey, data['refreshToken']);
        }

        // Cache user profile
        final user = User.fromJson(data);
        await _db.cacheUserProfile(user.toJson());

        return AuthResponse(
          success: true,
          message: response.data['message'] ?? 'Login successful',
          user: user,
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'],
        );
      }

      return AuthResponse(
        success: false,
        message: response.data['message'] ?? 'Login failed',
      );
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout) {
        return AuthResponse(
          success: false,
          message:
              'Unable to connect to server. Please check your internet connection and try again.',
        );
      }
      final message =
          e.response?.data?['message'] ?? 'Network error. Please try again.';
      return AuthResponse(success: false, message: message);
    } catch (e) {
      return AuthResponse(
          success: false, message: 'An unexpected error occurred');
    }
  }

  /// Logout and clear all data
  Future<void> logout() async {
    try {
      final refreshToken = await _storage.read(AppConstants.refreshTokenKey);
      if (refreshToken != null) {
        await _apiService.dio.post(
          '/auth/logout',
          data: {'refreshToken': refreshToken},
        );
      }
    } catch (e) {
      // Ignore errors during logout
    } finally {
      await _storage.deleteAll();
      await _db.clearAllData();
    }
  }

  /// Get current user profile
  Future<User?> getCurrentUser() async {
    try {
      final response = await _apiService.dio.get('/auth/me');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final user = User.fromJson(response.data['data']);
        await _db.cacheUserProfile(user.toJson());
        return user;
      }
      return null;
    } catch (e) {
      // Return cached user if offline
      final cached = await _db.getCachedUserProfile();
      if (cached != null) {
        return User.fromJson(cached);
      }
      return null;
    }
  }

  /// Change password
  Future<bool> changePassword(String oldPassword, String newPassword) async {
    try {
      final response = await _apiService.dio.post(
        '/auth/change-password',
        data: {
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        },
      );
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await _storage.read(AppConstants.accessTokenKey);
    return token != null && token.isNotEmpty;
  }

  /// Get stored token
  Future<String?> getToken() async {
    return await _storage.read(AppConstants.accessTokenKey);
  }

  /// Get cached user profile
  Future<User?> getCachedUser() async {
    final cached = await _db.getCachedUserProfile();
    if (cached != null) {
      return User.fromJson(cached);
    }
    return null;
  }
}
