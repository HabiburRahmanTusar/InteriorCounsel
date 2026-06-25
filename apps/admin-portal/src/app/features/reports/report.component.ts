import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ReportService } from '../../core/services/report.service';
import { EmployeeService } from '../../core/services/employee.service';
import { Employee } from '../../core/models/employee.model';

@Component({
  selector: 'wfm-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './report.component.html',
})
export class ReportComponent implements OnDestroy {
  private reportService = inject(ReportService);
  private employeeService = inject(EmployeeService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly from = signal(this.getStartOfMonth());
  readonly to = signal(this.getToday());
  readonly selectedEmployeeId = signal<string>('');
  readonly employees = signal<Employee[]>([]);
  readonly reportData = signal<any | null>(null);

  readonly loading = signal(false);
  readonly exporting = signal(false);

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

  search() {
    const empId = this.selectedEmployeeId();
    if (!empId) {
      this.toastr.warning('Please select an employee first', 'Warning');
      return;
    }
    this.loading.set(true);
    this.reportService
      .employeeWise({
        employeeId: empId,
        from: this.from(),
        to: this.to(),
      })
      .pipe(
        tap((data) => {
          this.reportData.set(data);
        }),
        catchError((err) => {
          console.error(err);
          this.toastr.error('Failed to generate report', 'Error');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  reset() {
    this.selectedEmployeeId.set('');
    this.from.set(this.getStartOfMonth());
    this.to.set(this.getToday());
    this.reportData.set(null);
  }

  exportReport(format: 'excel' | 'csv' | 'pdf') {
    const empId = this.selectedEmployeeId();
    if (!empId) {
      this.toastr.warning('Please select an employee first', 'Warning');
      return;
    }
    this.exporting.set(true);
    this.reportService
      .exportEmployeeWise({
        format,
        employeeId: empId,
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
          a.download = `employee-attendance-report-${this.from()}-${this.to()}.${extension}`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success('Report exported successfully', 'Success');
        }
      });
  }
}
