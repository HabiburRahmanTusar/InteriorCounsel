import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Department } from '../models/department.model';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/departments`;

  list(): Observable<Department[]> {
    return this.http.get<Department[]>(this.baseUrl);
  }

  create(payload: { name: string; managerId?: string }): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, payload);
  }

  update(id: string, payload: { name?: string; managerId?: string }): Observable<Department> {
    return this.http.put<Department>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
