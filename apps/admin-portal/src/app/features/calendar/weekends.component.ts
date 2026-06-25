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
  templateUrl: './weekends.component.html',
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
    'Sunday',
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
        takeUntil(this.destroy$),
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
      consecutiveLatesPenaltyThreshold: this.penaltyThreshold(),
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
        takeUntil(this.destroy$),
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
