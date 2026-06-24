class Shift {
  final String id;
  final String name;
  final String startTime; // HH:mm format
  final String endTime;   // HH:mm format
  final int gracePeriod;  // minutes
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Shift({
    required this.id,
    required this.name,
    required this.startTime,
    required this.endTime,
    this.gracePeriod = 15,
    this.createdAt,
    this.updatedAt,
  });

  factory Shift.fromJson(Map<String, dynamic> json) {
    return Shift(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      startTime: json['startTime'] ?? '09:00',
      endTime: json['endTime'] ?? '18:00',
      gracePeriod: json['gracePeriod'] ?? 15,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'startTime': startTime,
      'endTime': endTime,
      'gracePeriod': gracePeriod,
    };
  }

  Map<String, dynamic> toDb() {
    return {
      'id': id,
      'name': name,
      'startTime': startTime,
      'endTime': endTime,
      'gracePeriod': gracePeriod,
    };
  }

  factory Shift.fromDb(Map<String, dynamic> map) {
    return Shift(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      startTime: map['startTime'] ?? '09:00',
      endTime: map['endTime'] ?? '18:00',
      gracePeriod: map['gracePeriod'] ?? 15,
    );
  }
}