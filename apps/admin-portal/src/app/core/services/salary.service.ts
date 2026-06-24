import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SalaryOverviewRecord {
  _id: string;
  employeeId: {
    _id: string;
    employeeId: string;
    name: string;
    designation?: string;
    email: string;
    salary: number;
  };
  month: string;
  workingDays: number;
  attendedDays: number;
  lateDays: number;
  deductedDays: number;
  baseSalary: number;
  dailySalary: number;
  deductionAmount: number;
  finalPayableSalary: number;
  status: 'Draft' | 'Paid';
  processedAt: string;
}

export interface DeductionLogRecord {
  _id: string;
  employeeId: {
    _id: string;
    employeeId: string;
    name: string;
    designation?: string;
  };
  triggerReason: string;
  deductedDays: number;
  deductedAmount: number;
  linkedAttendance: Array<{
    _id: string;
    attendanceDate: string;
    checkIn?: {
      time: string;
      status: string;
    };
  }>;
  month: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class SalaryService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/salary`;

  getOverview(month: string): Observable<SalaryOverviewRecord[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<SalaryOverviewRecord[]>(`${this.baseUrl}/overview`, { params });
  }

  getReports(month: string): Observable<SalaryOverviewRecord[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<SalaryOverviewRecord[]>(`${this.baseUrl}/reports`, { params });
  }

  recalculate(month: string): Observable<SalaryOverviewRecord[]> {
    return this.http.post<SalaryOverviewRecord[]>(`${this.baseUrl}/recalculate`, { month });
  }

  pay(id: string): Observable<SalaryOverviewRecord> {
    return this.http.post<SalaryOverviewRecord>(`${this.baseUrl}/pay/${id}`, {});
  }

  getDeductions(month?: string, employeeId?: string): Observable<DeductionLogRecord[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    if (employeeId) params = params.set('employeeId', employeeId);

    return this.http.get<DeductionLogRecord[]>(`${this.baseUrl}/deductions`, { params });
  }
}
