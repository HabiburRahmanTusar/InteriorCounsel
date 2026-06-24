import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../utils/theme.dart';

class SkeletonCard extends StatelessWidget {
  final double height;
  final double? width;

  const SkeletonCard({
    super.key,
    this.height = 100,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.border.withOpacity(0.5),
      highlightColor: AppTheme.surface,
      period: const Duration(milliseconds: 1500),
      child: Container(
        width: width ?? double.infinity,
        height: height,
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

class SkeletonList extends StatelessWidget {
  final int itemCount;
  final double itemHeight;

  const SkeletonList({
    super.key,
    this.itemCount = 5,
    this.itemHeight = 80,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.border.withOpacity(0.5),
      highlightColor: AppTheme.surface,
      period: const Duration(milliseconds: 1500),
      child: Column(
        children: List.generate(
          itemCount,
          (index) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              width: double.infinity,
              height: itemHeight,
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ),
    );
  }
}