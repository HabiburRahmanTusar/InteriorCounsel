import { Component, ChangeDetectionStrategy, signal, computed, inject, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SalaryService, SalaryOverviewRecord } from '../../core/services/salary.service';

@Component({
  selector: 'wfm-salary-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Salary Overview</h1>
          <p class="text-sm text-slate-500">Monitor employee payroll drafts and process payouts</p>
        </div>
        <div class="flex items-center gap-3">
          <input
            type="month"
            [value]="selectedMonth()"
            (change)="onMonthChange($event)"
            class="border border-slate-200 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2 text-sm outline-none transition-all cursor-pointer font-medium"
          />
          <button 
            (click)="recalculate()" 
            [disabled]="recalculating() || loading()"
            class="btn btn-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              [class.animate-spin]="recalculating()"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
            </svg>
            <span>{{ recalculating() ? 'Recalculating...' : 'Recalculate' }}</span>
          </button>
        </div>
      </div>

      <!-- Overview Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .8-3 1.8 0 .9 1.343 1.2 3 1.5s3 .6 3 1.5c0 .9-1.343 1.8-3 1.8m0-5.4v-1.8m0 5.4v1.8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-1">Total Payout</p>
            <span class="text-2xl font-bold text-slate-900">৳{{ totalPayout()?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</span>
          </div>
        </div>

        <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-1">Total Deductions</p>
            <span class="text-2xl font-bold text-slate-900">৳{{ totalDeductions()?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</span>
          </div>
        </div>

        <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid Slips</span>
            <span class="text-2xl font-bold text-slate-900">{{ paidCount() }} / {{ salaryRecords().length }}</span>
          </div>
        </div>
      </div>

      <!-- Salary List Table -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Employee ID</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Name</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Base Salary</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Working Days</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Deductions</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Payable Salary</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="8" class="px-6 py-12 text-center text-slate-400">
                    <span class="text-sm font-medium">Loading payroll drafts...</span>
                  </td>
                </tr>
              } @else if (salaryRecords().length === 0) {
                <tr>
                  <td colspan="8" class="px-6 py-12 text-center text-slate-400">
                    <div class="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .8-3 1.8 0 .9 1.343 1.2 3 1.5s3 .6 3 1.5c0 .9-1.343 1.8-3 1.8m0-5.4v-1.8m0 5.4v1.8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                      </svg>
                      <span class="text-sm font-medium">No salary records generated for this month</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (record of salaryRecords(); track record._id) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 text-sm font-medium text-slate-900">{{ record.employeeId?.employeeId }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700 font-semibold">{{ record.employeeId?.name }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">৳{{ record.baseSalary?.toLocaleString('en-US') }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ record.workingDays }} / {{ record.attendedDays }} / {{ record.lateDays }}</td>
                    <td class="px-6 py-4 text-sm font-medium">
                      @if (record.deductedDays > 0) {
                        <span class="text-rose-600">
                          -৳{{ record.deductionAmount?.toLocaleString('en-US') }} ({{ record.deductedDays }} days)
                        </span>
                      } @else {
                        <span class="text-slate-400">—</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-sm font-bold text-indigo-600">
                      ৳{{ record.finalPayableSalary?.toLocaleString('en-US') }}
                    </td>
                    <td class="px-6 py-4 text-sm">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        [class]="record.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'"
                      >
                        {{ record.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right text-sm">
                      @if (record.status === 'Draft') {
                        <button
                          (click)="markPaid(record)"
                          [disabled]="payingId() === record._id"
                          class="btn-link-outline btn-link-outline-emerald"
                        >
                          {{ payingId() === record._id ? 'Processing...' : 'Mark as Paid' }}
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400 font-medium">Locked</span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class SalaryOverviewComponent implements OnDestroy {
  private salaryService = inject(SalaryService);
  private toastr = inject(ToastrService);
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
        takeUntil(this.destroy$)
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
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  markPaid(record: SalaryOverviewRecord) {
    if (confirm(`Are you sure you want to mark ${record.employeeId?.name}'s salary as Paid? This will lock the record against future modifications.`)) {
      this.payingId.set(record._id);
      this.salaryService
        .pay(record._id)
        .pipe(
          tap((updatedRecord) => {
            this.salaryRecords.update((records) =>
              records.map((r) => (r._id === updatedRecord._id ? updatedRecord : r))
            );
            this.toastr.success('Salary marked as Paid successfully', 'Success');
          }),
          catchError((err) => {
            console.error('Payment confirmation failed', err);
            this.toastr.error('Failed to process payment', 'Error');
            return of(null);
          }),
          finalize(() => this.payingId.set(null)),
          takeUntil(this.destroy$)
        )
        .subscribe();
    }
  }
}
