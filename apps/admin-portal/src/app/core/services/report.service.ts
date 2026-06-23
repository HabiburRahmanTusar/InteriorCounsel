import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface DailyReportParams {
  date: string;
}

export interface MonthlyReportParams {
  month: string; // YYYY-MM
}

export interface ExportReportParams {
  format: 'excel' | 'csv' | 'pdf';
  from: string;
  to: string;
}

/**
 * Report API client — wraps /api/reports endpoints.
 * Business logic NOT implemented yet — see build plan §8 (Reports).
 */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/reports`;

  daily(params: DailyReportParams): Observable<unknown> {
    const httpParams = new HttpParams().set('date', params.date);
    return this.http.get(`${this.baseUrl}/daily`, { params: httpParams });
  }

  monthly(params: MonthlyReportParams): Observable<unknown> {
    const httpParams = new HttpParams().set('month', params.month);
    return this.http.get(`${this.baseUrl}/monthly`, { params: httpParams });
  }

  export(params: ExportReportParams): Observable<Blob> {
    const httpParams = new HttpParams()
      .set('format', params.format)
      .set('from', params.from)
      .set('to', params.to);
    return this.http.get(`${this.baseUrl}/export`, {
      params: httpParams,
      responseType: 'blob',
    });
  }
}
