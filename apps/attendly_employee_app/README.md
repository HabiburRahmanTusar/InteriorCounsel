# Attendly Employee App

A Flutter mobile application for employee attendance management with GPS-based check-in/check-out, offline-first architecture, and real-time sync capabilities.

## Features

- **GPS Attendance** - Check in/out using real-time GPS location with geocoding
- **Offline-First** - Works without internet, syncs when connection returns
- **Beautiful UI** - Clean, modern design with smooth animations
- **Secure Auth** - JWT token-based authentication with secure storage
- **Attendance History** - View complete attendance records with filters
- **Real-Time Clock** - Live elapsed time counter during work sessions
- **Location Services** - Reverse geocoding, GPS lock animation, address display
- **Sync Management** - Background sync queue with retry logic
- **Professional Profile** - Employee details, shift info, password management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Flutter 3.x |
| State Management | Provider |
| HTTP Client | Dio + interceptors |
| Local Database | SQLite (sqflite) |
| Secure Storage | flutter_secure_storage |
| GPS/Location | geolocator + geocoding |
| Network Monitoring | connectivity_plus |
| UI Components | Material 3 + Custom Design |
| Animations | Flutter native + shimmer |

## Project Structure

```
lib/
├── main.dart                          # App entry point
├── models/                            # Data models
│   ├── api_response.dart
│   ├── attendance_model.dart
│   ├── auth_model.dart
│   ├── holiday_model.dart
│   ├── shift_model.dart
│   ├── sync_queue_model.dart
│   └── user_model.dart
├── providers/                         # State management
│   ├── attendance_provider.dart
│   ├── auth_provider.dart
│   └── connectivity_provider.dart
├── screens/                           # UI screens
│   ├── dashboard_screen.dart
│   ├── history_screen.dart
│   ├── login_screen.dart
│   ├── main_shell_screen.dart
│   ├── profile_screen.dart
│   ├── splash_screen.dart
│   └── widgets/                       # Shared widgets
│       ├── check_in_bottom_sheet.dart
│       ├── location_info_row.dart
│       ├── offline_banner.dart
│       ├── skeleton_card.dart
│       └── status_chip.dart
├── services/                          # Business logic
│   ├── api_service.dart
│   ├── attendance_service.dart
│   ├── auth_service.dart
│   ├── connectivity_service.dart
│   ├── database_service.dart
│   ├── location_service.dart
│   ├── secure_storage_service.dart
│   └── sync_service.dart
└── utils/                             # Utilities
    ├── constants.dart
    └── theme.dart
```

## Getting Started

### Prerequisites

- Flutter SDK >= 3.0.0
- Android SDK (for Android builds)
- Backend API running (see main project)

### Installation

1. **Clone and navigate to the project:**
```bash
cd attendly_employee_app
```

2. **Install dependencies:**
```bash
flutter pub get
```

3. **Configure API endpoint:**
Edit `lib/utils/constants.dart` and update `baseUrl` to point to your backend:
```dart
static const String baseUrl = 'http://YOUR_IP:4000/api';
```

4. **Run the app:**
```bash
flutter run
```

### Building for Production

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release
```

## Permissions

The app requires the following permissions:

| Permission | Purpose |
|------------|---------|
| `ACCESS_FINE_LOCATION` | Precise GPS for check-in/out |
| `ACCESS_COARSE_LOCATION` | Approximate location fallback |
| `ACCESS_BACKGROUND_LOCATION` | Background sync with location |
| `INTERNET` | API communication |
| `ACCESS_NETWORK_STATE` | Online/offline detection |

## API Integration

The app connects to the Attendly backend API:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | Employee authentication |
| `/auth/me` | GET | Get profile |
| `/auth/refresh-token` | POST | Token refresh |
| `/auth/logout` | POST | Sign out |
| `/attendance/status` | GET | Today's attendance status |
| `/attendance/check-in` | POST | GPS check-in |
| `/attendance/check-out` | POST | GPS check-out |
| `/attendance/history` | GET | Attendance history |

## Offline-First Architecture

```
User Action → Local DB Save → Queue for Sync → Background Sync → Server
                    ↑                                    ↓
              Read from DB ←────── Offline ←────── API Success
```

1. All attendance actions are saved locally first
2. If offline, actions are queued in the sync table
3. When connectivity returns, pending actions sync automatically
4. Local database serves as the single source of truth for UI

## Design System

- **Primary:** Teal (#2A9D8F)
- **Accent:** Coral (#E76F51)
- **Success:** Green (#10B981)
- **Warning:** Amber (#F4A261)
- **Error:** Red (#EF4444)
- **Background:** Light gray (#F8FAFB)
- **Typography:** Inter font family

## Demo Credentials

```
Email: admin@attendly.com
Password: password123
```

## License

This project is part of the Attendly Workforce Management System.
