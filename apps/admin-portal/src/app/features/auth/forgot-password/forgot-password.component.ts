import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'wfm-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="w-full max-w-[400px] bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
        <!-- Logo / Title -->
        <div class="flex flex-col items-center gap-2 mb-6">
          <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            A
          </div>
          <h2 class="text-xl font-bold text-slate-900 mt-2">Reset password</h2>
          <p class="text-xs text-slate-500 text-center">We will send you a secure link to reset your account credentials.</p>
        </div>

        @if (sent()) {
          <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-sm font-medium mb-4 flex items-start gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>If that email exists in our system, a reset link is on its way.</span>
          </div>
          <a routerLink="/login" class="w-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl py-3.5 transition-colors">
            Back to sign in
          </a>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email address</label>
              <input
                type="email"
                formControlName="email"
                placeholder="admin@company.com"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              [disabled]="loading()"
              class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors shadow-sm shadow-indigo-100"
            >
              <span>Send reset link</span>
            </button>

            <a routerLink="/login" class="w-full flex items-center justify-center border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl py-3.5 transition-colors mt-2">
              Cancel and return
            </a>
          </form>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly sent = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO: call auth.forgotPassword, then set sent.set(true)
  }
}
