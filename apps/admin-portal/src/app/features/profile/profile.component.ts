import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'wfm-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);

  readonly profile = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.auth
      .getMe()
      .pipe(
        tap((res) => {
          this.profile.set(res);
        }),
        catchError((err) => {
          console.error('Failed to load profile', err);
          this.error.set('Failed to load profile details. Please try again.');
          return of(null);
        }),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe();
  }

  userInitial(): string {
    const name = this.profile()?.name || '';
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  getShift(): any {
    return this.profile()?.shiftId;
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours.toString().padStart(2, '0')}:${displayMinutes} ${ampm}`;
  }
}
