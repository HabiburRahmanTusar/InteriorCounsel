import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LeaveRequest {
  _id?: string;
  employeeId: any;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: string;
  requestedDays: number;
  halfDay?: boolean;
  approverRemarks?: string;
  createdAt?: string;
}

export interface LeaveBalanceDetail {
  Annual: number;
  Sick: number;
  Casual: number;
}

export interface LeaveBalanceItem {
  leaveType: string;
  leaveTypeDoc?: any;
  allocated: number;
  used: number;
  remaining: number;
}

export interface LeaveBalance {
  _id?: string;
  employeeId: any;
  year: number;
  allocated: LeaveBalanceDetail;
  used: LeaveBalanceDetail;
  remaining: LeaveBalanceDetail;
  list?: LeaveBalanceItem[];
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/leaves`;

  getRequests(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.baseUrl}/requests`);
  }

  createRequest(data: any): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.baseUrl}/requests`, data);
  }

  updateRequestStatus(id: string, status: string, approverRemarks?: string): Observable<LeaveRequest> {
    return this.http.put<LeaveRequest>(`${this.baseUrl}/requests/${id}/status`, { status, approverRemarks });
  }

  getBalances(year?: number): Observable<LeaveBalance[]> {
    const url = year ? `${this.baseUrl}/balances?year=${year}` : `${this.baseUrl}/balances`;
    return this.http.get<LeaveBalance[]>(url);
  }

  updateAllocation(employeeId: string, year: number, allocated: LeaveBalanceDetail): Observable<LeaveBalance> {
    return this.http.put<LeaveBalance>(`${this.baseUrl}/balances/allocation`, {
      employeeId,
      year,
      allocated,
    });
  }

  bulkUpdateAllocation(year: number, allocated: LeaveBalanceDetail): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/balances/bulk-allocation`, { year, allocated });
  }

  // Employee Methods
  getMyRequests(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.baseUrl}/me/requests`);
  }

  getMyBalance(year?: number): Observable<LeaveBalance> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<LeaveBalance>(`${this.baseUrl}/me/balance`, { params });
  }

  submitMyRequest(payload: Partial<LeaveRequest>): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.baseUrl}/me/request`, payload);
  }

  cancelMyRequest(id: string): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.baseUrl}/me/requests/${id}/cancel`, {});
  }
}
