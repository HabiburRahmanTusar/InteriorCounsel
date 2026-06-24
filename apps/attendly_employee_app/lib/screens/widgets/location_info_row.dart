import 'package:flutter/material.dart';
import '../../models/attendance_model.dart';
import '../../utils/theme.dart';

class LocationInfoRow extends StatelessWidget {
  final LocationData location;
  final Color? textColor;

  const LocationInfoRow({
    super.key,
    required this.location,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final displayText = location.address ?? 
        '${location.latitude.toStringAsFixed(4)}, ${location.longitude.toStringAsFixed(4)}';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          Icons.location_on_outlined,
          size: 16,
          color: textColor ?? AppTheme.textSecondary,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            displayText,
            style: TextStyle(
              fontSize: 12,
              color: textColor ?? AppTheme.textSecondary,
              height: 1.4,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}