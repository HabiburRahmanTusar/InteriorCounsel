import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, combineLatest } from 'rxjs';
import { takeUntil, catchError, tap, finalize } from 'rxjs/operators';
import { LeaveService } from '../../core/services/leave.service';
import {
  CalendarService,
  WorkCalendarSettings,
  HolidayRecord,
} from '../../core/services/calendar.service';
import { LeaveBalance, LeaveRequest } from '../../core/services/leave.service';

@Component({
  selector: 'app-my-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-leaves.component.html',
})
export class MyLeavesComponent implements OnInit, OnDestroy {
  private leaveService = inject(LeaveService);
  private calendarService = inject(CalendarService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  balance = signal<LeaveBalance | null>(null);
  requests = signal<LeaveRequest[]>([]);
  showRequestModal = signal(false);
  saving = signal(false);

  newRequest: Partial<LeaveRequest> = { leaveType: 'Annual' };
  calculatedDays = signal(0);

  private weekends: string[] = ['Friday', 'Saturday'];
  private holidays: string[] = [];

  ngOnInit() {
    this.loadData();
    this.loadCalendarData();
  }

  loadData() {
    this.leaveService
      .getMyBalance()
      .pipe(
        tap((b) => this.balance.set(b)),
        takeUntil(this.destroy$),
      )
      .subscribe();

    this.leaveService
      .getMyRequests()
      .pipe(
        tap((reqs) => this.requests.set(reqs)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  loadCalendarData() {
    combineLatest([
      this.calendarService.getWorkCalendarSettings(),
      this.calendarService.getHolidays(),
    ])
      .pipe(
        tap(([settings, holidays]) => {
          if (settings && settings.weekends) {
            this.weekends = settings.weekends;
          }
          this.holidays = holidays.map((h) => new Date(h.date).toISOString().split('T')[0]);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  openRequestModal() {
    this.newRequest = { leaveType: 'Annual' };
    this.calculatedDays.set(0);
    this.showRequestModal.set(true);
  }

  closeRequestModal() {
    this.showRequestModal.set(false);
  }

  calculateDays() {
    if (!this.newRequest.startDate || !this.newRequest.endDate) {
      this.calculatedDays.set(0);
      return;
    }

    const start = new Date(this.newRequest.startDate);
    const end = new Date(this.newRequest.endDate);

    if (end < start) {
      this.calculatedDays.set(0);
      return;
    }

    let workingDays = 0;
    let currentDay = new Date(start);

    while (currentDay <= end) {
      const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'long' });
      // Important to use local timezone for date string matching
      const dateStr = [
        currentDay.getFullYear(),
        ('0' + (currentDay.getMonth() + 1)).slice(-2),
        ('0' + currentDay.getDate()).slice(-2),
      ].join('-');

      if (!this.weekends.includes(dayName) && !this.holidays.includes(dateStr)) {
        workingDays++;
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }

    this.calculatedDays.set(workingDays);
  }

  submitRequest() {
    if (!this.newRequest.startDate || !this.newRequest.endDate || !this.newRequest.reason) {
      this.toastr.warning('Please fill all required fields');
      return;
    }

    if (this.calculatedDays() <= 0) {
      this.toastr.warning('Selected date range contains no working days');
      return;
    }

    this.saving.set(true);
    this.leaveService
      .submitMyRequest(this.newRequest)
      .pipe(
        tap(() => {
          this.toastr.success('Leave request submitted successfully');
          this.closeRequestModal();
          this.loadData();
        }),
        catchError((err) => {
          this.toastr.error(err.error?.message || 'Failed to submit leave request');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
