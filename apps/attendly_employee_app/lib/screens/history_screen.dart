import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../utils/theme.dart';
import 'widgets/skeleton_card.dart';
import 'widgets/status_chip.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    final authProvider = context.read<AuthProvider>();
    final attendanceProvider = context.read<AttendanceProvider>();
    final userId = authProvider.user?.id ?? '';
    if (userId.isNotEmpty) {
      await attendanceProvider.loadHistory(userId);
    }
  }

  Future<void> _onRefresh() async {
    await _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    final attendanceProvider = context.watch<AttendanceProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Attendance History'),
        backgroundColor: AppTheme.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        color: AppTheme.primary,
        backgroundColor: AppTheme.surface,
        child: _buildContent(attendanceProvider),
      ),
    );
  }

  Widget _buildContent(AttendanceProvider provider) {
    if (provider.isLoading && provider.history.isEmpty) {
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 6,
        itemBuilder: (_, __) => const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: SkeletonCard(height: 100),
        ),
      );
    }

    if (provider.history.isEmpty) {
      return _buildEmptyState();
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: provider.history.length,
      itemBuilder: (context, index) {
        final record = provider.history[index];
        return _buildHistoryItem(context, record, index);
      },
    );
  }

  Widget _buildHistoryItem(BuildContext context, record, int index) {
    final date = record.attendanceDate;
    final checkIn = record.checkIn;
    final checkOut = record.checkOut;
    final hours = record.workingMinutes ~/ 60;
    final minutes = record.workingMinutes % 60;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () {},
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _getStatusColor(record).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          DateFormat('d').format(date),
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: _getStatusColor(record),
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            DateFormat('EEEE').format(date),
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  color: AppTheme.textPrimary,
                                ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            DateFormat('MMM yyyy').format(date),
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppTheme.textSecondary,
                                    ),
                          ),
                        ],
                      ),
                    ),
                    StatusChip(
                      label: _getStatusLabel(record),
                      type: _getStatusChipType(record),
                    ),
                  ],
                ),
                if (checkIn != null) ...[
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: AppTheme.border),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTimeInfo(
                          'In',
                          DateFormat('hh:mm a').format(checkIn.time),
                          AppTheme.success,
                        ),
                      ),
                      if (checkOut != null)
                        Expanded(
                          child: _buildTimeInfo(
                            'Out',
                            DateFormat('hh:mm a').format(checkOut.time),
                            AppTheme.accent,
                          ),
                        )
                      else
                        Expanded(
                          child: _buildTimeInfo(
                            'Out',
                            '--:--',
                            AppTheme.textTertiary,
                          ),
                        ),
                      Expanded(
                        child: _buildTimeInfo(
                          'Duration',
                          '${hours}h ${minutes}m',
                          AppTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTimeInfo(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/images/empty_attendance.png',
              height: 160,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 24),
            Text(
              'No attendance records yet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppTheme.textPrimary,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Your attendance history will appear here once you start checking in.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(record) {
    if (!record.checkedIn) return AppTheme.textTertiary;
    if (!record.checkedOut) return AppTheme.warning;
    return AppTheme.success;
  }

  String _getStatusLabel(record) {
    if (!record.checkedIn) return 'Absent';
    if (!record.checkedOut) return 'In Progress';
    if (record.checkIn?.status == 'Late') return 'Late';
    return 'Present';
  }

  StatusChipType _getStatusChipType(record) {
    if (!record.checkedIn) return StatusChipType.neutral;
    if (!record.checkedOut) return StatusChipType.warning;
    if (record.checkIn?.status == 'Late') return StatusChipType.warning;
    return StatusChipType.success;
  }
}
