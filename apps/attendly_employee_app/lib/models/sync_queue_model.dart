class SyncQueueItem {
  final int? id;
  final String action; // 'check_in', 'check_out'
  final String userId;
  final double latitude;
  final double longitude;
  final String? address;
  final DateTime timestamp;
  final int retryCount;
  final String status; // 'pending', 'processing', 'failed', 'completed'
  final String? errorMessage;

  SyncQueueItem({
    this.id,
    required this.action,
    required this.userId,
    required this.latitude,
    required this.longitude,
    this.address,
    required this.timestamp,
    this.retryCount = 0,
    this.status = 'pending',
    this.errorMessage,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'action': action,
      'userId': userId,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'timestamp': timestamp.toIso8601String(),
      'retryCount': retryCount,
      'status': status,
      'errorMessage': errorMessage,
    };
  }

  Map<String, dynamic> toDb() {
    return {
      'id': id,
      'action': action,
      'userId': userId,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'timestamp': timestamp.toIso8601String(),
      'retryCount': retryCount,
      'status': status,
      'errorMessage': errorMessage,
    };
  }

  factory SyncQueueItem.fromDb(Map<String, dynamic> map) {
    return SyncQueueItem(
      id: map['id'] as int?,
      action: map['action'] ?? '',
      userId: map['userId'] ?? '',
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      address: map['address'],
      timestamp: DateTime.parse(map['timestamp']).toLocal(),
      retryCount: map['retryCount'] ?? 0,
      status: map['status'] ?? 'pending',
      errorMessage: map['errorMessage'],
    );
  }

  SyncQueueItem copyWith({
    int? retryCount,
    String? status,
    String? errorMessage,
  }) {
    return SyncQueueItem(
      id: id,
      action: action,
      userId: userId,
      latitude: latitude,
      longitude: longitude,
      address: address,
      timestamp: timestamp,
      retryCount: retryCount ?? this.retryCount,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}