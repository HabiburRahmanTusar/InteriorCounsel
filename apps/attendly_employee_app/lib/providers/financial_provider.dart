import 'package:flutter/material.dart';
import '../models/financial_model.dart';
import '../services/financial_service.dart';

class FinancialProvider extends ChangeNotifier {
  final FinancialService _financialService;

  FinancialRecord? _latestRecord;
  List<FinancialRecord> _records = [];
  bool _isLoading = false;
  String? _errorMessage;

  FinancialProvider({FinancialService? financialService})
      : _financialService = financialService ?? FinancialService();

  // Getters
  FinancialRecord? get latestRecord => _latestRecord;
  List<FinancialRecord> get records => _records;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadFinancialData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final responses = await Future.wait([
        _financialService.getLatestFinancialRecord(),
        _financialService.getFinancialRecords(page: 1, limit: 20),
      ]);

      final latestResponse = responses[0];
      final recordsResponse = responses[1];

      if (latestResponse.success) {
        _latestRecord = latestResponse.data as FinancialRecord?;
      } else {
        _errorMessage = latestResponse.message;
      }

      if (recordsResponse.success) {
        _records = recordsResponse.data as List<FinancialRecord>? ?? [];
      } else {
        _errorMessage = _errorMessage ?? recordsResponse.message;
      }
    } catch (e) {
      _errorMessage = 'An error occurred while loading data: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clear() {
    _latestRecord = null;
    _records = [];
    _isLoading = false;
    _errorMessage = null;
    notifyListeners();
  }
}
