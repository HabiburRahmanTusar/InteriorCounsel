import 'package:dio/dio.dart';
import '../models/financial_model.dart';
import '../models/api_response.dart';
import 'api_service.dart';

class FinancialService {
  final ApiService _apiService;

  FinancialService({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  Future<ApiResponse<List<FinancialRecord>>> getFinancialRecords({
    int page = 1,
    int limit = 10,
    String? search,
    String? year,
    String? month,
  }) async {
    try {
      final queryParams = {
        'page': page,
        'limit': limit,
        if (search != null && search.isNotEmpty) 'search': search,
        if (year != null && year.isNotEmpty) 'year': year,
        if (month != null && month.isNotEmpty) 'month': month,
        'sortBy': 'period',
        'sortOrder': 'desc',
      };

      final response = await _apiService.dio.get(
        '/financial',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] ?? [];
        final records = data.map((e) => FinancialRecord.fromJson(e)).toList();
        final pagination = response.data['pagination'] != null
            ? Pagination.fromJson(response.data['pagination'])
            : null;

        return ApiResponse(
          success: true,
          message: response.data['message'] ?? 'Financial records fetched successfully',
          data: records,
          pagination: pagination,
        );
      }

      return ApiResponse(
        success: false,
        message: response.data['message'] ?? 'Failed to fetch financial records',
      );
    } on DioException catch (e) {
      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'An unexpected error occurred: $e',
      );
    }
  }

  Future<ApiResponse<FinancialRecord?>> getLatestFinancialRecord() async {
    try {
      final response = await _apiService.dio.get(
        '/financial',
        queryParameters: {
          'page': 1,
          'limit': 1,
          'sortBy': 'updatedAt',
          'sortOrder': 'desc',
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> data = response.data['data'] ?? [];
        final latest = data.isNotEmpty ? FinancialRecord.fromJson(data[0]) : null;

        return ApiResponse(
          success: true,
          message: response.data['message'] ?? 'Latest financial record fetched successfully',
          data: latest,
        );
      }

      return ApiResponse(
        success: false,
        message: response.data['message'] ?? 'Failed to fetch latest financial record',
      );
    } on DioException catch (e) {
      return ApiResponse(
        success: false,
        message: e.response?.data?['message'] ?? 'Network error occurred',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'An unexpected error occurred: $e',
      );
    }
  }
}
