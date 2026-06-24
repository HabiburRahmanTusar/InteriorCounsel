import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'utils/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/attendance_provider.dart';
import 'providers/connectivity_provider.dart';
import 'services/connectivity_service.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final connectivityService = ConnectivityService();
  await connectivityService.initialize();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AttendanceProvider()),
        ChangeNotifierProvider(
          create: (_) => ConnectivityProvider(
            connectivityService: connectivityService,
          ),
        ),
      ],
      child: const AttendlyApp(),
    ),
  );
}

class AttendlyApp extends StatelessWidget {
  const AttendlyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Attendly',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const AppInitializer(),
    );
  }
}

class AppInitializer extends StatefulWidget {
  const AppInitializer({super.key});

  @override
  State<AppInitializer> createState() => _AppInitializerState();
}

class _AppInitializerState extends State<AppInitializer> {
  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    final authProvider = context.read<AuthProvider>();
    await authProvider.initialize();

    if (!mounted) return;

    if (authProvider.isAuthenticated) {
      final attendanceProvider = context.read<AttendanceProvider>();
      final userId = authProvider.user?.id ?? '';
      if (userId.isNotEmpty) {
        await attendanceProvider.loadTodayStatus(userId);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.isLoading) {
          return const SplashScreen();
        }

        if (auth.isAuthenticated) {
          return const MainShellScreen();
        }

        return const LoginScreen();
      },
    );
  }
}