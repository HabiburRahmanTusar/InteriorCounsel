import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApprovalStage {
  sequence: number;
  role: string;
  label: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: any;
  approvalDate?: string;
  remarks?: string;
}

export interface ApprovalWorkflow {
  _id?: string;
  applicantRole: string;
  stages: ApprovalStage[];
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApprovalWorkflowService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  getWorkflows(): Observable<ApprovalWorkflow[]> {
    return this.http.get<ApprovalWorkflow[]>(`${this.baseUrl}/approval-workflows`);
  }

  updateWorkflow(workflow: Partial<ApprovalWorkflow>): Observable<ApprovalWorkflow> {
    return this.http.put<ApprovalWorkflow>(`${this.baseUrl}/approval-workflows`, workflow);
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/approval-workflows/${id}`);
  }

  getRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/roles`);
  }
}
