import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ReportService } from '../../core/services/report.service';
import { EmployeeService } from '../../core/services/employee.service';
import { Employee } from '../../core/models/employee.model';

@Component({
  selector: 'wfm-leave-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './leave-report.component.html',
})
export class LeaveReportComponent implements OnDestroy {
  private reportService = inject(ReportService);
  private employeeService = inject(EmployeeService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly from = signal(this.getStartOfMonth());
  readonly to = signal(this.getToday());
  readonly selectedEmployeeId = signal<string>('');
  readonly selectedLeaveType = signal<string>('');
  readonly employees = signal<Employee[]>([]);
  readonly reportData = signal<any | null>(null);

  readonly loading = signal(false);
  readonly exporting = signal(false);

  readonly leaveTypes = ['Annual', 'Sick', 'Casual', 'Unpaid'];

  constructor() {
    this.loadEmployees();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getStartOfMonth(): string {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-01`;
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  loadEmployees() {
    this.employeeService
      .list({ page: 1, limit: 1000, status: 'active' })
      .pipe(
        tap((res) => {
          this.employees.set(res.data || []);
        }),
        catchError((err) => {
          console.error(err);
          this.toastr.error('Failed to load employees', 'Error');
          return of({ data: [], total: 0 });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  setFrom(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.from.set(value);
  }

  setTo(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.to.set(value);
  }

  setEmployee(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedEmployeeId.set(value);
  }

  setLeaveType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedLeaveType.set(value);
  }

  search() {
    this.loading.set(true);
    this.reportService
      .leaveWise({
        employeeId: this.selectedEmployeeId() || undefined,
        leaveType: this.selectedLeaveType() || undefined,
        from: this.from(),
        to: this.to(),
      })
      .pipe(
        tap((data) => {
          this.reportData.set(data);
        }),
        catchError((err) => {
          console.error(err);
          this.toastr.error('Failed to generate leave report', 'Error');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  reset() {
    this.selectedEmployeeId.set('');
    this.selectedLeaveType.set('');
    this.from.set(this.getStartOfMonth());
    this.to.set(this.getToday());
    this.reportData.set(null);
  }

  exportReport(format: 'excel' | 'csv' | 'pdf') {
    this.exporting.set(true);
    this.reportService
      .exportLeaveWise({
        format,
        employeeId: this.selectedEmployeeId() || undefined,
        leaveType: this.selectedLeaveType() || undefined,
        from: this.from(),
        to: this.to(),
      })
      .pipe(
        catchError((err) => {
          console.error(err);
          this.toastr.error('Export failed. Please try again.', 'Error');
          return of(null);
        }),
        finalize(() => this.exporting.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe((blob: Blob | null) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const extension = format === 'excel' ? 'xlsx' : format;
          a.download = `leave-report-${this.from()}-${this.to()}.${extension}`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success('Report exported successfully', 'Success');
        }
      });
  }
}
