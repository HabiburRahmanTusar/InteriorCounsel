class Holiday {
  final String id;
  final String name;
  final DateTime date;

  Holiday({
    required this.id,
    required this.name,
    required this.date,
  });

  factory Holiday.fromJson(Map<String, dynamic> json) {
    return Holiday(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'date': date.toIso8601String(),
    };
  }
}