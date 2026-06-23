import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Employee, EmployeeListParams, PaginatedResult } from '../models/employee.model';

/**
 * Employee API client — wraps /api/employees endpoints.
 * Business logic NOT implemented yet — see build plan §8 (Employee Management).
 */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/employees`;

  list(params: EmployeeListParams): Observable<PaginatedResult<Employee>> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 1)
      .set('limit', params.limit ?? 20);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.departmentId) httpParams = httpParams.set('departmentId', params.departmentId);
    if (params.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<PaginatedResult<Employee>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}`, payload);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  assignShift(id: string, shiftId: string): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}/shift`, { shiftId });
  }

  assignDepartment(id: string, departmentId: string): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}/department`, { departmentId });
  }
}
