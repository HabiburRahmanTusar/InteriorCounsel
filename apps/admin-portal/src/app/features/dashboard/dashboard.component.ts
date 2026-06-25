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
  templateUrl: './dashboard.component.html',
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
