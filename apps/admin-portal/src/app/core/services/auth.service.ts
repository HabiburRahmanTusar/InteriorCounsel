import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

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
    // TODO: POST /auth/login — store tokens, hydrate user, return tokens
    return this.http.post<AuthTokens>(`${this.baseUrl}/login`, payload);
  }

  logout(): Observable<void> {
    // TODO: POST /auth/logout with refresh token, then clear local session
    return of(void 0);
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

  setSession(tokens: AuthTokens, user: AuthUser): void {
    this._accessToken.set(tokens.accessToken);
    // TODO: persist to localStorage / sessionStorage
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._user.set(null);
    // TODO: clear persistence
  }
}
