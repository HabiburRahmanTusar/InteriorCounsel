import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { OfficeLocation } from '../models/office-location.model';

/**
 * Settings API client — wraps /api/settings endpoints.
 * Business logic NOT implemented yet — see build plan §8 (Settings).
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/settings`;

  listOfficeLocations(): Observable<OfficeLocation[]> {
    return this.http.get<OfficeLocation[]>(`${this.baseUrl}/office-locations`);
  }

  createOfficeLocation(payload: Partial<OfficeLocation>): Observable<OfficeLocation> {
    return this.http.post<OfficeLocation>(`${this.baseUrl}/office-locations`, payload);
  }

  updateOfficeLocation(id: string, payload: Partial<OfficeLocation>): Observable<OfficeLocation> {
    return this.http.put<OfficeLocation>(`${this.baseUrl}/office-locations/${id}`, payload);
  }

  updateAttendanceRules(payload: {
    defaultGracePeriodMinutes?: number;
    defaultOfficeRadiusMeters?: number;
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
