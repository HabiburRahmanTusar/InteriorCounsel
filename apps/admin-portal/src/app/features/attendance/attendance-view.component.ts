import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnDestroy,
  effect,
  computed,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, tap } from 'rxjs';

import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import {
  DailyAttendanceRow,
  Attendance,
  AttendanceStatus,
} from '../../core/models/attendance.model';

@Component({
  selector: 'wfm-attendance-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './attendance-view.component.html',
})
export class AttendanceViewComponent implements OnDestroy {
  private attendanceService = inject(AttendanceService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly currentRole = this.authService.currentRole;

  // Admin specific
  readonly loading = signal(false);
  readonly rows = signal<DailyAttendanceRow[]>([]);
  readonly date = signal(this.getToday());

  readonly totalEmployees = computed(() => this.rows().length);
  readonly totalPresent = computed(
    () => this.rows().filter((r) => r.status === 'On Time' || r.status === 'Late').length,
  );
  readonly totalLate = computed(() => this.rows().filter((r) => r.status === 'Late').length);
  readonly totalAbsent = computed(() => this.rows().filter((r) => r.status === 'Absent').length);

  // Employee specific
  readonly todayStatus = signal<AttendanceStatus | null>(null);
  readonly checkingInOut = signal(false);
  readonly userProfile = signal<any | null>(null);

  readonly historyItems = signal<Attendance[]>([]);
  readonly historyTotal = signal(0);
  readonly historyPage = signal(1);
  readonly historyLoading = signal(false);

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  getTodayDateString(): string {
    return new Date().toISOString();
  }

  private loadedRole: string | null = null;

  constructor() {
    effect(
      () => {
        const role = this.currentRole();
        if (!role) {
          this.loadedRole = null;
          return;
        }
        if (role === this.loadedRole) return;
        this.loadedRole = role;

        if (role === 'employee') {
          this.loadTodayStatus();
          this.loadProfile();
          this.loadHistory();
        } else {
          this.loadDaily();
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTodayStatus() {
    this.attendanceService
      .status()
      .pipe(
        tap((status) => this.todayStatus.set(status)),
        catchError((err) => {
          console.error('Failed to load today status', err);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  loadProfile() {
    this.authService
      .getMe()
      .pipe(
        tap((profile) => this.userProfile.set(profile)),
        catchError((err) => {
          console.error('Failed to load profile', err);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  loadHistory() {
    this.historyLoading.set(true);
    this.attendanceService
      .history({
        page: this.historyPage(),
        limit: 10,
      })
      .pipe(
        tap((res) => {
          this.historyItems.set(res.items);
          this.historyTotal.set(res.total);
        }),
        catchError((err) => {
          console.error('Failed to load history', err);
          return of({ items: [], total: 0 });
        }),
        finalize(() => this.historyLoading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  prevHistoryPage() {
    if (this.historyPage() > 1) {
      this.historyPage.update((p) => p - 1);
      this.loadHistory();
    }
  }

  nextHistoryPage() {
    const totalPages = Math.ceil(this.historyTotal() / 10) || 1;
    if (this.historyPage() < totalPages) {
      this.historyPage.update((p) => p + 1);
      this.loadHistory();
    }
  }

  checkIn() {
    this.checkingInOut.set(true);
    this.getCoordinates()
      .then((coords) => {
        this.attendanceService
          .checkIn(coords)
          .pipe(
            tap(() => {
              this.toastr.success('Check-in successful', 'Success');
              this.loadTodayStatus();
              this.loadHistory();
            }),
            catchError((err) => {
              const msg = err.error?.message || 'Check-in failed. Please try again.';
              this.toastr.error(msg, 'Error');
              return of(null);
            }),
            finalize(() => this.checkingInOut.set(false)),
            takeUntil(this.destroy$),
          )
          .subscribe();
      })
      .catch((err) => {
        this.toastr.error(err.message || 'Failed to get location', 'Location Error');
        this.checkingInOut.set(false);
      });
  }

  checkOut() {
    this.checkingInOut.set(true);
    this.getCoordinates()
      .then((coords) => {
        this.attendanceService
          .checkOut(coords)
          .pipe(
            tap(() => {
              this.toastr.success('Check-out successful', 'Success');
              this.loadTodayStatus();
              this.loadHistory();
            }),
            catchError((err) => {
              const msg = err.error?.message || 'Check-out failed. Please try again.';
              this.toastr.error(msg, 'Error');
              return of(null);
            }),
            finalize(() => this.checkingInOut.set(false)),
            takeUntil(this.destroy$),
          )
          .subscribe();
      })
      .catch((err) => {
        this.toastr.error(err.message || 'Failed to get location', 'Location Error');
        this.checkingInOut.set(false);
      });
  }

  private getCoordinates(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve({
          latitude: 23.8103,
          longitude: 90.4125,
        });
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          resolve({
            latitude: 23.8103,
            longitude: 90.4125,
          });
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    });
  }

  // Admin daily logs
  loadDaily() {
    this.loading.set(true);
    this.attendanceService
      .daily(this.date())
      .pipe(
        tap((data) => this.rows.set(data)),
        catchError((err) => {
          console.error('Failed to load attendance', err);
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  onDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.date.set(value);
      this.loadDaily();
    }
  }

  // Format helpers
  formatTime(isoString?: string): string {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  formatDate(isoString?: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatWorkingHours(minutes: number): string {
    if (!minutes) return '0h';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  }

  formatCoords(location?: { latitude: number; longitude: number }): string {
    if (!location || location.latitude === undefined || location.longitude === undefined) {
      return '';
    }
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }

  format12Hour(timeStr?: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length !== 2) return timeStr;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    const strHour = hour < 10 ? `0${hour}` : `${hour}`;
    return `${strHour}:${minute} ${ampm}`;
  }
}
