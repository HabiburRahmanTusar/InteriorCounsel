import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, tap } from 'rxjs';

import { ShiftService } from '../../core/services/shift.service';
import { Shift } from '../../core/models/shift.model';

@Component({
  selector: 'wfm-shift-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Shifts</h1>
          <p class="text-sm text-slate-500">Configure standard operating hours and grace periods</p>
        </div>
        <button
          class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl px-4 py-2.5 transition-colors shadow-sm shadow-indigo-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>New shift</span>
        </button>
      </div>

      <!-- Table Card -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Name
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Start Time
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  End Time
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Grace (min)
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Timezone
                </th>
                <th
                  class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 text-right"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                    <span class="text-sm font-medium">Loading shifts...</span>
                  </td>
                </tr>
              } @else if (shifts().length === 0) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-400">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span class="text-sm font-medium">No shifts configured</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (shift of shifts(); track shift.id) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 text-sm font-medium text-slate-900">{{ shift.name }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ shift.startTime }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ shift.endTime }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ shift.gracePeriod }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ shift.timezone }}</td>
                    <td class="px-6 py-4 text-right text-sm">
                      <button class="text-indigo-600 hover:text-indigo-700 font-semibold">
                        Edit
                      </button>
                    </td>
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
export class ShiftListComponent implements OnDestroy {
  private shiftService = inject(ShiftService);
  private destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly shifts = signal<Shift[]>([]);

  constructor() {
    this.loadShifts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadShifts() {
    this.loading.set(true);
    this.shiftService
      .list()
      .pipe(
        tap((data) => this.shifts.set(data)),
        catchError((err) => {
          console.error('Failed to load shifts', err);
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }
}
