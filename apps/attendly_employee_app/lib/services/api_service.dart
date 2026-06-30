import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../utils/constants.dart';
import 'secure_storage_service.dart';

class ApiService {
  late final Dio _dio;
  final SecureStorageService _storage;
  bool _isRefreshing = false;
  final List<Function> _refreshSubscribers = [];

  ApiService({SecureStorageService? storage}) 
      : _storage = storage ?? SecureStorageService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: const Duration(milliseconds: AppConstants.connectTimeout),
        receiveTimeout: const Duration(milliseconds: AppConstants.receiveTimeout),
        contentType: 'application/json',
        headers: {
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      _authInterceptor(),
      _retryInterceptor(),
      _logInterceptor(),
    ]);
  }

  Dio get dio => _dio;

  Interceptor _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(AppConstants.accessTokenKey);
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final retryCount = error.requestOptions.headers['x-retry-count'] ?? 0;
          if (retryCount >= 2) {
            await _storage.deleteAll();
            handler.reject(error);
            return;
          }

          if (!_isRefreshing) {
            _isRefreshing = true;
            try {
              final newToken = await _refreshToken();
              _isRefreshing = false;
              _onTokenRefreshed(newToken);
              
              error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
              error.requestOptions.headers['x-retry-count'] = retryCount + 1;
              
              final response = await _dio.fetch(error.requestOptions);
              handler.resolve(response);
              return;
            } catch (e) {
              _isRefreshing = false;
              _refreshSubscribers.clear();
              await _storage.deleteAll();
              handler.reject(error);
              return;
            }
          } else {
            final newToken = await _waitForRefresh();
            if (newToken != null) {
              error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
              final response = await _dio.fetch(error.requestOptions);
              handler.resolve(response);
              return;
            }
          }
        }
        handler.next(error);
      },
    );
  }

  Interceptor _retryInterceptor() {
    const maxRetries = 3;
    return InterceptorsWrapper(
      onError: (error, handler) async {
        if (error.type == DioExceptionType.connectionError ||
            error.type == DioExceptionType.connectionTimeout) {
          final retryCount = error.requestOptions.headers['x-connection-retry-count'] ?? 0;
          if (retryCount < maxRetries) {
            final delay = Duration(seconds: (retryCount + 1) * 2);
            await Future.delayed(delay);
            final newOptions = error.requestOptions;
            newOptions.headers['x-connection-retry-count'] = retryCount + 1;
            try {
              final response = await _dio.fetch(newOptions);
              handler.resolve(response);
              return;
            } catch (e) {
              handler.next(error);
              return;
            }
          }
        }
        handler.next(error);
      },
    );
  }

  Interceptor _logInterceptor() {
    return LogInterceptor(
      request: kDebugMode,
      requestHeader: kDebugMode,
      requestBody: kDebugMode,
      responseHeader: kDebugMode,
      responseBody: kDebugMode,
      error: kDebugMode,
      logPrint: (o) => debugPrint('[DIO] $o'),
    );
  }

  Future<String?> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(AppConstants.refreshTokenKey);
      if (refreshToken == null) return null;

      final response = await Dio().post(
        '${AppConstants.baseUrl}/auth/refresh-token',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final newAccessToken = response.data['data']?['accessToken'];
        final newRefreshToken = response.data['data']?['refreshToken'];
        
        if (newAccessToken != null) {
          await _storage.write(AppConstants.accessTokenKey, newAccessToken);
        }
        if (newRefreshToken != null) {
          await _storage.write(AppConstants.refreshTokenKey, newRefreshToken);
        }
        
        return newAccessToken;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  void _onTokenRefreshed(String? token) {
    for (final callback in _refreshSubscribers) {
      callback(token);
    }
    _refreshSubscribers.clear();
  }

  Future<String?> _waitForRefresh() {
    final completer = Completer<String?>();
    _refreshSubscribers.add((token) {
      completer.complete(token);
    });
    return completer.future;
  }

  // Health check
  Future<bool> checkHealth() async {
    try {
      final response = await _dio.get('/health');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}