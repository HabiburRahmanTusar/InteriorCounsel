import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/financial_provider.dart';
import '../models/financial_model.dart';
import '../utils/theme.dart';
import 'widgets/skeleton_card.dart';

class FinancialScreen extends StatefulWidget {
  const FinancialScreen({super.key});

  @override
  State<FinancialScreen> createState() => _FinancialScreenState();
}

class _FinancialScreenState extends State<FinancialScreen> {
  bool _isFirstLoad = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    await context.read<FinancialProvider>().loadFinancialData();
    if (mounted) {
      setState(() {
        _isFirstLoad = false;
      });
    }
  }

  Future<void> _onRefresh() async {
    await _loadData();
  }

  String _formatTaka(double value) {
    final formatter = NumberFormat.currency(
      symbol: '৳',
      decimalDigits: 0,
      locale: 'en_IN', // Indian/Bangladeshi digit grouping (e.g. ৳1,00,000)
    );
    return formatter.format(value);
  }

  String _formatPeriod(String periodStr) {
    if (periodStr.isEmpty) return '';
    try {
      final parts = periodStr.split('-');
      if (parts.length == 2) {
        final year = int.parse(parts[0]);
        final month = int.parse(parts[1]);
        final date = DateTime(year, month, 1);
        return DateFormat('MMMM yyyy').format(date);
      }
    } catch (_) {}
    return periodStr;
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<FinancialProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        color: AppTheme.primary,
        backgroundColor: AppTheme.surface,
        child: _isFirstLoad && provider.isLoading
            ? _buildLoadingState()
            : _buildContent(provider),
      ),
    );
  }

  Widget _buildLoadingState() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SkeletonCard(height: 56),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.4,
          ),
          itemCount: 4,
          itemBuilder: (_, __) => const SkeletonCard(height: 100),
        ),
        const SizedBox(height: 24),
        const SkeletonCard(height: 40),
        const SizedBox(height: 12),
        const SkeletonCard(height: 120),
        const SizedBox(height: 12),
        const SkeletonCard(height: 120),
      ],
    );
  }

  Widget _buildContent(FinancialProvider provider) {
    final latest = provider.latestRecord;
    final records = provider.records;

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        // Section: Latest Financial Statement Header
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.assessment_outlined,
                    color: AppTheme.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Latest Statement',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      Text(
                        latest != null
                            ? 'Period: ${_formatPeriod(latest.period)}'
                            : 'No statements found',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        // Section: Grid of latest financial KPI cards
        if (latest != null) ...[
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.45,
              ),
              delegate: SliverChildListDelegate([
                _buildKpiCard(
                  title: 'Monthly Sales',
                  value: latest.monthlySales,
                  icon: Icons.trending_up,
                  baseColor: const Color(0xFF6366F1), // Indigo
                ),
                _buildKpiCard(
                  title: 'Monthly Profit',
                  value: latest.monthlyProfit,
                  icon: Icons.monetization_on_outlined,
                  baseColor: AppTheme.success,
                  isProfit: true,
                ),
                _buildKpiCard(
                  title: 'Outstanding Due',
                  value: latest.outstandingDue,
                  icon: Icons.money_off_outlined,
                  baseColor: AppTheme.error,
                ),
                _buildKpiCard(
                  title: 'Bills Pending',
                  value: latest.billsPendingCollection,
                  icon: Icons.receipt_long_outlined,
                  baseColor: AppTheme.warning,
                ),
                _buildKpiCard(
                  title: 'Prev Profit Share',
                  value: latest.prevProfitShareBalance,
                  icon: Icons.history_toggle_off_outlined,
                  baseColor: AppTheme.textSecondary,
                ),
                _buildKpiCard(
                  title: 'Recent Profit',
                  value: latest.recentProfit,
                  icon: Icons.account_balance_wallet_outlined,
                  baseColor: const Color(0xFF14B8A6), // Teal
                  isProfit: true,
                ),
                _buildKpiCard(
                  title: 'Total Balance',
                  value: latest.currentTotalBalance,
                  icon: Icons.account_balance_outlined,
                  baseColor: const Color(0xFF4F46E5), // Deep Indigo
                ),
                _buildKpiCard(
                  title: 'Subsidy',
                  value: latest.monthlySubsidy,
                  icon: Icons.handshake_outlined,
                  baseColor: const Color(0xFF8B5CF6), // Violet
                ),
              ]),
            ),
          ),
        ] else ...[
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Center(
                child: Text(
                  'No latest statement available',
                  style: TextStyle(color: AppTheme.textTertiary, fontSize: 13),
                ),
              ),
            ),
          ),
        ],

        // Section: Historical Records Title
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.history_outlined,
                    color: AppTheme.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Historical Statements',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Section: Historical records list
        if (records.isEmpty) ...[
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: Center(
                child: Text(
                  'No historical statements found.',
                  style: TextStyle(color: AppTheme.textTertiary, fontSize: 13),
                ),
              ),
            ),
          ),
        ] else ...[
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final record = records[index];
                  return _buildHistoryCard(record);
                },
                childCount: records.length,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildKpiCard({
    required String title,
    required double value,
    required IconData icon,
    required Color baseColor,
    bool isProfit = false,
  }) {
    final valueColor = isProfit
        ? (value >= 0 ? AppTheme.success : AppTheme.error)
        : (title == 'Outstanding Due' && value > 0 ? AppTheme.error : AppTheme.textPrimary);

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withValues(alpha: 0.8)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Background soft color shape in top-right
          Positioned(
            top: -24,
            right: -24,
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: baseColor.withValues(alpha: 0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary,
                          letterSpacing: 0.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Icon(
                      icon,
                      color: baseColor.withValues(alpha: 0.8),
                      size: 18,
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _formatTaka(value),
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: valueColor,
                        letterSpacing: -0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryCard(FinancialRecord record) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: AppTheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.border),
      ),
      child: ExpansionTile(
        shape: const Border(), // Removes default outline border when expanded
        collapsedShape: const Border(),
        backgroundColor: Colors.transparent,
        collapsedBackgroundColor: Colors.transparent,
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        title: Text(
          _formatPeriod(record.period),
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            color: AppTheme.textPrimary,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(
            children: [
              _buildMiniMetric('Sales', record.monthlySales),
              const SizedBox(width: 16),
              _buildMiniMetric(
                'Profit',
                record.monthlyProfit,
                color: record.monthlyProfit >= 0 ? AppTheme.success : AppTheme.error,
              ),
            ],
          ),
        ),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          const Divider(height: 1, color: AppTheme.border),
          const SizedBox(height: 12),
          _buildDetailGrid(record),
        ],
      ),
    );
  }

  Widget _buildMiniMetric(String label, double value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppTheme.textTertiary),
        ),
        const SizedBox(height: 2),
        Text(
          _formatTaka(value),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: color ?? AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailGrid(FinancialRecord record) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 12,
      childAspectRatio: 2.8,
      children: [
        _buildDetailItem('Outstanding Due', record.outstandingDue, color: record.outstandingDue > 0 ? AppTheme.error : null),
        _buildDetailItem('Bills Pending', record.billsPendingCollection),
        _buildDetailItem('Previous Balance', record.prevProfitShareBalance),
        _buildDetailItem('Recent Profit', record.recentProfit, color: record.recentProfit >= 0 ? AppTheme.success : AppTheme.error),
        _buildDetailItem('Total Balance', record.currentTotalBalance),
        _buildDetailItem('Subsidy', record.monthlySubsidy),
      ],
    );
  }

  Widget _buildDetailItem(String label, double value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 2),
        Text(
          _formatTaka(value),
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: color ?? AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
