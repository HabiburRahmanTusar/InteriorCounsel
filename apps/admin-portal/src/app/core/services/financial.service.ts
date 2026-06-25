import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface FinancialRecord {
  _id?: string;
  period: string; // YYYY-MM
  monthlySales: number;
  monthlyProfit: number;
  outstandingDue: number;
  billsPendingCollection: number;
  prevProfitShareBalance: number;
  recentProfit: number;
  currentTotalBalance: number;
  monthlySubsidy: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResult<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class FinancialService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/financial`;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    month?: string;
    year?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Observable<PaginatedResult<FinancialRecord>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        httpParams = httpParams.set(key, String(val));
      }
    });
    return this.http.get<PaginatedResult<FinancialRecord>>(this.baseUrl, { params: httpParams });
  }

  getLatest(): Observable<{ success: boolean; data: FinancialRecord | null }> {
    return this.http.get<{ success: boolean; data: FinancialRecord | null }>(`${this.baseUrl}/latest`);
  }

  getById(id: string): Observable<{ success: boolean; data: FinancialRecord }> {
    return this.http.get<{ success: boolean; data: FinancialRecord }>(`${this.baseUrl}/${id}`);
  }

  create(payload: Omit<FinancialRecord, '_id' | 'createdAt' | 'updatedAt'>): Observable<{ success: boolean; data: FinancialRecord }> {
    return this.http.post<{ success: boolean; data: FinancialRecord }>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<FinancialRecord>): Observable<{ success: boolean; data: FinancialRecord }> {
    return this.http.put<{ success: boolean; data: FinancialRecord }>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
