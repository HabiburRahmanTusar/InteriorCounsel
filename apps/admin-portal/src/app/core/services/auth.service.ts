import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AuthTokens, LoginPayload, AuthUser } from '../models/auth.model';

/**
 * Auth service — handles tokens, current user, and session state.
 * Business logic NOT implemented yet — see build plan §8 (Setup & Auth).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<AuthUser | null>(null);

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._user.asReadonly();

  isAuthenticated = computed(() => this._accessToken() !== null);
  currentRole = computed(() => this._user()?.role ?? null);

  login(payload: LoginPayload): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/login`, payload).pipe(
      tap((tokens: any) => {
        const user: AuthUser = {
          id: tokens.id || '',
          employeeId: tokens.employeeId || '',
          name: tokens.name || payload.email.split('@')[0],
          email: payload.email,
          role: tokens.role || 'admin',
        };
        this.setSession(tokens, user, payload.rememberMe ?? false);
      }),
    );
  }

  logout(): Observable<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<void>(`${this.baseUrl}/logout`, { refreshToken })
      .pipe(tap(() => this.clearSession()));
  }

  refreshToken(refreshToken: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/refresh-token`, { refreshToken });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(payload: { resetToken: string; newPassword: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, payload);
  }

  // ---- Session helpers ----

  setSession(tokens: AuthTokens, user: AuthUser, rememberMe: boolean = false): void {
    this._accessToken.set(tokens.accessToken);
    this._user.set(user);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('accessToken', tokens.accessToken);
    storage.setItem('refreshToken', tokens.refreshToken);
    storage.setItem('currentUser', JSON.stringify(user));

    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem('accessToken');
    otherStorage.removeItem('refreshToken');
    otherStorage.removeItem('currentUser');
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._user.set(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('currentUser');
  }

  restoreSession(): void {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (token) {
      this._accessToken.set(token);
    }
    if (userStr) {
      try {
        this._user.set(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to restore user from storage', e);
      }
    }
  }
}
