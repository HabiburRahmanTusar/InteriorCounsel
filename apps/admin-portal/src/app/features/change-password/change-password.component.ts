import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, finalize, of, tap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'wfm-change-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toastr = inject(ToastrService);
  private router = inject(Router);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    {
      validators: (group) => {
        const pass = group.get('newPassword')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return pass === confirm ? null : { mismatch: true };
      },
    },
  );

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const { oldPassword, newPassword } = this.form.getRawValue();

    this.auth
      .changePassword({ oldPassword, newPassword })
      .pipe(
        tap(() => {
          this.toastr.success('Your password has been changed successfully.', 'Success');
          this.form.reset();
        }),
        catchError((err) => {
          const errMsg =
            err.error?.message || 'Failed to change password. Please check your old password.';
          this.toastr.error(errMsg, 'Error');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe();
  }
}
