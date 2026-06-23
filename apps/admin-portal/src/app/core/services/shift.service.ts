import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Shift } from '../models/shift.model';

/**
 * Shift API client — wraps /api/shifts endpoints.
 * Business logic NOT implemented yet — see build plan §8 (Shift Management).
 */
@Injectable({ providedIn: 'root' })
export class ShiftService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/shifts`;

  list(): Observable<Shift[]> {
    return this.http.get<Shift[]>(this.baseUrl);
  }

  create(payload: Partial<Shift>): Observable<Shift> {
    return this.http.post<Shift>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Shift>): Observable<Shift> {
    return this.http.put<Shift>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
