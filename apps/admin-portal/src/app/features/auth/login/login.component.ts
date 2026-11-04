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
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly hide = signal(true);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['admin@attendly.com', [Validators.required, Validators.email]],
    password: ['password123', [Validators.required, Validators.minLength(8)]],
    rememberMe: [true],
  });

  fillAdminDemo() {
    this.form.patchValue({
      email: 'admin@attendly.com',
      password: 'password123',
      rememberMe: true,
    });
  }

  private handleError(error: any): void {
    console.error('Login failed', error);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.loading.set(true);
    const { email, password, rememberMe } = this.form.getRawValue();
    this.auth
      .login({ email, password, rememberMe })
      .pipe(
        tap(() => {
          this.router.navigate(['/dashboard']);
        }),
        catchError((err) => {
          this.errorMessage.set(err.error?.message || 'Invalid email or password.');
          this.handleError(err);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }
}
