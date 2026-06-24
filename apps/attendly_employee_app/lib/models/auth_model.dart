import 'user_model.dart';

class AuthResponse {
  final bool success;
  final String message;
  final User? user;
  final String? accessToken;
  final String? refreshToken;

  AuthResponse({
    required this.success,
    required this.message,
    this.user,
    this.accessToken,
    this.refreshToken,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      user: json['data'] != null ? User.fromJson(json['data']) : null,
      accessToken: json['data']?['accessToken'],
      refreshToken: json['data']?['refreshToken'],
    );
  }
}

class RefreshTokenResponse {
  final bool success;
  final String message;
  final String? accessToken;
  final String? refreshToken;

  RefreshTokenResponse({
    required this.success,
    required this.message,
    this.accessToken,
    this.refreshToken,
  });

  factory RefreshTokenResponse.fromJson(Map<String, dynamic> json) {
    return RefreshTokenResponse(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      accessToken: json['data']?['accessToken'],
      refreshToken: json['data']?['refreshToken'],
    );
  }
}

class LoginRequest {
  final String email;
  final String password;

  LoginRequest({required this.email, required this.password});

  Map<String, dynamic> toJson() => {'email': email, 'password': password};
}

class ChangePasswordRequest {
  final String oldPassword;
  final String newPassword;

  ChangePasswordRequest({required this.oldPassword, required this.newPassword});

  Map<String, dynamic> toJson() => {
    'oldPassword': oldPassword,
    'newPassword': newPassword,
  };
}