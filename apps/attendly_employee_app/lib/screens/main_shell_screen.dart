import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../providers/connectivity_provider.dart';
import '../utils/theme.dart';
import 'dashboard_screen.dart';
import 'history_screen.dart';
import 'profile_screen.dart';
import 'widgets/check_in_bottom_sheet.dart';
import 'widgets/offline_banner.dart';

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  late final AnimationController _fabController;

  final _pages = const [
    DashboardScreen(),
    HistoryScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _fabController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _fabController.dispose();
    super.dispose();
  }

  void _onCheckInOutPressed() {
    final attendanceProvider = context.read<AttendanceProvider>();
    final authProvider = context.read<AuthProvider>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CheckInBottomSheet(
        isCheckIn: !attendanceProvider.isCheckedIn,
        userId: authProvider.user?.id ?? '',
        onComplete: () {
          // Refresh today's status after check-in/out
          final userId = authProvider.user?.id ?? '';
          if (userId.isNotEmpty) {
            attendanceProvider.loadTodayStatus(userId);
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final attendanceProvider = context.watch<AttendanceProvider>();
    final isCheckedIn = attendanceProvider.isCheckedIn;
    final isCheckedOut = attendanceProvider.isCheckedOut;

    // FAB color and icon based on state
    final fabGradient = isCheckedOut
        ? const [AppTheme.textTertiary, AppTheme.textSecondary] // Disabled/completed
        : isCheckedIn
            ? [AppTheme.accent, AppTheme.accentDark] // Check-out (coral)
            : [AppTheme.primary, AppTheme.primaryDark]; // Check-in (teal)

    final fabIcon = isCheckedOut
        ? Icons.check_circle_outline
        : isCheckedIn
            ? Icons.logout_outlined
            : Icons.login_outlined;

    return Scaffold(
      body: Column(
        children: [
          // Offline banner
          const OfflineBanner(),
          // Main content
          Expanded(child: _pages[_currentIndex]),
        ],
      ),
      floatingActionButton: Transform.scale(
        scale: attendanceProvider.isProcessingAction ? 0.9 : 1.0,
        child: Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: fabGradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: (isCheckedIn && !isCheckedOut
                        ? AppTheme.accent
                        : AppTheme.primary)
                    .withOpacity(0.35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            shape: const CircleBorder(),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: isCheckedOut ? null : _onCheckInOutPressed,
              child: Center(
                child: attendanceProvider.isProcessingAction
                    ? const SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Icon(
                        fabIcon,
                        color: Colors.white,
                        size: 28,
                      ),
              ),
            ),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        height: 72,
        elevation: 8,
        notchMargin: 8,
        shape: const CircularNotchedRectangle(),
        color: AppTheme.surface,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(Icons.home_outlined, 'Home', 0),
            _buildNavItem(Icons.calendar_month_outlined, 'History', 1),
            const SizedBox(width: 64), // Space for FAB
            _buildNavItem(Icons.person_outline, 'Profile', 2),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isActive = _currentIndex == index;
    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 24,
              color: isActive ? AppTheme.primary : AppTheme.textSecondary,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive ? AppTheme.primary : AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}