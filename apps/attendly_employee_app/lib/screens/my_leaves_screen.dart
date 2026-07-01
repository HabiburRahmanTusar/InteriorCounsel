import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/leave_model.dart';
import '../providers/leave_provider.dart';
import '../utils/theme.dart';
import 'widgets/request_leave_sheet.dart';

class MyLeavesScreen extends StatefulWidget {
  const MyLeavesScreen({super.key});

  @override
  State<MyLeavesScreen> createState() => _MyLeavesScreenState();
}

class _MyLeavesScreenState extends State<MyLeavesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<LeaveProvider>();
      provider.loadLeaveData();
      provider.fetchCalendarAndHolidays();
    });
  }

  void _openRequestSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const RequestLeaveSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeaveProvider>();
    final balance = provider.balance;
    final requests = provider.requests;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Leaves'),
        backgroundColor: AppTheme.surface,
        elevation: 0,
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await provider.loadLeaveData();
          await provider.fetchCalendarAndHolidays();
        },
        color: AppTheme.primary,
        backgroundColor: AppTheme.surface,
        child: provider.isLoading && balance == null
            ? const Center(child: CircularProgressIndicator())
            : CustomScrollView(
                slivers: [
                  // Balance Cards Section
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
                    sliver: SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Leave Balance (${DateTime.now().year})',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  color: AppTheme.textPrimary,
                                ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              // Total Allocated
                              Expanded(
                                child: _buildBalanceCard(
                                  title: 'Allocated',
                                  value: '${balance?.allocated ?? 20}',
                                  icon: Icons.calendar_month_outlined,
                                  color: AppTheme.primary,
                                  gradient: const [
                                    AppTheme.primary,
                                    AppTheme.primaryDark,
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Used Leaves
                              Expanded(
                                child: _buildBalanceCard(
                                  title: 'Used',
                                  value: '${balance?.used ?? 0}',
                                  icon: Icons.beach_access_outlined,
                                  color: AppTheme.warning,
                                  gradient: const [
                                    AppTheme.warning,
                                    Color(0xFFE28A46),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Remaining Balance
                              Expanded(
                                child: _buildBalanceCard(
                                  title: 'Remaining',
                                  value: '${balance?.remaining ?? 20}',
                                  icon: Icons.check_circle_outline,
                                  color: AppTheme.success,
                                  gradient: const [
                                    AppTheme.success,
                                    Color(0xFF0F9B6C),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // History Title
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                    sliver: SliverToBoxAdapter(
                      child: Text(
                        'Request History',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              color: AppTheme.textPrimary,
                            ),
                      ),
                    ),
                  ),

                  // History List
                  if (requests.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 40),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.05),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.assignment_outlined,
                                size: 48,
                                color: AppTheme.textTertiary,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No leave requests found',
                              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                    color: AppTheme.textSecondary,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Submit a new leave request using the floating button below.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppTheme.textTertiary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final request = requests[index];
                            return _buildRequestListItem(context, request);
                          },
                          childCount: requests.length,
                        ),
                      ),
                    ),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openRequestSheet(context),
        label: const Text('Request Leave', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        icon: const Icon(Icons.add, color: Colors.white),
        backgroundColor: AppTheme.primary,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  Widget _buildBalanceCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required List<Color> gradient,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white.withValues(alpha: 0.8), size: 20),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestListItem(BuildContext context, LeaveRequest request) {
    Color statusColor;
    switch (request.status) {
      case 'Approved':
        statusColor = AppTheme.success;
        break;
      case 'Rejected':
        statusColor = AppTheme.error;
        break;
      default:
        statusColor = AppTheme.warning;
    }

    final dateRangeStr = '${DateFormat('MMM d').format(request.startDate)} - ${DateFormat('MMM d, yyyy').format(request.endDate)}';
    final requestedOnStr = request.createdAt != null
        ? DateFormat('MMM d, yyyy hh:mm a').format(request.createdAt!.toLocal())
        : '-';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Leave Type and Status Chip
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.work_history_outlined,
                      size: 16,
                      color: AppTheme.primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${request.leaveType} Leave',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withValues(alpha: 0.2)),
                ),
                child: Text(
                  request.status,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Date Range & Duration
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                dateRangeStr,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textSecondary,
                ),
              ),
              Text(
                '${request.requestedDays} ${request.requestedDays == 1 ? 'Day' : 'Days'}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Reason
          if (request.reason.isNotEmpty) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                request.reason,
                style: const TextStyle(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: AppTheme.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],

          // Footer: Requested on
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                'Requested: $requestedOnStr',
                style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.textTertiary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
