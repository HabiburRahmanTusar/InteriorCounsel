export type CheckInStatus = 'On Time' | 'Late';
export type CheckOutStatus = 'Normal' | 'Early Leave';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface CheckInRecord {
  time: string;
  status: CheckInStatus;
  location: GeoPoint;
}

export interface CheckOutRecord {
  time: string;
  status: CheckOutStatus;
  location: GeoPoint;
}

export interface Attendance {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkIn?: CheckInRecord;
  checkOut?: CheckOutRecord;
  workingMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStatus {
  checkedIn: boolean;
  checkedOut: boolean;
  checkIn?: CheckInRecord;
  checkOut?: CheckOutRecord;
}

export interface DailyAttendanceRow {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department?: string;
  checkIn?: CheckInRecord;
  checkOut?: CheckOutRecord;
  workingMinutes: number;
}
