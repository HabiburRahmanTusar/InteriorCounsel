import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../utils/constants.dart';
import '../models/attendance_model.dart';
import '../models/sync_queue_model.dart';
import '../models/shift_model.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Database? _database;

  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'attendly_employee.db');

    return await openDatabase(
      path,
      version: 2,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Attendance records table
    await db.execute('''
      CREATE TABLE ${DatabaseTables.attendance} (
        localId INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT,
        userId TEXT NOT NULL,
        employeeId TEXT NOT NULL,
        attendanceDate TEXT NOT NULL,
        checkInTime TEXT,
        checkInStatus TEXT,
        checkInLat REAL,
        checkInLng REAL,
        checkInAddress TEXT,
        checkInLateMinutes INTEGER,
        checkOutTime TEXT,
        checkOutStatus TEXT,
        checkOutLat REAL,
        checkOutLng REAL,
        checkOutAddress TEXT,
        workingMinutes INTEGER DEFAULT 0,
        isSynced INTEGER DEFAULT 1,
        pendingAction TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    ''');

    // Sync queue table
    await db.execute('''
      CREATE TABLE ${DatabaseTables.syncQueue} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        userId TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        address TEXT,
        timestamp TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        errorMessage TEXT
      )
    ''');

    // User profile cache
    await db.execute('''
      CREATE TABLE ${DatabaseTables.userProfile} (
        id TEXT PRIMARY KEY,
        employeeId TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        designation TEXT,
        salary REAL,
        role TEXT NOT NULL,
        shiftId TEXT,
        joiningDate TEXT,
        resignationDate TEXT,
        status TEXT NOT NULL,
        cachedAt TEXT NOT NULL
      )
    ''');

    // Shifts cache
    await db.execute('''
      CREATE TABLE ${DatabaseTables.shifts} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        gracePeriod INTEGER DEFAULT 15
      )
    ''');

    // Settings cache
    await db.execute('''
      CREATE TABLE ${DatabaseTables.settings} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE ${DatabaseTables.attendance} ADD COLUMN checkInAddress TEXT');
      await db.execute('ALTER TABLE ${DatabaseTables.attendance} ADD COLUMN checkOutAddress TEXT');
    }
  }

  // Attendance CRUD
  Future<int> insertAttendance(AttendanceRecord record) async {
    final db = await database;
    return await db.insert(
      DatabaseTables.attendance,
      record.toDb(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<AttendanceRecord>> getAttendanceHistory(
    String userId, {
    DateTime? from,
    DateTime? to,
    int page = 1,
    int limit = 20,
  }) async {
    final db = await database;
    
    String whereClause = 'userId = ?';
    List<dynamic> whereArgs = [userId];

    if (from != null) {
      whereClause += ' AND attendanceDate >= ?';
      whereArgs.add(from.toIso8601String());
    }
    if (to != null) {
      whereClause += ' AND attendanceDate <= ?';
      whereArgs.add(to.toIso8601String());
    }

    final List<Map<String, dynamic>> maps = await db.query(
      DatabaseTables.attendance,
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'attendanceDate DESC',
      limit: limit,
      offset: (page - 1) * limit,
    );

    return List.generate(maps.length, (i) => AttendanceRecord.fromDb(maps[i]));
  }

  Future<AttendanceRecord?> getTodayAttendance(String userId) async {
    final db = await database;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));

    final List<Map<String, dynamic>> maps = await db.query(
      DatabaseTables.attendance,
      where: 'userId = ? AND attendanceDate >= ? AND attendanceDate < ?',
      whereArgs: [userId, today.toIso8601String(), tomorrow.toIso8601String()],
      limit: 1,
    );

    if (maps.isEmpty) return null;
    return AttendanceRecord.fromDb(maps.first);
  }

  Future<void> updateAttendance(AttendanceRecord record) async {
    final db = await database;
    await db.update(
      DatabaseTables.attendance,
      record.toDb(),
      where: 'userId = ? AND attendanceDate = ?',
      whereArgs: [record.userId, record.attendanceDate.toIso8601String()],
    );
  }

  // Sync Queue CRUD
  Future<int> addToSyncQueue(SyncQueueItem item) async {
    final db = await database;
    return await db.insert(DatabaseTables.syncQueue, item.toDb());
  }

  Future<List<SyncQueueItem>> getPendingSyncItems() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      DatabaseTables.syncQueue,
      where: "status = 'pending' AND retryCount < ?",
      whereArgs: [AppConstants.maxSyncRetries],
      orderBy: 'timestamp ASC',
    );
    return List.generate(maps.length, (i) => SyncQueueItem.fromDb(maps[i]));
  }

  Future<void> updateSyncItemStatus(
    int id, {
    required String status,
    String? errorMessage,
    int? retryCount,
  }) async {
    final db = await database;
    final Map<String, dynamic> updates = {'status': status};
    if (errorMessage != null) updates['errorMessage'] = errorMessage;
    if (retryCount != null) updates['retryCount'] = retryCount;

    await db.update(
      DatabaseTables.syncQueue,
      updates,
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> removeSyncItem(int id) async {
    final db = await database;
    await db.delete(
      DatabaseTables.syncQueue,
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> clearCompletedSyncItems() async {
    final db = await database;
    await db.delete(
      DatabaseTables.syncQueue,
      where: "status = 'completed'",
    );
  }

  // User Profile
  Future<void> cacheUserProfile(Map<String, dynamic> userData) async {
    final db = await database;
    userData['cachedAt'] = DateTime.now().toIso8601String();
    await db.insert(
      DatabaseTables.userProfile,
      userData,
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> getCachedUserProfile() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      DatabaseTables.userProfile,
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return maps.first;
  }

  // Shifts
  Future<void> cacheShifts(List<Shift> shifts) async {
    final db = await database;
    final batch = db.batch();
    for (final shift in shifts) {
      batch.insert(
        DatabaseTables.shifts,
        shift.toDb(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<Shift>> getCachedShifts() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(DatabaseTables.shifts);
    return List.generate(maps.length, (i) => Shift.fromDb(maps[i]));
  }

  // Settings
  Future<void> setSetting(String key, String value) async {
    final db = await database;
    await db.insert(
      DatabaseTables.settings,
      {'key': key, 'value': value},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String?> getSetting(String key) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      DatabaseTables.settings,
      where: 'key = ?',
      whereArgs: [key],
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return maps.first['value'] as String?;
  }

  // Cleanup
  Future<void> clearAllData() async {
    final db = await database;
    await db.delete(DatabaseTables.attendance);
    await db.delete(DatabaseTables.syncQueue);
    await db.delete(DatabaseTables.userProfile);
    await db.delete(DatabaseTables.shifts);
    await db.delete(DatabaseTables.settings);
  }

  Future<void> close() async {
    if (_database != null) {
      await _database!.close();
      _database = null;
    }
  }
}