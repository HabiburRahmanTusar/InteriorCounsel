import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/connectivity_provider.dart';
import '../providers/attendance_provider.dart';
import '../providers/leave_provider.dart';
import '../utils/theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;
    final shift = user?.shift;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: CustomScrollView(
        slivers: [
          // Header with gradient
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                  child: Column(
                    children: [
                      // Avatar
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.3),
                            width: 3,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            _getInitials(user?.name ?? 'E'),
                            style: Theme.of(context)
                                .textTheme
                                .displayLarge
                                ?.copyWith(
                                  color: Colors.white,
                                  fontSize: 32,
                                ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        user?.name ?? 'Employee',
                        style:
                            Theme.of(context).textTheme.headlineLarge?.copyWith(
                                  color: Colors.white,
                                ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user?.designation ?? 'Employee',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          user?.employeeId ?? '',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Transform.translate(
              offset: const Offset(0, -20),
              child: Container(
                decoration: const BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Personal Information
                      _buildSectionTitle('Personal Information'),
                      const SizedBox(height: 12),
                      _buildInfoCard([
                        _buildInfoRow(
                            Icons.email_outlined, 'Email', user?.email ?? '-'),
                        _buildInfoRow(
                            Icons.phone_outlined, 'Phone', user?.phone ?? '-'),
                        _buildInfoRow(Icons.badge_outlined, 'Employee ID',
                            user?.employeeId ?? '-'),
                        _buildInfoRow(
                          Icons.calendar_today_outlined,
                          'Joining Date',
                          user?.joiningDate != null
                              ? DateFormat('MMM d, yyyy')
                                  .format(user!.joiningDate!)
                              : '-',
                        ),
                      ]),

                      const SizedBox(height: 24),

                      // Work Information
                      _buildSectionTitle('Work Information'),
                      const SizedBox(height: 12),
                      _buildInfoCard([
                        _buildInfoRow(Icons.work_outline, 'Designation',
                            user?.designation ?? '-'),
                        _buildInfoRow(
                          Icons.schedule_outlined,
                          'Shift',
                          shift != null
                              ? '${shift.name} (${_formatTime(shift.startTime)} - ${_formatTime(shift.endTime)})'
                              : 'Day Shift (9:00 AM - 6:00 PM)',
                        ),
                        _buildInfoRow(
                          Icons.attach_money_outlined,
                          'Salary',
                          user?.salary != null
                              ? '\$${user!.salary!.toStringAsFixed(0)}'
                              : '-',
                        ),
                        _buildInfoRow(
                          Icons.info_outline,
                          'Status',
                          user?.status ?? 'Active',
                          valueColor: AppTheme.success,
                        ),
                      ]),

                      const SizedBox(height: 24),

                      // Account
                      _buildSectionTitle('Account'),
                      const SizedBox(height: 12),
                      _buildActionCard([
                        _buildActionRow(
                          icon: Icons.lock_outline,
                          label: 'Change Password',
                          onTap: () => _showChangePassword(context),
                        ),
                        _buildActionRow(
                          icon: Icons.cloud_sync_outlined,
                          label: 'Sync Now',
                          onTap: () => _manualSync(context),
                          trailing: Consumer<ConnectivityProvider>(
                            builder: (context, connectivity, _) {
                              if (connectivity.isSyncing) {
                                return SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      AppTheme.primary.withValues(alpha: 0.6),
                                    ),
                                  ),
                                );
                              }
                              return const Icon(
                                Icons.chevron_right,
                                color: AppTheme.textTertiary,
                                size: 20,
                              );
                            },
                          ),
                        ),
                      ]),

                      const SizedBox(height: 32),

                      // Sign Out Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: OutlinedButton.icon(
                          onPressed: () => _confirmSignOut(context),
                          icon: const Icon(Icons.logout_outlined, size: 20),
                          label: const Text(
                            'Sign Out',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.error,
                            side: const BorderSide(color: AppTheme.error),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Version
                      Center(
                        child: Text(
                          'Attendly v1.0.0',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppTheme.textTertiary,
                                  ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppTheme.textSecondary,
      ),
    );
  }

  Widget _buildInfoCard(List<Widget> children) {
    return Container(
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
        children: _addDividers(children),
      ),
    );
  }

  Widget _buildActionCard(List<Widget> children) {
    return Container(
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
        children: _addDividers(children),
      ),
    );
  }

  List<Widget> _addDividers(List<Widget> children) {
    final result = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      result.add(children[i]);
      if (i < children.length - 1) {
        result
            .add(const Divider(height: 1, indent: 56, color: AppTheme.border));
      }
    }
    return result;
  }

  Widget _buildInfoRow(IconData icon, String label, String value,
      {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.textTertiary),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: valueColor ?? AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionRow({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppTheme.textTertiary),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textPrimary,
                ),
              ),
            ),
            trailing ??
                const Icon(
                  Icons.chevron_right,
                  color: AppTheme.textTertiary,
                  size: 20,
                ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'E';
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

  void _showChangePassword(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const ChangePasswordSheet(),
    );
  }

  void _manualSync(BuildContext context) {
    context.read<ConnectivityProvider>().manualSync();
  }

  void _confirmSignOut(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AttendanceProvider>().clear();
              context.read<LeaveProvider>().clear();
              context.read<AuthProvider>().logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

class ChangePasswordSheet extends StatefulWidget {
  const ChangePasswordSheet({super.key});

  @override
  State<ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<ChangePasswordSheet> {
  final _oldController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _oldController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (_newController.text != _confirmController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.changePassword(
      _oldController.text,
      _newController.text,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password changed successfully')),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to change password')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Change Password',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _oldController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Current Password',
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _newController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'New Password',
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _confirmController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirm New Password',
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _changePassword,
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Update Password'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
