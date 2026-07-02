import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../providers/connectivity_provider.dart';
import '../utils/theme.dart';
import 'widgets/skeleton_card.dart';
import 'widgets/status_chip.dart';
import 'widgets/location_info_row.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Timer? _elapsedTimer;

  @override
  void initState() {
    super.initState();
    _startElapsedTimer();
  }

  @override
  void dispose() {
    _elapsedTimer?.cancel();
    super.dispose();
  }

  void _startElapsedTimer() {
    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  Future<void> _onRefresh() async {
    final authProvider = context.read<AuthProvider>();
    final attendanceProvider = context.read<AttendanceProvider>();
    final connectivityProvider = context.read<ConnectivityProvider>();

    final userId = authProvider.user?.id ?? '';
    if (userId.isNotEmpty) {
      await attendanceProvider.loadTodayStatus(userId);
    }
    await connectivityProvider.manualSync();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final attendanceProvider = context.watch<AttendanceProvider>();
    final userName = authProvider.userName;

    return RefreshIndicator(
      onRefresh: _onRefresh,
      color: AppTheme.primary,
      backgroundColor: AppTheme.surface,
      child: CustomScrollView(
        slivers: [
          // App Bar
          SliverToBoxAdapter(
            child: Container(
              color: AppTheme.surface,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hello, $userName',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineLarge
                                  ?.copyWith(
                                    color: AppTheme.textPrimary,
                                  ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              DateFormat('EEEE, MMMM d, yyyy')
                                  .format(DateTime.now()),
                              style:
                                  Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: AppTheme.textSecondary,
                                      ),
                            ),
                          ],
                        ),
                      ),
                      // Sync status
                      Consumer<ConnectivityProvider>(
                        builder: (context, connectivity, _) {
                          if (connectivity.isSyncing) {
                            return SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  AppTheme.primary.withValues(alpha: 0.6),
                                ),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),


          // Main Content
          SliverPadding(
            padding: const EdgeInsets.all(24),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Attendance Status Card
                _buildAttendanceCard(attendanceProvider, authProvider),

                const SizedBox(height: 24),

                // Today's Stats
                _buildStatsSection(attendanceProvider, authProvider),

                const SizedBox(height: 24),

                // Quick Info
                _buildQuickInfoCard(attendanceProvider),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceCard(AttendanceProvider provider, AuthProvider authProvider) {
    if (provider.isLoading && provider.todayRecord == null) {
      return const SkeletonCard(height: 220);
    }

    final record = provider.todayRecord;

    // Determine state
    if (record == null || !record.checkedIn) {
      return _buildNotCheckedInCard(authProvider);
    } else if (record.checkedIn && !record.checkedOut) {
      return _buildCheckedInCard(provider);
    } else {
      return _buildCompletedCard(provider);
    }
  }

  Widget _buildNotCheckedInCard(AuthProvider authProvider) {
    final shift = authProvider.user?.shift;
    final startStr = shift?.startTime ?? '09:00';
    final grace = shift?.gracePeriod ?? 15;
    
    final parts = startStr.split(':');
    final shiftHour = int.tryParse(parts[0]) ?? 9;
    final shiftMin = int.tryParse(parts[1]) ?? 0;
    
    final now = DateTime.now();
    final shiftStart = DateTime(now.year, now.month, now.day, shiftHour, shiftMin);
    final lateThreshold = shiftStart.add(Duration(minutes: grace));
    
    String statusTitle = 'Ready to start?';
    String statusSubtitle = 'Check in to begin your work day';
    Color bannerColor = AppTheme.primary;
    Color textColor = AppTheme.primary;
    IconData bannerIcon = Icons.info_outline;
    String bannerText = '';
    bool showBanner = false;
    
    if (now.isBefore(shiftStart)) {
      final diff = shiftStart.difference(now);
      showBanner = true;
      if (diff.inMinutes <= 60) {
        statusTitle = 'Shift starts soon';
        statusSubtitle = 'Get ready to check in';
        bannerText = 'Shift starts in ${_formatMinutes(diff.inMinutes)}. On time!';
        bannerColor = AppTheme.primary.withValues(alpha: 0.08);
        textColor = AppTheme.primary;
        bannerIcon = Icons.timer_outlined;
      } else {
        statusTitle = 'Early morning';
        statusSubtitle = 'Your shift has not started yet';
        bannerText = 'Your shift starts at ${_formatTime(startStr)}.';
        bannerColor = AppTheme.textSecondary.withValues(alpha: 0.05);
        textColor = AppTheme.textSecondary;
        bannerIcon = Icons.schedule_outlined;
      }
    } else if (now.isBefore(lateThreshold)) {
      final diff = now.difference(shiftStart);
      showBanner = true;
      statusTitle = 'Check-in is active';
      statusSubtitle = 'You are currently within the grace period';
      bannerText = 'Grace period active. Check in within ${_formatMinutes(grace - diff.inMinutes)} to be on time!';
      bannerColor = AppTheme.warning.withValues(alpha: 0.08);
      textColor = AppTheme.warning;
      bannerIcon = Icons.report_problem_outlined;
    } else {
      final diff = now.difference(shiftStart);
      showBanner = true;
      statusTitle = 'You are getting late';
      statusSubtitle = 'Lateness penalty may apply';
      bannerText = 'You are late by ${_formatMinutes(diff.inMinutes)}! Check in now.';
      bannerColor = AppTheme.error.withValues(alpha: 0.08);
      textColor = AppTheme.error;
      bannerIcon = Icons.warning_amber_rounded;
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: (showBanner ? textColor : AppTheme.primary).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.fingerprint_outlined,
              size: 36,
              color: (showBanner ? textColor : AppTheme.primary).withValues(alpha: 0.8),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            statusTitle,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            statusSubtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondary,
                ),
          ),
          
          if (showBanner) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: bannerColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: textColor.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Icon(bannerIcon, color: textColor, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      bannerText,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: textColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 20),
          Text(
            _getCurrentTime(),
            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  color: showBanner ? textColor : AppTheme.primary,
                  fontSize: 40,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            DateFormat('EEEE, MMM d').format(DateTime.now()),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondary,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckedInCard(AttendanceProvider provider) {
    final record = provider.todayRecord;
    final checkIn = record?.checkIn;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: AppTheme.success.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with pulse dot
          Row(
            children: [
              // Pulsing dot
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: AppTheme.success,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.success.withValues(alpha: 0.4),
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Checked In',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppTheme.success,
                    ),
              ),
              const Spacer(),
              StatusChip(
                label: checkIn?.status ?? 'On Time',
                type: (checkIn?.status == 'Late')
                    ? StatusChipType.warning
                    : StatusChipType.success,
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Elapsed time
          Center(
            child: Column(
              children: [
                Text(
                  provider.getElapsedTime(),
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 40,
                        color: AppTheme.textPrimary,
                        fontFamily: 'monospace',
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Elapsed Time',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Divider(color: AppTheme.border),
          const SizedBox(height: 12),
          // Check-in details
          Row(
            children: [
              const Icon(
                Icons.access_time_outlined,
                size: 16,
                color: AppTheme.textSecondary,
              ),
              const SizedBox(width: 8),
              Text(
                'In: ${checkIn != null ? DateFormat('hh:mm a').format(checkIn.time) : '--:--'}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
              ),
              const Spacer(),
              if (checkIn?.lateMinutes != null && checkIn!.lateMinutes! > 0)
                Text(
                  '${checkIn.lateMinutes} min late',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.warning,
                      ),
                ),
            ],
          ),
          if (checkIn?.location != null) ...[
            const SizedBox(height: 8),
            LocationInfoRow(
              location: checkIn!.location,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCompletedCard(AttendanceProvider provider) {
    final record = provider.todayRecord;
    final checkIn = record?.checkIn;
    final checkOut = record?.checkOut;

    final hours = (record?.workingMinutes ?? 0) ~/ 60;
    final minutes = (record?.workingMinutes ?? 0) % 60;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.check_circle_outline,
                color: AppTheme.primary,
                size: 24,
              ),
              const SizedBox(width: 10),
              Text(
                'Work day complete',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppTheme.textPrimary,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Total duration
          Center(
            child: Column(
              children: [
                Text(
                  '${hours}h ${minutes}m',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 40,
                        color: AppTheme.primary,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Total Duration',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Divider(color: AppTheme.border),
          const SizedBox(height: 12),
          // Timeline
          Row(
            children: [
              Expanded(
                child: _buildTimePoint(
                  'Check In',
                  checkIn != null
                      ? DateFormat('hh:mm a').format(checkIn.time)
                      : '--:--',
                  Icons.login_outlined,
                  AppTheme.success,
                ),
              ),
              const Icon(Icons.arrow_forward,
                  size: 16, color: AppTheme.textTertiary),
              Expanded(
                child: _buildTimePoint(
                  'Check Out',
                  checkOut != null
                      ? DateFormat('hh:mm a').format(checkOut.time)
                      : '--:--',
                  Icons.logout_outlined,
                  AppTheme.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const StatusChip(
            label: 'Completed',
            type: StatusChipType.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildTimePoint(
      String label, String time, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(height: 6),
        Text(
          time,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppTheme.textPrimary,
              ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
        ),
      ],
    );
  }

  Widget _buildStatsSection(AttendanceProvider provider, AuthProvider authProvider) {
    final shift = authProvider.user?.shift;
    final shiftStart = shift != null ? _formatTime(shift.startTime) : '9:00 AM';
    final shiftEnd = shift != null ? _formatTime(shift.endTime) : '6:00 PM';
    final grace = shift?.gracePeriod ?? 15;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Today\'s Overview',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: AppTheme.textPrimary,
              ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                icon: Icons.schedule_outlined,
                label: 'Shift',
                value: '$shiftStart - $shiftEnd',
                color: AppTheme.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                icon: Icons.access_time_outlined,
                label: 'Grace Period',
                value: '$grace minutes',
                color: AppTheme.warning,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppTheme.textPrimary,
                ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondary,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickInfoCard(AttendanceProvider provider) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primary, AppTheme.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.my_location_outlined,
                  size: 20,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Location Required',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'GPS is used to verify your attendance location',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.info_outline,
                  size: 14,
                  color: Colors.white.withValues(alpha: 0.7),
                ),
                const SizedBox(width: 8),
                Text(
                  'Make sure GPS is enabled',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getCurrentTime() {
    return DateFormat('hh:mm a').format(DateTime.now());
  }

  String _formatTime(String hhMm) {
    try {
      final parts = hhMm.split(':');
      final hour = int.parse(parts[0]);
      final min = int.parse(parts[1]);
      final dt = DateTime(2026, 1, 1, hour, min);
      return DateFormat('h:mm a').format(dt);
    } catch (_) {
      return hhMm;
    }
  }

  String _formatMinutes(int minutes) {
    if (minutes < 60) {
      return '$minutes ${minutes == 1 ? 'minute' : 'minutes'}';
    }
    final hrs = minutes ~/ 60;
    final mins = minutes % 60;
    final hrStr = hrs == 1 ? 'hour' : 'hours';
    final minStr = mins == 1 ? 'minute' : 'minutes';
    if (mins == 0) {
      return '$hrs $hrStr';
    }
    return '$hrs $hrStr and $mins $minStr';
  }
}
