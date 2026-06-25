import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { CommonModule, CurrencyPipe, DatePipe, NgClass } from '@angular/common';

import { FinancialService, FinancialRecord } from '../../core/services/financial.service';

@Component({
  selector: 'wfm-financial-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, NgClass, CurrencyPipe, DatePipe],
  templateUrl: './financial.component.html',
})
export class FinancialComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private financialService = inject(FinancialService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  // Form & UI States
  readonly form = this.fb.nonNullable.group({
    period: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
    monthlySales: [0, [Validators.required, Validators.min(0)]],
    monthlyProfit: [0, [Validators.required]],
    outstandingDue: [0, [Validators.required, Validators.min(0)]],
    billsPendingCollection: [0, [Validators.required, Validators.min(0)]],
    prevProfitShareBalance: [0, [Validators.required]],
    recentProfit: [0, [Validators.required]],
    currentTotalBalance: [0, [Validators.required]],
    monthlySubsidy: [0, [Validators.required, Validators.min(0)]],
  });

  readonly saving = signal(false);
  readonly latestLoading = signal(false);
  readonly recordsLoading = signal(false);
  readonly isEdit = signal(false);
  readonly selectedRecordId = signal<string | null>(null);

  // List & Pagination States
  readonly records = signal<FinancialRecord[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()) || 1);

  // Filter & Sort States
  readonly search = signal('');
  readonly filterYear = signal('');
  readonly filterMonth = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly sortBy = signal('period');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  // helper arrays for filters
  readonly years = Array.from({ length: 7 }, (_, i) => String(new Date().getFullYear() - 3 + i));
  readonly months = [
    { value: '01', name: 'January' },
    { value: '02', name: 'February' },
    { value: '03', name: 'March' },
    { value: '04', name: 'April' },
    { value: '05', name: 'May' },
    { value: '06', name: 'June' },
    { value: '07', name: 'July' },
    { value: '08', name: 'August' },
    { value: '09', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' },
  ];

  constructor() {
    this.initFormAndLoad();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentPeriodString(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }

  initFormAndLoad() {
    this.form.patchValue({ period: this.getCurrentPeriodString() });
    this.loadLatest();
    this.loadRecords();
  }

  loadLatest() {
    this.latestLoading.set(true);
    this.financialService
      .getLatest()
      .pipe(
        tap((res) => {
          const latest = res.data;
          if (latest) {
            // Populate form with latest values
            this.form.patchValue({
              period: latest.period,
              monthlySales: latest.monthlySales,
              monthlyProfit: latest.monthlyProfit,
              outstandingDue: latest.outstandingDue,
              billsPendingCollection: latest.billsPendingCollection,
              prevProfitShareBalance: latest.prevProfitShareBalance,
              recentProfit: latest.recentProfit,
              currentTotalBalance: latest.currentTotalBalance,
              monthlySubsidy: latest.monthlySubsidy,
            });
            this.toastr.info('Prefilled form with the latest saved record.', 'Information');
          }
        }),
        catchError((err) => {
          console.error('Failed to load latest record', err);
          return of(null);
        }),
        finalize(() => this.latestLoading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  loadRecords() {
    this.recordsLoading.set(true);
    this.financialService
      .list({
        page: this.page(),
        limit: this.limit(),
        search: this.search(),
        year: this.filterYear(),
        month: this.filterMonth(),
        startDate: this.startDate(),
        endDate: this.endDate(),
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
      })
      .pipe(
        tap((res) => {
          this.records.set(res.data);
          this.total.set(res.pagination.total);
        }),
        catchError((err) => {
          console.error('Failed to load records', err);
          this.toastr.error('Failed to load historical records', 'Error');
          return of(null);
        }),
        finalize(() => this.recordsLoading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Please correct all validation errors.', 'Warning');
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      period: raw.period,
      monthlySales: Number(raw.monthlySales),
      monthlyProfit: Number(raw.monthlyProfit),
      outstandingDue: Number(raw.outstandingDue),
      billsPendingCollection: Number(raw.billsPendingCollection),
      prevProfitShareBalance: Number(raw.prevProfitShareBalance),
      recentProfit: Number(raw.recentProfit),
      currentTotalBalance: Number(raw.currentTotalBalance),
      monthlySubsidy: Number(raw.monthlySubsidy),
    };

    const request$ = this.isEdit() && this.selectedRecordId()
      ? this.financialService.update(this.selectedRecordId()!, payload)
      : this.financialService.create(payload);

    request$
      .pipe(
        tap((res) => {
          if (this.isEdit()) {
            this.toastr.success('Financial record updated successfully', 'Success');
            this.cancelEdit();
          } else {
            this.toastr.success('Financial record saved successfully', 'Success');
            // reset form to default
            this.form.patchValue({ period: this.getCurrentPeriodString() });
            this.loadLatest();
          }
          this.page.set(1);
          this.loadRecords();
        }),
        catchError((err) => {
          console.error('Save failed', err);
          const errorMsg = err.error?.message || 'Failed to save financial record';
          this.toastr.error(errorMsg, 'Error');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  editRecord(record: FinancialRecord) {
    this.isEdit.set(true);
    this.selectedRecordId.set(record._id || null);
    this.form.patchValue({
      period: record.period,
      monthlySales: record.monthlySales,
      monthlyProfit: record.monthlyProfit,
      outstandingDue: record.outstandingDue,
      billsPendingCollection: record.billsPendingCollection,
      prevProfitShareBalance: record.prevProfitShareBalance,
      recentProfit: record.recentProfit,
      currentTotalBalance: record.currentTotalBalance,
      monthlySubsidy: record.monthlySubsidy,
    });
    this.toastr.success(`Editing record for ${this.formatPeriod(record.period)}`, 'Edit Mode');
    // Scroll to form smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.isEdit.set(false);
    this.selectedRecordId.set(null);
    this.form.reset({
      period: this.getCurrentPeriodString(),
      monthlySales: 0,
      monthlyProfit: 0,
      outstandingDue: 0,
      billsPendingCollection: 0,
      prevProfitShareBalance: 0,
      recentProfit: 0,
      currentTotalBalance: 0,
      monthlySubsidy: 0,
    });
    this.loadLatest();
  }

  deleteRecord(id: string) {
    if (confirm('Are you sure you want to delete this financial record? This cannot be undone.')) {
      this.financialService
        .remove(id)
        .pipe(
          tap(() => {
            this.toastr.success('Record deleted successfully', 'Success');
            this.loadRecords();
          }),
          catchError((err) => {
            console.error('Delete failed', err);
            this.toastr.error('Failed to delete record', 'Error');
            return of(null);
          }),
          takeUntil(this.destroy$),
        )
        .subscribe();
    }
  }

  // Filters & Sorting Handlers
  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.page.set(1);
    this.loadRecords();
  }

  onYearChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.filterYear.set(value);
    this.page.set(1);
    this.loadRecords();
  }

  onMonthChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.filterMonth.set(value);
    this.page.set(1);
    this.loadRecords();
  }

  onStartDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.startDate.set(value);
    this.page.set(1);
    this.loadRecords();
  }

  onEndDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.endDate.set(value);
    this.page.set(1);
    this.loadRecords();
  }

  toggleSort(field: string) {
    if (this.sortBy() === field) {
      this.sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('desc');
    }
    this.loadRecords();
  }

  resetFilters() {
    this.search.set('');
    this.filterYear.set('');
    this.filterMonth.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.sortBy.set('period');
    this.sortOrder.set('desc');
    this.page.set(1);
    this.loadRecords();
  }

  // Pagination Handlers
  prevPage() {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadRecords();
    }
  }

  nextPage() {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.loadRecords();
    }
  }

  // Helper formatting methods
  formatPeriod(periodStr: string): string {
    if (!periodStr) return '';
    const [year, month] = periodStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}
