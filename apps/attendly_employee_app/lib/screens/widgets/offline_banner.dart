import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/connectivity_provider.dart';
import '../../utils/theme.dart';

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ConnectivityProvider>(
      builder: (context, connectivity, child) {
        // Show sync message briefly
        if (connectivity.lastSyncMessage != null && connectivity.isOnline) {
          Future.delayed(const Duration(seconds: 3), () {
            connectivity.clearSyncMessage();
          });
          return _buildBanner(
            icon: Icons.cloud_done_outlined,
            message: connectivity.lastSyncMessage!,
            color: AppTheme.success,
            backgroundColor: AppTheme.success.withOpacity(0.08),
          );
        }

        // Show syncing indicator
        if (connectivity.isSyncing) {
          return _buildBanner(
            icon: Icons.sync,
            message: 'Syncing changes...',
            color: AppTheme.primary,
            backgroundColor: AppTheme.primaryLight,
            showProgress: true,
          );
        }

        // Show offline banner
        if (connectivity.isOffline) {
          return _buildBanner(
            icon: Icons.cloud_off_outlined,
            message: 'Offline mode \u2014 changes will sync when connected',
            color: AppTheme.offline,
            backgroundColor: AppTheme.offline.withOpacity(0.08),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildBanner({
    required IconData icon,
    required String message,
    required Color color,
    required Color backgroundColor,
    bool showProgress = false,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: backgroundColor,
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
            ),
            if (showProgress)
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
              ),
          ],
        ),
      ),
    );
  }
}