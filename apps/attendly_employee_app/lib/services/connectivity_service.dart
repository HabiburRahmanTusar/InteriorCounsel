import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  final Connectivity _connectivity = Connectivity();
  final StreamController<bool> _connectionController = StreamController<bool>.broadcast();
  bool _isOnline = true;

  Stream<bool> get connectionStream => _connectionController.stream;
  bool get isOnline => _isOnline;

  Future<void> initialize() async {
    final result = await _connectivity.checkConnectivity();
    _isOnline = result != ConnectivityResult.none;
    _connectionController.add(_isOnline);

    _connectivity.onConnectivityChanged.listen((result) {
      final wasOnline = _isOnline;
      _isOnline = result != ConnectivityResult.none;
      
      if (wasOnline != _isOnline) {
        _connectionController.add(_isOnline);
      }
    });
  }

  Future<bool> checkConnection() async {
    final result = await _connectivity.checkConnectivity();
    _isOnline = result != ConnectivityResult.none;
    return _isOnline;
  }

  void dispose() {
    _connectionController.close();
  }
}