import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Settings API client — wraps /api/settings endpoints.
 * Business logic NOT implemented yet — see build plan §8 (Settings).
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/settings`;

  updateAttendanceRules(payload: {
    defaultGracePeriodMinutes?: number;
    defaultTimezone?: string;
  }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/attendance-rules`, payload);
  }

  getCompany(): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/company`);
  }

  updateCompany(payload: unknown): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/company`, payload);
  }
}
