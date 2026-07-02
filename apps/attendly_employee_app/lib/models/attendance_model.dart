class AttendanceRecord {
  final String? id;
  final String userId;
  final String employeeId;
  final DateTime attendanceDate;
  final CheckInOut? checkIn;
  final CheckInOut? checkOut;
  final int workingMinutes;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final bool isSynced;
  final String? pendingAction;

  AttendanceRecord({
    this.id,
    required this.userId,
    required this.employeeId,
    required this.attendanceDate,
    this.checkIn,
    this.checkOut,
    this.workingMinutes = 0,
    this.createdAt,
    this.updatedAt,
    this.isSynced = true,
    this.pendingAction,
  });

  bool get checkedIn => checkIn != null;
  bool get checkedOut => checkOut != null;
  bool get isComplete => checkedIn && checkedOut;

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['_id']?.toString(),
      userId: json['userId']?.toString() ?? '',
      employeeId: json['employeeId']?.toString() ?? '',
      attendanceDate: json['attendanceDate'] != null 
          ? DateTime.parse(json['attendanceDate']).toLocal() 
          : DateTime.now(),
      checkIn: json['checkIn'] != null ? CheckInOut.fromJson(json['checkIn']) : null,
      checkOut: json['checkOut'] != null ? CheckInOut.fromJson(json['checkOut']) : null,
      workingMinutes: json['workingMinutes'] ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']).toLocal() : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']).toLocal() : null,
      isSynced: true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'userId': userId,
      'employeeId': employeeId,
      'attendanceDate': attendanceDate.toIso8601String(),
      'checkIn': checkIn?.toJson(),
      'checkOut': checkOut?.toJson(),
      'workingMinutes': workingMinutes,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Map<String, dynamic> toDb() {
    return {
      'id': id,
      'userId': userId,
      'employeeId': employeeId,
      'attendanceDate': attendanceDate.toIso8601String(),
      'checkInTime': checkIn?.time.toIso8601String(),
      'checkInStatus': checkIn?.status,
      'checkInLat': checkIn?.location.latitude,
      'checkInLng': checkIn?.location.longitude,
      'checkInLateMinutes': checkIn?.lateMinutes,
      'checkOutTime': checkOut?.time.toIso8601String(),
      'checkOutStatus': checkOut?.status,
      'checkOutLat': checkOut?.location.latitude,
      'checkOutLng': checkOut?.location.longitude,
      'workingMinutes': workingMinutes,
      'isSynced': isSynced ? 1 : 0,
      'pendingAction': pendingAction,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  factory AttendanceRecord.fromDb(Map<String, dynamic> map) {
    CheckInOut? checkIn;
    if (map['checkInTime'] != null) {
      checkIn = CheckInOut(
        time: DateTime.parse(map['checkInTime']).toLocal(),
        status: map['checkInStatus'] ?? 'On Time',
        location: LocationData(
          latitude: map['checkInLat'] ?? 0.0,
          longitude: map['checkInLng'] ?? 0.0,
        ),
        lateMinutes: map['checkInLateMinutes'] ?? 0,
      );
    }

    CheckInOut? checkOut;
    if (map['checkOutTime'] != null) {
      checkOut = CheckInOut(
        time: DateTime.parse(map['checkOutTime']).toLocal(),
        status: map['checkOutStatus'] ?? 'On Time',
        location: LocationData(
          latitude: map['checkOutLat'] ?? 0.0,
          longitude: map['checkOutLng'] ?? 0.0,
        ),
      );
    }

    return AttendanceRecord(
      id: map['id']?.toString(),
      userId: map['userId']?.toString() ?? '',
      employeeId: map['employeeId']?.toString() ?? '',
      attendanceDate: DateTime.parse(map['attendanceDate']).toLocal(),
      checkIn: checkIn,
      checkOut: checkOut,
      workingMinutes: map['workingMinutes'] ?? 0,
      createdAt: map['createdAt'] != null ? DateTime.parse(map['createdAt']).toLocal() : null,
      updatedAt: map['updatedAt'] != null ? DateTime.parse(map['updatedAt']).toLocal() : null,
      isSynced: map['isSynced'] == 1,
      pendingAction: map['pendingAction'],
    );
  }

  AttendanceRecord copyWith({
    CheckInOut? checkIn,
    CheckInOut? checkOut,
    int? workingMinutes,
    bool? isSynced,
    String? pendingAction,
  }) {
    return AttendanceRecord(
      id: id,
      userId: userId,
      employeeId: employeeId,
      attendanceDate: attendanceDate,
      checkIn: checkIn ?? this.checkIn,
      checkOut: checkOut ?? this.checkOut,
      workingMinutes: workingMinutes ?? this.workingMinutes,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      isSynced: isSynced ?? this.isSynced,
      pendingAction: pendingAction ?? this.pendingAction,
    );
  }
}

class CheckInOut {
  final DateTime time;
  final String status; // "On Time", "Late", "Early", "Overtime"
  final LocationData location;
  final int? lateMinutes;

  CheckInOut({
    required this.time,
    required this.status,
    required this.location,
    this.lateMinutes,
  });

  factory CheckInOut.fromJson(Map<String, dynamic> json) {
    return CheckInOut(
      time: json['time'] != null ? DateTime.parse(json['time']).toLocal() : DateTime.now(),
      status: json['status'] ?? 'On Time',
      location: json['location'] != null 
          ? LocationData.fromJson(json['location']) 
          : LocationData(latitude: 0, longitude: 0),
      lateMinutes: json['lateMinutes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'time': time.toIso8601String(),
      'status': status,
      'location': location.toJson(),
      'lateMinutes': lateMinutes,
    };
  }
}

class LocationData {
  final double latitude;
  final double longitude;
  final String? address;

  LocationData({
    required this.latitude,
    required this.longitude,
    this.address,
  });

  factory LocationData.fromJson(Map<String, dynamic> json) {
    return LocationData(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      address: json['address'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
    };
  }
}

class AttendanceStatus {
  final bool checkedIn;
  final bool checkedOut;
  final CheckInOut? checkIn;
  final CheckInOut? checkOut;

  AttendanceStatus({
    required this.checkedIn,
    required this.checkedOut,
    this.checkIn,
    this.checkOut,
  });

  factory AttendanceStatus.fromJson(Map<String, dynamic> json) {
    return AttendanceStatus(
      checkedIn: json['checkedIn'] ?? false,
      checkedOut: json['checkedOut'] ?? false,
      checkIn: json['checkIn'] != null ? CheckInOut.fromJson(json['checkIn']) : null,
      checkOut: json['checkOut'] != null ? CheckInOut.fromJson(json['checkOut']) : null,
    );
  }
}