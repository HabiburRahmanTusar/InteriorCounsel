import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, tap } from 'rxjs';

import { AttendanceService } from '../../core/services/attendance.service';
import { DailyAttendanceRow } from '../../core/models/attendance.model';

@Component({
  selector: 'wfm-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p class="text-sm text-slate-500">Real-time attendance summary for today</p>
      </div>

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          class="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center justify-between transition-all hover:border-slate-300"
        >
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Present today</span
            >
            <div class="text-3xl font-bold text-slate-900">{{ present() }}</div>
          </div>
          <div
            class="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div
          class="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center justify-between transition-all hover:border-slate-300"
        >
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Absent today</span
            >
            <div class="text-3xl font-bold text-slate-900">{{ absent() }}</div>
          </div>
          <div
            class="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div
          class="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center justify-between transition-all hover:border-slate-300"
        >
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Late arrivals</span
            >
            <div class="text-3xl font-bold text-slate-900">{{ late() }}</div>
          </div>
          <div
            class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div
          class="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center justify-between transition-all hover:border-slate-300"
        >
          <div class="space-y-1">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Early departures</span
            >
            <div class="text-3xl font-bold text-slate-900">{{ early() }}</div>
          </div>
          <div
            class="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Placeholder Info Card -->
      <div class="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-start gap-4">
        <div
          class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"
        >
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="space-y-1">
          <h4 class="text-sm font-semibold text-slate-900">Scaffolding Reserve</h4>
          <p class="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Dashboard widgets will be wired in Phase 2 of the build plan. The stat tiles above
            reserve the layout for the Present / Absent / Late / Early Departures KPIs.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnDestroy {
  private attendanceService = inject(AttendanceService);
  private destroy$ = new Subject<void>();

  readonly present = signal(0);
  readonly absent = signal(0);
  readonly late = signal(0);
  readonly early = signal(0);

  constructor() {
    this.loadTodaySummary();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTodaySummary() {
    const today = new Date().toISOString().split('T')[0];
    this.attendanceService
      .daily(today)
      .pipe(
        tap((rows: DailyAttendanceRow[]) => {
          let present = 0;
          let absent = 0;
          let late = 0;
          let early = 0;
          for (const row of rows) {
            if (row.status === 'On Time' || row.status === 'Late') {
              present++;
              if (row.status === 'Late') late++;
            } else if (row.status === 'Absent') {
              absent++;
            }
            if (row.checkOut?.status === 'Early Leave') early++;
          }
          this.present.set(present);
          this.absent.set(absent);
          this.late.set(late);
          this.early.set(early);
        }),
        catchError((err) => {
          console.error('Failed to load dashboard summary', err);
          return of([]);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }
}
