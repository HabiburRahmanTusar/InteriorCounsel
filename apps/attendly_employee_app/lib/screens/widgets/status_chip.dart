import 'package:flutter/material.dart';
import '../../utils/theme.dart';

enum StatusChipType {
  primary,
  success,
  warning,
  error,
  neutral,
  accent,
}

class StatusChip extends StatelessWidget {
  final String label;
  final StatusChipType type;

  const StatusChip({
    super.key,
    required this.label,
    this.type = StatusChipType.primary,
  });

  Color get _backgroundColor {
    switch (type) {
      case StatusChipType.primary:
        return AppTheme.primary.withValues(alpha: 0.1);
      case StatusChipType.success:
        return AppTheme.success.withValues(alpha: 0.1);
      case StatusChipType.warning:
        return AppTheme.warning.withValues(alpha: 0.1);
      case StatusChipType.error:
        return AppTheme.error.withValues(alpha: 0.1);
      case StatusChipType.neutral:
        return AppTheme.border.withValues(alpha: 0.5);
      case StatusChipType.accent:
        return AppTheme.accent.withValues(alpha: 0.1);
    }
  }

  Color get _textColor {
    switch (type) {
      case StatusChipType.primary:
        return AppTheme.primary;
      case StatusChipType.success:
        return AppTheme.success;
      case StatusChipType.warning:
        return AppTheme.warning;
      case StatusChipType.error:
        return AppTheme.error;
      case StatusChipType.neutral:
        return AppTheme.textSecondary;
      case StatusChipType.accent:
        return AppTheme.accent;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: _textColor,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
