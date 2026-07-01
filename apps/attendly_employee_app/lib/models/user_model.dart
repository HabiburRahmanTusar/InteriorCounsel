import 'shift_model.dart';

class User {
  final String id;
  final String employeeId;
  final String name;
  final String email;
  final String? phone;
  final String? designation;
  final double? salary;
  final String role;
  final String? shiftId;
  final Shift? shift;
  final DateTime? joiningDate;
  final DateTime? resignationDate;
  final String status;

  User({
    required this.id,
    required this.employeeId,
    required this.name,
    required this.email,
    this.phone,
    this.designation,
    this.salary,
    required this.role,
    this.shiftId,
    this.shift,
    this.joiningDate,
    this.resignationDate,
    required this.status,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    Shift? shiftObj;
    String? sId;
    if (json['shiftId'] != null) {
      if (json['shiftId'] is Map) {
        shiftObj = Shift.fromJson(Map<String, dynamic>.from(json['shiftId']));
        sId = shiftObj.id;
      } else {
        sId = json['shiftId'].toString();
      }
    }
    return User(
      id: json['id'] ?? json['_id'] ?? '',
      employeeId: json['employeeId'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      designation: json['designation'],
      salary: json['salary'] != null ? (json['salary'] as num).toDouble() : null,
      role: json['role'] ?? 'employee',
      shiftId: sId,
      shift: shiftObj,
      joiningDate: json['joiningDate'] != null ? DateTime.parse(json['joiningDate']) : null,
      resignationDate: json['resignationDate'] != null ? DateTime.parse(json['resignationDate']) : null,
      status: json['status'] ?? 'active',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employeeId': employeeId,
      'name': name,
      'email': email,
      'phone': phone,
      'designation': designation,
      'salary': salary,
      'role': role,
      'shiftId': shift?.toJson() ?? shiftId,
      'joiningDate': joiningDate?.toIso8601String(),
      'resignationDate': resignationDate?.toIso8601String(),
      'status': status,
    };
  }

  User copyWith({
    String? name,
    String? phone,
    String? designation,
    String? shiftId,
    Shift? shift,
    String? status,
  }) {
    return User(
      id: id,
      employeeId: employeeId,
      name: name ?? this.name,
      email: email,
      phone: phone ?? this.phone,
      designation: designation ?? this.designation,
      salary: salary,
      role: role,
      shiftId: shiftId ?? this.shiftId,
      shift: shift ?? this.shift,
      joiningDate: joiningDate,
      resignationDate: resignationDate,
      status: status ?? this.status,
    );
  }
}