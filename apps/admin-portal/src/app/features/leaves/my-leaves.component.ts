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
    this.newRequest = { leaveType: 'Annual', halfDay: false };
    this.calculatedDays.set(0);
    this.showRequestModal.set(true);
  }

  closeRequestModal() {
    this.showRequestModal.set(false);
  }

  calculateDays() {
    if (!this.newRequest.startDate) {
      this.calculatedDays.set(0);
      return;
    }

    if (this.newRequest.halfDay) {
      this.newRequest.endDate = this.newRequest.startDate;
      this.calculatedDays.set(0.5);
      return;
    }

    if (!this.newRequest.endDate) {
      this.calculatedDays.set(0);
      return;
    }

    const startParts = this.newRequest.startDate.split('-');
    const endParts = this.newRequest.endDate.split('-');
    const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));

    if (end < start) {
      this.calculatedDays.set(0);
      return;
    }

    let workingDays = 0;
    let current = new Date(start);
    while (current <= end) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });
      const yr = current.getFullYear();
      const mo = String(current.getMonth() + 1).padStart(2, '0');
      const dy = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${dy}`;

      if (!this.weekends.includes(dayName) && !this.holidays.includes(dateStr)) {
        workingDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    this.calculatedDays.set(workingDays);
  }

  submitRequest() {
    if (!this.newRequest.startDate || (!this.newRequest.halfDay && !this.newRequest.endDate) || !this.newRequest.reason) {
      this.toastr.warning('Please fill all required fields');
      return;
    }

    if (this.newRequest.halfDay) {
      this.newRequest.endDate = this.newRequest.startDate;
    }

    if (this.calculatedDays() <= 0) {
      this.toastr.warning('Selected date range contains no working days');
      return;
    }

    const limit = this.getRemainingBalanceForSelectedType();
    if (this.calculatedDays() > limit) {
      this.toastr.warning('Requested days exceed your remaining balance');
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

  cancelRequest(id?: string) {
    if (!id) return;
    if (confirm('Are you sure you want to cancel this leave request?')) {
      this.leaveService
        .cancelMyRequest(id)
        .pipe(
          tap(() => {
            this.toastr.success('Leave request cancelled successfully');
            this.loadData();
          }),
          catchError((err) => {
            this.toastr.error(err.error?.message || 'Failed to cancel leave request');
            return of(null);
          }),
          takeUntil(this.destroy$),
        )
        .subscribe();
    }
  }

  getRemainingBalanceForSelectedType(): number {
    if (!this.balance()) return 0;
    const type = this.newRequest.leaveType || 'Annual';
    if (type === 'Unpaid') return Infinity;
    const rem = this.balance()?.remaining;
    if (!rem) return 0;
    if (type === 'Annual') return rem.Annual;
    if (type === 'Sick') return rem.Sick;
    if (type === 'Casual') return rem.Casual;
    return 0;
  }

  isUnlimited(): boolean {
    return this.getRemainingBalanceForSelectedType() === Infinity;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
