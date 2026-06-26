import 'dart:async';
import 'package:attendly_employee/models/attendance_model.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/attendance_provider.dart';
import '../../services/location_service.dart';
import '../../utils/theme.dart';
import 'location_info_row.dart';

class CheckInBottomSheet extends StatefulWidget {
  final bool isCheckIn;
  final String userId;
  final VoidCallback onComplete;

  const CheckInBottomSheet({
    super.key,
    required this.isCheckIn,
    required this.userId,
    required this.onComplete,
  });

  @override
  State<CheckInBottomSheet> createState() => _CheckInBottomSheetState();
}

class _CheckInBottomSheetState extends State<CheckInBottomSheet>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  LocationData? _locationData;
  bool _isLocating = true;
  bool _isProcessing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _getLocation();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _getLocation() async {
    final locationService = LocationService();

    try {
      final status = await locationService.checkPermission();
      if (status != LocationPermissionStatus.granted) {
        setState(() {
          _isLocating = false;
          _error = 'Location permission denied. Please enable it in settings.';
        });
        return;
      }

      final location = await locationService.getLocationData();

      if (mounted) {
        setState(() {
          _locationData = location;
          _isLocating = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLocating = false;
          _error = 'Failed to get location. Please try again.';
        });
      }
    }
  }

  Future<void> _performAction() async {
    if (_locationData == null) return;

    setState(() => _isProcessing = true);

    final attendanceProvider = context.read<AttendanceProvider>();
    bool success;

    if (widget.isCheckIn) {
      success = await attendanceProvider.checkIn(widget.userId);
    } else {
      success = await attendanceProvider.checkOut(widget.userId);
    }

    if (mounted) {
      if (success) {
        Navigator.pop(context);
        widget.onComplete();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.isCheckIn
                  ? 'Checked in successfully!'
                  : 'Checked out successfully!',
            ),
            backgroundColor: AppTheme.success,
          ),
        );
      } else {
        setState(() {
          _isProcessing = false;
          _error =
              attendanceProvider.error ?? 'Action failed. Please try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Padding(
            padding: const EdgeInsets.only(top: 12),
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

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                // Title
                Text(
                  widget.isCheckIn ? 'Check In' : 'Check Out',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: AppTheme.textPrimary,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Confirm your ${widget.isCheckIn ? 'check-in' : 'check-out'} location',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                ),

                const SizedBox(height: 32),

                // Location Animation
                if (_isLocating) _buildLocationAnimation(),

                // Location Data
                if (!_isLocating && _locationData != null) _buildLocationCard(),

                // Error
                if (_error != null) _buildErrorWidget(),

                const SizedBox(height: 32),

                // Confirm Button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: (_locationData != null && !_isProcessing)
                        ? _performAction
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          widget.isCheckIn ? AppTheme.primary : AppTheme.accent,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      disabledBackgroundColor:
                          AppTheme.textTertiary.withValues(alpha: 0.3),
                    ),
                    child: _isProcessing
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Text(
                            widget.isCheckIn
                                ? 'Confirm Check In'
                                : 'Confirm Check Out',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),

                const SizedBox(height: 8),

                // Cancel Button
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationAnimation() {
    return SizedBox(
      height: 120,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Pulsing rings
          ...List.generate(3, (index) {
            return AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final delay = index * 0.33;
                final value = ((_pulseController.value + delay) % 1.0);
                return Container(
                  width: 60 + (value * 60),
                  height: 60 + (value * 60),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color:
                          AppTheme.primary.withValues(alpha: (1 - value) * 0.4),
                      width: 1.5,
                    ),
                  ),
                );
              },
            );
          }),
          // Center dot
          Container(
            width: 16,
            height: 16,
            decoration: const BoxDecoration(
              color: AppTheme.primary,
              shape: BoxShape.circle,
            ),
          ),
          // Label
          Positioned(
            bottom: 0,
            child: Text(
              'Acquiring GPS signal...',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.primaryLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primary.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.my_location,
                  color: AppTheme.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Location Locked',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_locationData!.latitude.toStringAsFixed(5)}, ${_locationData!.longitude.toStringAsFixed(5)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.textSecondary,
                            fontFamily: 'monospace',
                          ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.check_circle,
                color: AppTheme.success,
                size: 24,
              ),
            ],
          ),
          if (_locationData!.address != null) ...[
            const SizedBox(height: 12),
            LocationInfoRow(
              location: _locationData!,
              textColor: AppTheme.textSecondary,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.error.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppTheme.error, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _error!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.error,
                  ),
            ),
          ),
          TextButton(
            onPressed: _getLocation,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
