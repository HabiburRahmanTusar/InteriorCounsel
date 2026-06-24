import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CalendarService, WorkCalendarSettings } from '../../core/services/calendar.service';

@Component({
  selector: 'wfm-weekends-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6 max-w-2xl">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Weekend Settings</h1>
        <p class="text-sm text-slate-500">Configure which days of the week are treated as weekends</p>
      </div>

      <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
        @if (loading()) {
          <div class="py-12 text-center text-slate-400">
            <span class="text-sm font-medium">Loading settings...</span>
          </div>
        } @else {
          <div class="space-y-4 border-b border-slate-100 pb-6">
            <h3 class="text-sm font-bold text-slate-900">Late Penalty Configuration</h3>
            <p class="text-xs text-slate-500">Define how many consecutive late days trigger a 1-day salary deduction.</p>
            <div class="flex items-center gap-4">
              <input
                type="number"
                min="1"
                [value]="penaltyThreshold()"
                (change)="updatePenaltyThreshold($event)"
                class="block w-24 rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
              <span class="text-sm font-medium text-slate-700">Consecutive Lates = 1 Day Deduction</span>
            </div>
          </div>

          <div class="space-y-4">
            <h3 class="text-sm font-bold text-slate-900">Select Weekend Days</h3>
            <p class="text-xs text-slate-500">These days will be excluded from dynamic working days and daily salary calculations.</p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              @for (day of daysOfWeek; track day) {
                <label class="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-slate-50/50 cursor-pointer transition-all" [class.border-indigo-600]="isWeekend(day)" [class.bg-indigo-50]="isWeekend(day)">
                  <input
                    type="checkbox"
                    [checked]="isWeekend(day)"
                    (change)="toggleDay(day)"
                    class="h-4.5 w-4.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-600 cursor-pointer"
                  />
                  <div>
                    <span class="text-sm font-semibold text-slate-800">{{ day }}</span>
                  </div>
                </label>
              }
            </div>
          </div>

          <div class="flex justify-end pt-4 border-t border-slate-100">
            <button
              (click)="save()"
              [disabled]="saving()"
              class="btn btn-primary btn-primary-sm"
            >
              <span>{{ saving() ? 'Saving...' : 'Save Settings' }}</span>
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class WeekendSettingsComponent implements OnDestroy {
  private calendarService = inject(CalendarService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly settings = signal<WorkCalendarSettings | null>(null);
  readonly selectedWeekends = signal<string[]>([]);
  readonly penaltyThreshold = signal<number>(3);

  readonly daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  constructor() {
    this.loadSettings();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSettings() {
    this.calendarService
      .getWorkCalendarSettings()
      .pipe(
        tap((data) => {
          this.settings.set(data);
          this.selectedWeekends.set(data.weekends || []);
          this.penaltyThreshold.set(data.consecutiveLatesPenaltyThreshold || 3);
        }),
        catchError((err) => {
          console.error('Failed to load weekends settings', err);
          this.toastr.error('Failed to load calendar settings', 'Error');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  isWeekend(day: string): boolean {
    return this.selectedWeekends().includes(day);
  }

  toggleDay(day: string) {
    this.selectedWeekends.update((current) => {
      if (current.includes(day)) {
        return current.filter((d) => d !== day);
      } else {
        return [...current, day];
      }
    });
  }

  save() {
    const currentSettings = this.settings();
    if (!currentSettings) return;

    this.saving.set(true);
    const updated: WorkCalendarSettings = {
      ...currentSettings,
      weekends: this.selectedWeekends(),
      consecutiveLatesPenaltyThreshold: this.penaltyThreshold()
    };

    this.calendarService
      .updateWorkCalendarSettings(updated)
      .pipe(
        tap(() => {
          this.toastr.success('Weekend settings updated successfully', 'Success');
        }),
        catchError((err) => {
          console.error('Failed to save weekends settings', err);
          this.toastr.error('Failed to save calendar settings', 'Error');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  updatePenaltyThreshold(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    if (!isNaN(value) && value > 0) {
      this.penaltyThreshold.set(value);
    }
  }
}
