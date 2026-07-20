class LeaveBalanceItem {
  final String leaveType;
  final int allocated;
  final int used;
  final int remaining;

  LeaveBalanceItem({
    required this.leaveType,
    required this.allocated,
    required this.used,
    required this.remaining,
  });

  factory LeaveBalanceItem.fromJson(Map<String, dynamic> json) {
    return LeaveBalanceItem(
      leaveType: json['leaveType'] as String? ?? 'Unknown',
      allocated: (json['allocated'] as num?)?.toInt() ?? 0,
      used: (json['used'] as num?)?.toInt() ?? 0,
      remaining: (json['remaining'] as num?)?.toInt() ?? 0,
    );
  }
}

class LeaveBalance {
  final int year;
  final int allocated;
  final int used;
  final int remaining;
  final List<LeaveBalanceItem> list;

  LeaveBalance({
    required this.year,
    required this.allocated,
    required this.used,
    required this.remaining,
    this.list = const [],
  });

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    int totalAllocated = 0;
    if (json['allocated'] is Map) {
      json['allocated'].values.forEach((v) => totalAllocated += (v as num).toInt());
    } else if (json['allocated'] is num) {
      totalAllocated = (json['allocated'] as num).toInt();
    }
    
    int totalUsed = 0;
    if (json['used'] is Map) {
      json['used'].values.forEach((v) => totalUsed += (v as num).toInt());
    } else if (json['used'] is num) {
      totalUsed = (json['used'] as num).toInt();
    }
    
    int totalRemaining = 0;
    if (json['remaining'] is Map) {
      json['remaining'].values.forEach((v) => totalRemaining += (v as num).toInt());
    } else if (json['remaining'] is num) {
      totalRemaining = (json['remaining'] as num).toInt();
    }

    List<LeaveBalanceItem> parsedList = [];
    if (json['list'] is List) {
      parsedList = (json['list'] as List)
          .map((item) => LeaveBalanceItem.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    return LeaveBalance(
      year: json['year'] as int? ?? DateTime.now().year,
      allocated: totalAllocated,
      used: totalUsed,
      remaining: totalRemaining,
      list: parsedList,
    );
  }
}

class ApprovalStage {
  final int sequence;
  final String role;
  final String status;
  final String remarks;

  ApprovalStage({
    required this.sequence,
    required this.role,
    required this.status,
    required this.remarks,
  });

  factory ApprovalStage.fromJson(Map<String, dynamic> json) {
    return ApprovalStage(
      sequence: (json['sequence'] as num?)?.toInt() ?? 0,
      role: json['role'] ?? '',
      status: json['status'] ?? 'Pending',
      remarks: json['remarks'] ?? '',
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
  final num requestedDays;
  final bool halfDay;
  final String status;
  final DateTime? createdAt;
  final List<ApprovalStage> approvalStages;

  LeaveRequest({
    required this.id,
    required this.employeeId,
    required this.startDate,
    required this.endDate,
    required this.leaveType,
    required this.reason,
    required this.requestedDays,
    this.halfDay = false,
    required this.status,
    this.createdAt,
    this.approvalStages = const [],
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    return LeaveRequest(
      id: json['id'] ?? json['_id'] ?? '',
      employeeId: json['employeeId'] is Map
          ? (json['employeeId']['_id'] ?? json['employeeId']['id'] ?? '')
          : (json['employeeId'] ?? ''),
      startDate: DateTime.parse(json['startDate']).toLocal(),
      endDate: DateTime.parse(json['endDate']).toLocal(),
      leaveType: json['leaveType'] ?? 'Annual',
      reason: json['reason'] ?? '',
      requestedDays: json['requestedDays'] as num? ?? 0,
      halfDay: json['halfDay'] ?? false,
      status: json['status'] ?? 'Pending',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']).toLocal() : null,
      approvalStages: json['approvalStages'] is List
          ? (json['approvalStages'] as List)
              .map((item) => ApprovalStage.fromJson(item as Map<String, dynamic>))
              .toList()
          : [],
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
      date: DateTime.parse(json['date']).toLocal(),
    );
  }
}
