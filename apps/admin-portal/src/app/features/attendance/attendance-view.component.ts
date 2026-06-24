import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnDestroy,
  effect,
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
  template: `
    <div class="space-y-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Attendance</h1>
        <p class="text-sm text-slate-500">
          @if (currentRole() === 'employee') {
            Track and log your daily work shifts and attendance history
          } @else {
            Track employee daily check-in and check-out records
          }
        </p>
      </div>

      @if (currentRole() === 'employee') {
        <!-- Employee Dashboard Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Check-in/Check-out Controller Card -->
          <div
            class="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between h-fit lg:col-span-1"
          >
            <!-- Card Header -->
            <div
              class="p-6 bg-gradient-to-r from-indigo-50 to-sky-50/50 border-b border-slate-100 flex justify-between items-center"
            >
              <div>
                <h3 class="text-sm font-bold text-slate-900">Today's Attendance</h3>
                <p class="text-xs text-slate-500">
                  {{ formatDate(getTodayDateString()) }}
                </p>
              </div>
              <!-- Status Badge -->
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                [class]="
                  todayStatus()?.checkedOut
                    ? 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    : todayStatus()?.checkedIn
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                "
              >
                {{
                  todayStatus()?.checkedOut
                    ? 'Completed'
                    : todayStatus()?.checkedIn
                      ? 'Checked In'
                      : 'Not Checked In'
                }}
              </span>
            </div>

            <!-- Card Content -->
            <div class="p-6 space-y-6">
              <!-- Times Summary -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                    >Check-in</span
                  >
                  <span class="block text-sm font-bold text-slate-800">
                    {{ formatTime(todayStatus()?.checkIn?.time) }}
                  </span>
                  @if (todayStatus()?.checkIn?.status) {
                    <div class="mt-1">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                        [class]="
                          todayStatus()?.checkIn?.status === 'On Time'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'
                            : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                        "
                      >
                        {{ todayStatus()?.checkIn?.status }}
                      </span>
                    </div>
                  }
                </div>
                <div class="space-y-1.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                    >Check-out</span
                  >
                  <span class="block text-sm font-bold text-slate-800">
                    {{ formatTime(todayStatus()?.checkOut?.time) }}
                  </span>
                  @if (todayStatus()?.checkOut?.status) {
                    <div class="mt-1">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                        [class]="
                          todayStatus()?.checkOut?.status === 'Normal'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50'
                            : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                        "
                      >
                        {{ todayStatus()?.checkOut?.status }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Action buttons -->
              <div class="pt-2">
                @if (!todayStatus()?.checkedIn) {
                  <button
                    (click)="checkIn()"
                    [disabled]="checkingInOut()"
                    class="w-full btn btn-primary flex justify-center py-3 text-sm font-semibold tracking-wide shadow-md"
                  >
                    {{ checkingInOut() ? 'Logging Check-in...' : 'Check In' }}
                  </button>
                } @else if (!todayStatus()?.checkedOut) {
                  <button
                    (click)="checkOut()"
                    [disabled]="checkingInOut()"
                    class="w-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex justify-center py-3 rounded-xl text-sm font-semibold tracking-wide shadow-md transition-all"
                  >
                    {{ checkingInOut() ? 'Logging Check-out...' : 'Check Out' }}
                  </button>
                } @else {
                  <div
                    class="text-center p-4 bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold"
                  >
                    🎉 Shifts completed for today.
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- My Attendance History (spanning 2 columns on lg) -->
          <div
            class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm lg:col-span-2"
          >
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 class="text-sm font-bold text-slate-900">My Attendance History</h3>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/70">
                    <th
                      class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                    >
                      Date
                    </th>
                    <th
                      class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                    >
                      Check-in
                    </th>
                    <th
                      class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                    >
                      Check-out
                    </th>
                    <th
                      class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                    >
                      Worked Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @if (historyLoading()) {
                    <tr>
                      <td colspan="4" class="px-6 py-12 text-center text-slate-400">
                        <span class="text-sm font-medium">Loading history...</span>
                      </td>
                    </tr>
                  } @else if (historyItems().length === 0) {
                    <tr>
                      <td colspan="4" class="px-6 py-12 text-center text-slate-400">
                        <span class="text-sm font-medium">No check-in history found</span>
                      </td>
                    </tr>
                  } @else {
                    @for (item of historyItems(); track item.id) {
                      <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td class="px-6 py-4 text-sm font-medium text-slate-900">
                          {{ formatDate(item.attendanceDate) }}
                        </td>
                        <td class="px-6 py-4 text-sm text-slate-700">
                          {{ formatTime(item.checkIn?.time) }}
                          @if (item.checkIn?.status) {
                            <span
                              class="ml-2 inline-flex items-center px-1.5 py-0.1 rounded text-[10px] font-bold uppercase tracking-wider"
                              [class]="
                                item.checkIn?.status === 'On Time'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              "
                            >
                              {{ item.checkIn?.status }}
                            </span>
                          }
                        </td>
                        <td class="px-6 py-4 text-sm text-slate-700">
                          {{ formatTime(item.checkOut?.time) }}
                          @if (item.checkOut?.status) {
                            <span
                              class="ml-2 inline-flex items-center px-1.5 py-0.1 rounded text-[10px] font-bold uppercase tracking-wider"
                              [class]="
                                item.checkOut?.status === 'Normal'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              "
                            >
                              {{ item.checkOut?.status }}
                            </span>
                          }
                        </td>
                        <td class="px-6 py-4 text-sm text-slate-700">
                          {{ formatWorkingHours(item.workingMinutes) }}
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <!-- History Pagination -->
            <div
              class="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50"
            >
              <span class="text-xs text-slate-500">
                Showing {{ historyItems().length }} of {{ historyTotal() }} logs
              </span>
              <div class="flex gap-2">
                <button
                  (click)="prevHistoryPage()"
                  [disabled]="historyPage() <= 1"
                  class="border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
                >
                  Previous
                </button>
                <button
                  (click)="nextHistoryPage()"
                  [disabled]="historyPage() * 10 >= historyTotal()"
                  class="border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <!-- Filters -->
        <div
          class="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 max-w-md"
        >
          <div class="flex-1">
            <label
              class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >Date Filter</label
            >
            <input
              type="date"
              [value]="date()"
              (input)="onDateChange($event)"
              class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        <!-- Table Card -->
        <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/70">
                  <th
                    class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                  >
                    Employee
                  </th>
                  <th
                    class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                  >
                    Check-in
                  </th>
                  <th
                    class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                  >
                    Status
                  </th>
                  <th
                    class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                  >
                    Check-out
                  </th>
                  <th
                    class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4"
                  >
                    Worked (min)
                  </th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                      <span class="text-sm font-medium">Loading attendance...</span>
                    </td>
                  </tr>
                } @else if (rows().length === 0) {
                  <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                      <div class="flex flex-col items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-8 w-8 text-slate-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <span class="text-sm font-medium">No attendance logs for this date</span>
                      </div>
                    </td>
                  </tr>
                } @else {
                  @for (row of rows(); track row.employeeId) {
                    <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td class="px-6 py-4 text-sm font-medium text-slate-900">
                        {{ row.employeeName }}
                        <div class="text-xs text-slate-500 font-normal">{{ row.employeeCode }}</div>
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-700">
                        <div>{{ formatTime(row.checkIn?.time) }}</div>
                        @if (row.checkIn?.location) {
                          <a
                            [href]="
                              'https://www.google.com/maps?q=' +
                              row.checkIn?.location?.latitude +
                              ',' +
                              row.checkIn?.location?.longitude
                            "
                            target="_blank"
                            class="inline-flex items-center gap-0.5 text-[10px] font-mono text-indigo-600 hover:text-indigo-700 hover:underline mt-0.5"
                            title="View on Google Maps"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {{ formatCoords(row.checkIn?.location) }}
                          </a>
                        }
                      </td>
                      <td class="px-6 py-4 text-sm">
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [class]="
                            row.checkIn?.status === 'On Time'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          "
                        >
                          {{ row.checkIn?.status || 'Absent' }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-700">
                        <div>{{ formatTime(row.checkOut?.time) }}</div>
                        @if (row.checkOut?.location) {
                          <a
                            [href]="
                              'https://www.google.com/maps?q=' +
                              row.checkOut?.location?.latitude +
                              ',' +
                              row.checkOut?.location?.longitude
                            "
                            target="_blank"
                            class="inline-flex items-center gap-0.5 text-[10px] font-mono text-indigo-600 hover:text-indigo-700 hover:underline mt-0.5"
                            title="View on Google Maps"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {{ formatCoords(row.checkOut?.location) }}
                          </a>
                        }
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-700">{{ row.workingMinutes }}</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
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
}
