class FinancialRecord {
  final String? id;
  final String period; // YYYY-MM
  final double monthlySales;
  final double monthlyProfit;
  final double outstandingDue;
  final double billsPendingCollection;
  final double prevProfitShareBalance;
  final double recentProfit;
  final double currentTotalBalance;
  final double monthlySubsidy;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  FinancialRecord({
    this.id,
    required this.period,
    required this.monthlySales,
    required this.monthlyProfit,
    required this.outstandingDue,
    required this.billsPendingCollection,
    required this.prevProfitShareBalance,
    required this.recentProfit,
    required this.currentTotalBalance,
    required this.monthlySubsidy,
    this.createdAt,
    this.updatedAt,
  });

  factory FinancialRecord.fromJson(Map<String, dynamic> json) {
    return FinancialRecord(
      id: json['_id'],
      period: json['period'] ?? '',
      monthlySales: (json['monthlySales'] ?? 0).toDouble(),
      monthlyProfit: (json['monthlyProfit'] ?? 0).toDouble(),
      outstandingDue: (json['outstandingDue'] ?? 0).toDouble(),
      billsPendingCollection: (json['billsPendingCollection'] ?? 0).toDouble(),
      prevProfitShareBalance: (json['prevProfitShareBalance'] ?? 0).toDouble(),
      recentProfit: (json['recentProfit'] ?? 0).toDouble(),
      currentTotalBalance: (json['currentTotalBalance'] ?? 0).toDouble(),
      monthlySubsidy: (json['monthlySubsidy'] ?? 0).toDouble(),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    );
  }
}
