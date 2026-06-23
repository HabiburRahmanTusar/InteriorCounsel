import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, tap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AuthTokens, AuthUser } from '../../../core/models/auth.model';

@Component({
  selector: 'wfm-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div
        class="w-full max-w-[400px] bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm"
      >
        <!-- Logo / Title -->
        <div class="flex flex-col items-center gap-2 mb-6">
          <div
            class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm"
          >
            A
          </div>
          <h2 class="text-xl font-bold text-slate-900 mt-2">Sign in to Attendly</h2>
          <p class="text-xs text-slate-500">Enter your administrator credentials below</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <!-- Email field -->
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >Email address</label
            >
            <input
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="admin@company.com"
              class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
            />
          </div>

          <!-- Password field -->
          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >Password</label
              >
              <a
                routerLink="/forgot-password"
                class="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >Forgot password?</a
              >
            </div>
            <div class="relative">
              <input
                [type]="hide() ? 'password' : 'text'"
                formControlName="password"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl pl-3.5 pr-10 py-2.5 text-sm outline-none transition-all"
              />
              <button
                type="button"
                (click)="hide.set(!hide())"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                [attr.aria-label]="hide() ? 'Show password' : 'Hide password'"
              >
                @if (hide()) {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                } @else {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                }
              </button>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors shadow-sm shadow-indigo-100"
          >
            <span>Sign in</span>
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly hide = signal(true);
  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  private handleError(error: any): void {
    console.error('Login failed', error);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth
      .login({ email, password })
      .pipe(
        tap((tokens: AuthTokens) => {
          const user: AuthUser = {
            id: tokens.id || '',
            employeeId: tokens.employeeId || '',
            name: email.split('@')[0],
            email,
            role: 'admin',
          };
          this.auth.setSession(tokens, user);
          this.router.navigate(['/dashboard']);
        }),
        catchError((err) => {
          this.handleError(err);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }
}
