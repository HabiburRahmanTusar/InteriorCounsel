import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy, computed } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { catchError, of, tap } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';

import { AttendanceService } from '../../core/services/attendance.service';
import { DailyAttendanceRow } from '../../core/models/attendance.model';

@Component({
  selector: 'wfm-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnDestroy {
  private attendanceService = inject(AttendanceService);
  private destroy$ = new Subject<void>();

  readonly present = signal(0);
  readonly absent = signal(0);
  readonly late = signal(0);
  readonly early = signal(0);

  readonly allRows = signal<DailyAttendanceRow[]>([]);
  readonly activeFilter = signal<'all' | 'present' | 'absent' | 'late' | 'early'>('all');

  readonly filteredRows = computed(() => {
    const filter = this.activeFilter();
    const rows = this.allRows();

    if (filter === 'all') return rows;
    if (filter === 'present') {
      return rows.filter((r) => r.status === 'On Time' || r.status === 'Late');
    }
    if (filter === 'absent') {
      return rows.filter((r) => r.status === 'Absent');
    }
    if (filter === 'late') {
      return rows.filter((r) => r.status === 'Late');
    }
    if (filter === 'early') {
      return rows.filter((r) => r.checkOut?.status === 'Early Leave');
    }
    return rows;
  });

  readonly attendanceRate = computed(() => {
    const total = this.allRows().length;
    if (total === 0) return 0;
    return Math.round((this.present() / total) * 100);
  });

  readonly today = new Date();

  constructor() {
    this.loadTodaySummary();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(filter: 'all' | 'present' | 'absent' | 'late' | 'early') {
    if (this.activeFilter() === filter) {
      this.activeFilter.set('all'); // toggle back to all
    } else {
      this.activeFilter.set(filter);
    }
  }

  formatWorkingTime(minutes: number): string {
    if (!minutes || minutes <= 0) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  }

  loadTodaySummary() {
    const todayStr = new Date().toISOString().split('T')[0];
    this.attendanceService
      .daily(todayStr)
      .pipe(
        tap((rows: DailyAttendanceRow[]) => {
          this.allRows.set(rows);
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
