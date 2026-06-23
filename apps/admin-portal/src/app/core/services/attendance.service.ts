import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Attendance, AttendanceStatus, DailyAttendanceRow } from '../models/attendance.model';

/**
 * Attendance API client — wraps /api/attendance endpoints.
 * Business logic NOT implemented yet — see build plan §8 (Attendance).
 */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance`;

  status(): Observable<AttendanceStatus> {
    return this.http.get<AttendanceStatus>(`${this.baseUrl}/status`);
  }

  checkIn(payload: { latitude: number; longitude: number }): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.baseUrl}/check-in`, payload);
  }

  checkOut(payload: { latitude: number; longitude: number }): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.baseUrl}/check-out`, payload);
  }

  history(params: { from?: string; to?: string; page?: number; limit?: number }): Observable<{
    items: Attendance[];
    total: number;
  }> {
    let httpParams = new HttpParams();
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    httpParams = httpParams.set('page', params.page ?? 1);
    httpParams = httpParams.set('limit', params.limit ?? 20);
    return this.http.get<{ items: Attendance[]; total: number }>(`${this.baseUrl}/history`, {
      params: httpParams,
    });
  }

  daily(date: string, departmentId?: string): Observable<DailyAttendanceRow[]> {
    let params = new HttpParams().set('date', date);
    if (departmentId) params = params.set('departmentId', departmentId);
    return this.http.get<DailyAttendanceRow[]>(`${this.baseUrl}/daily`, { params });
  }
}
