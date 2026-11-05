import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnDestroy,
} from '@angular/core';
import { DatePipe, TitleCasePipe, UpperCasePipe, CommonModule } from '@angular/common';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ReportService } from '../../core/services/report.service';
import { EmployeeService } from '../../core/services/employee.service';
import { ExportService } from '../../core/services/export.service';
import { Employee } from '../../core/models/employee.model';

@Component({
  selector: 'wfm-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, TitleCasePipe, UpperCasePipe],
  templateUrl: './report.component.html',
})
export class ReportComponent implements OnDestroy {
  private reportService = inject(ReportService);
  private employeeService = inject(EmployeeService);
  private exportService = inject(ExportService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  // Report Mode: 'employee' (individual detailed) or 'company' (master summary of all employees)
  readonly reportMode = signal<'employee' | 'company'>('employee');

  readonly from = signal(this.getStartOfMonth());
  readonly to = signal(this.getToday());
  readonly selectedEmployeeId = signal<string>('');
  readonly employees = signal<Employee[]>([]);
  readonly reportData = signal<any | null>(null);
  readonly companySummary = signal<any[]>([]);

  readonly selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    return this.employees().find((e) => e.id === id) || null;
  });

  readonly selectedEmployeeShift = computed(() => {
    const emp = this.selectedEmployee();
    if (!emp) return null;
    return (emp.shiftId as any) || null;
  });

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

  setMode(mode: 'employee' | 'company') {
    this.reportMode.set(mode);
    if (mode === 'company' && this.companySummary().length === 0) {
      this.generateCompanyReport();
    }
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
    if (this.reportMode() === 'company') {
      this.generateCompanyReport();
      return;
    }

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

  generateCompanyReport() {
    this.loading.set(true);
    const month = this.from().slice(0, 7);
    this.reportService
      .monthly({ month })
      .pipe(
        tap((data: any) => {
          if (Array.isArray(data)) {
            this.companySummary.set(data);
          } else if (data && data.data && Array.isArray(data.data)) {
            this.companySummary.set(data.data);
          } else {
            this.companySummary.set([]);
          }
        }),
        catchError((err) => {
          console.error(err);
          this.toastr.error('Failed to generate company attendance summary', 'Error');
          return of([]);
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
    this.companySummary.set([]);
  }

  exportExcel() {
    if (this.reportMode() === 'company') {
      const rows = this.companySummary().map((item) => {
        const total = (item.present || 0) + (item.absent || 0);
        const rate = total > 0 ? Math.round(((item.present || 0) / total) * 100) : 0;
        return [
          item.employeeCode || item.employeeId || '—',
          item.employeeName || '—',
          item.present || 0,
          item.late || 0,
          item.earlyLeave || 0,
          item.absent || 0,
          `${rate}%`,
        ];
      });

      this.exportService.exportToExcel({
        filename: `InteriorCounsel_Company_Attendance_${this.from().slice(0, 7)}`,
        title: 'Master Company Attendance Summary',
        subtitle: `Month: ${this.from().slice(0, 7)} | Total Staff: ${rows.length}`,
        headers: ['Emp ID', 'Employee Name', 'Present Days', 'Late Count', 'Early Leave', 'Absent Days', 'Attendance Rate'],
        rows,
      });
      this.toastr.success('Company attendance summary exported to Excel', 'Export Complete');
    } else {
      const data = this.reportData();
      if (!data || !data.logs || data.logs.length === 0) {
        this.toastr.warning('No attendance records to export', 'Export Warning');
        return;
      }
      const emp = this.selectedEmployee();
      const rows = data.logs.map((log: any) => [
        log.date ? new Date(log.date).toISOString().slice(0, 10) : '—',
        log.shiftIn || '—',
        log.shiftOut || '—',
        log.checkIn ? this.formatTime(log.checkIn.time) : '—',
        log.checkIn?.status || 'Absent',
        log.checkOut ? this.formatTime(log.checkOut.time) : '—',
        log.checkOut?.status || '—',
        log.workingMinutes ? (log.workingMinutes / 60).toFixed(1) + ' hrs' : '0 hrs',
        log.status || (log.checkIn ? 'Present' : 'Absent'),
      ]);

      this.exportService.exportToExcel({
        filename: `InteriorCounsel_Attendance_${emp?.employeeId || 'Emp'}_${this.from()}_${this.to()}`,
        title: `Attendance Audit Log — ${emp?.name || 'Employee'} (${emp?.employeeId || ''})`,
        subtitle: `Period: ${this.from()} to ${this.to()} | Designation: ${emp?.designation || 'Staff'}`,
        headers: ['Date', 'Shift Start', 'Shift End', 'Check-In', 'Check-In Status', 'Check-Out', 'Check-Out Status', 'Work Duration', 'Overall Status'],
        rows,
      });
      this.toastr.success('Employee attendance report exported to Excel', 'Export Complete');
    }
  }

  exportPdf() {
    if (this.reportMode() === 'company') {
      const rows = this.companySummary().map((item) => {
        const total = (item.present || 0) + (item.absent || 0);
        const rate = total > 0 ? Math.round(((item.present || 0) / total) * 100) : 0;
        return [
          item.employeeCode || item.employeeId || '—',
          item.employeeName || '—',
          item.present || 0,
          item.late || 0,
          item.earlyLeave || 0,
          item.absent || 0,
          `${rate}%`,
        ];
      });

      this.exportService.exportToPdf({
        filename: `InteriorCounsel_Company_Attendance_${this.from().slice(0, 7)}`,
        title: 'Master Attendance Summary Report',
        subtitle: `Period: ${this.from().slice(0, 7)} | Interior Counsel Workforce Audit`,
        headers: ['Emp ID', 'Employee Name', 'Present', 'Late', 'Early Leave', 'Absent', 'Attendance %'],
        rows,
        orientation: 'landscape',
      });
      this.toastr.success('Company attendance summary exported to PDF', 'Export Complete');
    } else {
      const data = this.reportData();
      if (!data || !data.logs || data.logs.length === 0) {
        this.toastr.warning('No attendance records to export', 'Export Warning');
        return;
      }
      const emp = this.selectedEmployee();
      const rows = data.logs.map((log: any) => [
        log.date ? new Date(log.date).toISOString().slice(0, 10) : '—',
        log.shiftIn || '—',
        log.shiftOut || '—',
        log.checkIn ? this.formatTime(log.checkIn.time) : '—',
        log.checkIn?.status || 'Absent',
        log.checkOut ? this.formatTime(log.checkOut.time) : '—',
        log.checkOut?.status || '—',
        log.workingMinutes ? (log.workingMinutes / 60).toFixed(1) + ' hrs' : '0 hrs',
        log.status || (log.checkIn ? 'Present' : 'Absent'),
      ]);

      this.exportService.exportToPdf({
        filename: `InteriorCounsel_Attendance_${emp?.employeeId || 'Emp'}_${this.from()}_${this.to()}`,
        title: `Employee Attendance Report — ${emp?.name || 'Staff'}`,
        subtitle: `Emp ID: ${emp?.employeeId || '—'} | Period: ${this.from()} to ${this.to()} | Designation: ${emp?.designation || 'Staff'}`,
        headers: ['Date', 'Shift In', 'Shift Out', 'Check-In', 'In Status', 'Check-Out', 'Out Status', 'Work Duration', 'Status'],
        rows,
        orientation: 'landscape',
      });
      this.toastr.success('Employee attendance report exported to PDF', 'Export Complete');
    }
  }

  // Legacy backend export method kept for CSV or direct stream
  exportReport(format: 'excel' | 'csv' | 'pdf') {
    if (format === 'excel') {
      this.exportExcel();
      return;
    }
    if (format === 'pdf') {
      this.exportPdf();
      return;
    }

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
          const extension = 'csv';
          a.download = `employee-attendance-report-${this.from()}-${this.to()}.${extension}`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success('Report exported successfully', 'Success');
        }
      });
  }

  formatTime(timeStr?: string): string {
    if (!timeStr) return '—';
    try {
      const parts = timeStr.split(':');
      const hour = parseInt(parts[0], 10);
      const min = parseInt(parts[1], 10);
      if (isNaN(hour) || isNaN(min)) return timeStr;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      const formattedMin = String(min).padStart(2, '0');
      return `${formattedHour}:${formattedMin} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  }
}
