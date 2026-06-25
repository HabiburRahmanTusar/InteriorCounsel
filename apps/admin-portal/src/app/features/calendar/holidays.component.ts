import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CalendarService, HolidayRecord } from '../../core/services/calendar.service';

@Component({
  selector: 'wfm-holidays-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './holidays.component.html',
})
export class HolidaysSettingsComponent implements OnDestroy {
  private calendarService = inject(CalendarService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly showAddModal = signal(false);
  readonly holidays = signal<HolidayRecord[]>([]);

  constructor() {
    this.loadHolidays();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHolidays() {
    this.loading.set(true);
    this.calendarService
      .getHolidays()
      .pipe(
        tap((data) => this.holidays.set(data)),
        catchError((err) => {
          console.error('Failed to load holidays', err);
          this.toastr.error('Failed to load holidays', 'Error');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  openAddModal() {
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitHoliday(name: string, date: string) {
    if (!name.trim() || !date) {
      this.toastr.warning('Please enter all required fields', 'Warning');
      return;
    }
    this.submitting.set(true);
    this.calendarService
      .createHoliday(name, date)
      .pipe(
        tap((newHoliday) => {
          this.toastr.success('Holiday created successfully', 'Success');
          this.loadHolidays();
          this.closeAddModal();
        }),
        catchError((err) => {
          console.error('Failed to create holiday', err);
          this.toastr.error(err.error?.message || 'Failed to create holiday', 'Error');
          return of(null);
        }),
        finalize(() => this.submitting.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  deleteHoliday(holiday: HolidayRecord) {
    if (
      confirm(
        `Are you sure you want to delete the holiday "${holiday.name}"? This will trigger salary recalculation.`,
      )
    ) {
      this.calendarService
        .deleteHoliday(holiday._id)
        .pipe(
          tap(() => {
            this.toastr.success('Holiday deleted successfully', 'Success');
            this.loadHolidays();
          }),
          catchError((err) => {
            console.error('Failed to delete holiday', err);
            this.toastr.error('Failed to delete holiday', 'Error');
            return of(null);
          }),
          takeUntil(this.destroy$),
        )
        .subscribe();
    }
  }
}
