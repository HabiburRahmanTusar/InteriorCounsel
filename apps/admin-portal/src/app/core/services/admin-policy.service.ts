import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaveType {
  _id: string;
  name: string;
  code: string;
  isPaid: boolean;
  deductsFromBalance: boolean;
  isActive: boolean;
}

export interface EmployeeType {
  _id: string;
  code: string;
  label: string;
}

export interface LeaveAllocation {
  leaveType: LeaveType | string; // populated or ID
  days: number;
}

export interface LeavePolicy {
  _id?: string;
  name: string;
  description?: string;
  employeeTypes: EmployeeType[] | string[];
  year: number;
  status?: 'Draft' | 'Active' | 'Archived';
  isDefault?: boolean;
  leaveAllocations: LeaveAllocation[];
}

@Injectable({ providedIn: 'root' })
export class AdminPolicyService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  // Leave Types
  getLeaveTypes(): Observable<LeaveType[]> {
    return this.http.get<LeaveType[]>(`${this.baseUrl}/leave-types`);
  }

  // Employee Types
  getEmployeeTypes(): Observable<EmployeeType[]> {
    return this.http.get<EmployeeType[]>(`${this.baseUrl}/employee-types`);
  }

  // Policies
  getPolicies(params?: { year?: number; status?: string }): Observable<LeavePolicy[]> {
    return this.http.get<LeavePolicy[]>(`${this.baseUrl}/leave-policies`, { params });
  }

  getPolicyById(id: string): Observable<LeavePolicy> {
    return this.http.get<LeavePolicy>(`${this.baseUrl}/leave-policies/${id}`);
  }

  createPolicy(policy: Partial<LeavePolicy>): Observable<LeavePolicy> {
    return this.http.post<LeavePolicy>(`${this.baseUrl}/leave-policies`, policy);
  }

  updatePolicy(id: string, policy: Partial<LeavePolicy>): Observable<LeavePolicy> {
    return this.http.patch<LeavePolicy>(`${this.baseUrl}/leave-policies/${id}`, policy);
  }

  activatePolicy(id: string): Observable<LeavePolicy> {
    return this.http.post<LeavePolicy>(`${this.baseUrl}/leave-policies/${id}/activate`, {});
  }

  archivePolicy(id: string): Observable<LeavePolicy> {
    return this.http.post<LeavePolicy>(`${this.baseUrl}/leave-policies/${id}/archive`, {});
  }

  syncBalancesBulk(year: number): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${this.baseUrl}/leave-policies/sync-balances`, { year });
  }

  deletePolicy(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/leave-policies/${id}`);
  }
}
