import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WorkCalendarSettings {
  weekends: string[];
  officeStartTime: string;
  officeEndTime: string;
  gracePeriod: number;
  lateResetsMonthly: boolean;
  consecutiveLatesPenaltyThreshold: number;
}

export interface HolidayRecord {
  _id: string;
  name: string;
  date: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private readonly settingsUrl = `${environment.apiBaseUrl}/settings/work-calendar`;
  private readonly holidaysUrl = `${environment.apiBaseUrl}/holidays`;

  getWorkCalendarSettings(): Observable<WorkCalendarSettings> {
    return this.http.get<WorkCalendarSettings>(this.settingsUrl);
  }

  updateWorkCalendarSettings(settings: WorkCalendarSettings): Observable<void> {
    return this.http.put<void>(this.settingsUrl, settings);
  }

  getHolidays(): Observable<HolidayRecord[]> {
    return this.http.get<HolidayRecord[]>(this.holidaysUrl);
  }

  createHoliday(name: string, date: string): Observable<HolidayRecord> {
    return this.http.post<HolidayRecord>(this.holidaysUrl, { name, date });
  }

  deleteHoliday(id: string): Observable<void> {
    return this.http.delete<void>(`${this.holidaysUrl}/${id}`);
  }
}
