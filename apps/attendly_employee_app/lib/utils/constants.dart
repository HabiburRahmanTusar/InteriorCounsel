class AppConstants {
  // API Configuration
  static const String baseUrl = 'https://attendly-1.onrender.com/api';
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;

  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  static const String settingsKey = 'app_settings';

  // Location
  static const double defaultOfficeLat = 23.8103;
  static const double defaultOfficeLng = 90.4125;
  static const double maxCheckInDistance = 500; // meters

  // Sync
  static const int syncIntervalSeconds = 30;
  static const int maxSyncRetries = 3;

  // Timezone
  static const String appTimezone = 'Asia/Dhaka';
}

class AppColors {
  // Primary
  static const int primary = 0xFF2A9D8F;
  static const int primaryDark = 0xFF21867A;
  static const int primaryLight = 0xFFE8F5F3;

  // Accent
  static const int accent = 0xFFE76F51;
  static const int accentDark = 0xFFD45A3D;

  // Semantic
  static const int success = 0xFF10B981;
  static const int warning = 0xFFF4A261;
  static const int error = 0xFFEF4444;
  static const int offline = 0xFF6366F1;

  // Neutrals
  static const int background = 0xFFF8FAFB;
  static const int surface = 0xFFFFFFFF;
  static const int textPrimary = 0xFF1A1D26;
  static const int textSecondary = 0xFF6B7280;
  static const int textTertiary = 0xFF9CA3AF;
  static const int border = 0xFFE5E7EB;
}

class DatabaseTables {
  static const String attendance = 'attendance';
  static const String syncQueue = 'sync_queue';
  static const String userProfile = 'user_profile';
  static const String shifts = 'shifts';
  static const String holidays = 'holidays';
  static const String settings = 'settings';
}
