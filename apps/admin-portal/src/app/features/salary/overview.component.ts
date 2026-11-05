import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnDestroy,
} from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SalaryService, SalaryOverviewRecord } from '../../core/services/salary.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'wfm-salary-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './overview.component.html',
})
export class SalaryOverviewComponent implements OnDestroy {
  private salaryService = inject(SalaryService);
  private toastr = inject(ToastrService);
  private exportService = inject(ExportService);
  private destroy$ = new Subject<void>();

  readonly selectedMonth = signal<string>(this.getCurrentMonthStr());
  readonly loading = signal(true);
  readonly recalculating = signal(false);
  readonly payingId = signal<string | null>(null);
  readonly salaryRecords = signal<SalaryOverviewRecord[]>([]);

  readonly totalPayout = computed(() => {
    return this.salaryRecords().reduce((sum, r) => sum + r.finalPayableSalary, 0);
  });

  readonly totalDeductions = computed(() => {
    return this.salaryRecords().reduce((sum, r) => sum + r.deductionAmount, 0);
  });

  readonly paidCount = computed(() => {
    return this.salaryRecords().filter((r) => r.status === 'Paid').length;
  });

  constructor() {
    this.loadOverview();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentMonthStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  onMonthChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.selectedMonth.set(value);
      this.loadOverview();
    }
  }

  loadOverview() {
    this.loading.set(true);
    this.salaryService
      .getOverview(this.selectedMonth())
      .pipe(
        tap((data) => this.salaryRecords.set(data)),
        catchError((err) => {
          console.error('Failed to load salary overview', err);
          this.toastr.error('Failed to load salary overview', 'Error');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  recalculate() {
    this.recalculating.set(true);
    this.salaryService
      .recalculate(this.selectedMonth())
      .pipe(
        tap((data) => {
          this.salaryRecords.set(data);
          this.toastr.success('Payroll recalculated successfully', 'Success');
        }),
        catchError((err) => {
          console.error('Recalculation failed', err);
          this.toastr.error('Failed to recalculate payroll', 'Error');
          return of(null);
        }),
        finalize(() => this.recalculating.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  markPaid(record: SalaryOverviewRecord) {
    if (
      confirm(
        `Are you sure you want to mark ${record.employeeId?.name}'s salary as Paid? This will lock the record against future modifications.`,
      )
    ) {
      this.payingId.set(record._id);
      this.salaryService
        .pay(record._id)
        .pipe(
          tap((updatedRecord) => {
            this.salaryRecords.update((records) =>
              records.map((r) => (r._id === updatedRecord._id ? updatedRecord : r)),
            );
            this.toastr.success('Salary marked as Paid successfully', 'Success');
          }),
          catchError((err) => {
            console.error('Payment confirmation failed', err);
            this.toastr.error('Failed to process payment', 'Error');
            return of(null);
          }),
          finalize(() => this.payingId.set(null)),
          takeUntil(this.destroy$),
        )
        .subscribe();
    }
  }

  exportExcel() {
    const list = this.salaryRecords();
    if (!list || list.length === 0) {
      this.toastr.warning('No salary records to export', 'Export Warning');
      return;
    }
    const rows = list.map((r) => [
      r.employeeId?.employeeId || '—',
      r.employeeId?.name || '—',
      r.employeeId?.salary || 0,
      r.deductionAmount || 0,
      r.finalPayableSalary || 0,
      r.status || 'Pending',
    ]);
    this.exportService.exportToExcel({
      filename: 'InteriorCounsel_Payroll_' + this.selectedMonth(),
      title: 'Staff Salary Disbursement Sheet — ' + this.selectedMonth(),
      subtitle: 'Total Payout: Tk ' + this.totalPayout().toLocaleString() + ' | Disbursed: ' + this.paidCount() + '/' + list.length,
      headers: ['Emp ID', 'Employee Name', 'Base Salary (BDT)', 'Deductions (BDT)', 'Net Payable (BDT)', 'Payment Status'],
      rows,
    });
    this.toastr.success('Salary sheet exported to Excel', 'Export Complete');
  }

  exportPdf() {
    const list = this.salaryRecords();
    if (!list || list.length === 0) {
      this.toastr.warning('No salary records to export', 'Export Warning');
      return;
    }
    const rows = list.map((r) => [
      r.employeeId?.employeeId || '—',
      r.employeeId?.name || '—',
      (r.employeeId?.salary || 0).toLocaleString(),
      (r.deductionAmount || 0).toLocaleString(),
      (r.finalPayableSalary || 0).toLocaleString(),
      r.status || 'Pending',
    ]);
    this.exportService.exportToPdf({
      filename: 'InteriorCounsel_Payroll_' + this.selectedMonth(),
      title: 'Workforce Payroll Register — ' + this.selectedMonth(),
      subtitle: 'Total Payroll: Tk ' + this.totalPayout().toLocaleString() + ' | Interior Counsel HR & Finance',
      headers: ['Emp ID', 'Staff Name', 'Base (Tk)', 'Deductions (Tk)', 'Net Payable (Tk)', 'Status'],
      rows,
      orientation: 'landscape',
    });
    this.toastr.success('Salary sheet exported to PDF', 'Export Complete');
  }

}
