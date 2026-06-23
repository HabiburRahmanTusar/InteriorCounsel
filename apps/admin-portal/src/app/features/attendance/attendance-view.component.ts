import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, tap } from 'rxjs';

import { AttendanceService } from '../../core/services/attendance.service';
import { DailyAttendanceRow } from '../../core/models/attendance.model';

@Component({
  selector: 'wfm-attendance-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Attendance</h1>
        <p class="text-sm text-slate-500">Track employee daily check-in and check-out records</p>
      </div>

      <!-- Filters -->
      <div
        class="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 max-w-md"
      >
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
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
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Employee
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Check-in
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Status
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Check-out
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
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
                    <td class="px-6 py-4 text-sm text-slate-700">{{ row.checkIn?.time || '—' }}</td>
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
                      {{ row.checkOut?.time || '—' }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ row.workingMinutes }}</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class AttendanceViewComponent implements OnDestroy {
  private attendanceService = inject(AttendanceService);
  private destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly rows = signal<DailyAttendanceRow[]>([]);
  readonly date = signal(this.getToday());

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  constructor() {
    this.loadDaily();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
}
