class LeaveBalance {
  final int year;
  final int allocated;
  final int used;
  final int remaining;

  LeaveBalance({
    required this.year,
    required this.allocated,
    required this.used,
    required this.remaining,
  });

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    return LeaveBalance(
      year: json['year'] as int? ?? DateTime.now().year,
      allocated: (json['allocated'] as num?)?.toInt() ?? 0,
      used: (json['used'] as num?)?.toInt() ?? 0,
      remaining: (json['remaining'] as num?)?.toInt() ?? 0,
    );
  }
}

class LeaveRequest {
  final String id;
  final String employeeId;
  final DateTime startDate;
  final DateTime endDate;
  final String leaveType;
  final String reason;
  final int requestedDays;
  final String status;
  final DateTime? createdAt;

  LeaveRequest({
    required this.id,
    required this.employeeId,
    required this.startDate,
    required this.endDate,
    required this.leaveType,
    required this.reason,
    required this.requestedDays,
    required this.status,
    this.createdAt,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    return LeaveRequest(
      id: json['id'] ?? json['_id'] ?? '',
      employeeId: json['employeeId'] is Map
          ? (json['employeeId']['_id'] ?? json['employeeId']['id'] ?? '')
          : (json['employeeId'] ?? ''),
      startDate: DateTime.parse(json['startDate']),
      endDate: DateTime.parse(json['endDate']),
      leaveType: json['leaveType'] ?? 'Annual',
      reason: json['reason'] ?? '',
      requestedDays: (json['requestedDays'] as num?)?.toInt() ?? 0,
      status: json['status'] ?? 'Pending',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'leaveType': leaveType,
      'reason': reason,
    };
  }
}

class WorkCalendarSettings {
  final List<String> weekends;

  WorkCalendarSettings({required this.weekends});

  factory WorkCalendarSettings.fromJson(Map<String, dynamic> json) {
    final list = json['weekends'] as List<dynamic>? ?? ['Friday', 'Saturday'];
    return WorkCalendarSettings(
      weekends: list.map((e) => e.toString()).toList(),
    );
  }
}

class HolidayRecord {
  final String id;
  final String name;
  final DateTime date;

  HolidayRecord({
    required this.id,
    required this.name,
    required this.date,
  });

  factory HolidayRecord.fromJson(Map<String, dynamic> json) {
    return HolidayRecord(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      date: DateTime.parse(json['date']),
    );
  }
}
