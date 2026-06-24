import { Component, ChangeDetectionStrategy, signal, computed, inject, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SalaryService, SalaryOverviewRecord } from '../../core/services/salary.service';

@Component({
  selector: 'wfm-salary-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Salary Reports</h1>
          <p class="text-sm text-slate-500">View detailed attendance calculations and salary breakdowns</p>
        </div>
        <div class="flex items-center gap-3">
          <input
            type="month"
            [value]="selectedMonth()"
            (change)="onMonthChange($event)"
            class="border border-slate-200 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2 text-sm outline-none transition-all cursor-pointer font-medium"
          />
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 shadow-sm">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Search Directory</label>
          <input
            type="text"
            [value]="searchQuery()"
            (input)="onSearch($event)"
            placeholder="Search by employee name or code"
            class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
          />
        </div>
      </div>

      <!-- Detailed Breakdown Table -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Employee</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Base Salary</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Daily Rate</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Working Days</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Present</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Late</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Deducted Days</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Deductions</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Final Payable</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="9" class="px-6 py-12 text-center text-slate-400">
                    <span class="text-sm font-medium">Loading reports...</span>
                  </td>
                </tr>
              } @else if (filteredRecords().length === 0) {
                <tr>
                  <td colspan="9" class="px-6 py-12 text-center text-slate-400">
                    <span class="text-sm font-medium">No payroll logs matching the search criteria</span>
                  </td>
                </tr>
              } @else {
                @for (record of filteredRecords(); track record._id) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 text-sm font-medium text-slate-900">
                      <span class="block font-bold text-slate-950">{{ record.employeeId?.name }}</span>
                      <span class="block text-xs text-slate-500">{{ record.employeeId?.employeeId }} &bull; {{ record.employeeId?.designation }}</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700 font-medium">
                      ৳{{ record.baseSalary?.toLocaleString('en-US') }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">
                      ৳{{ record.dailySalary?.toLocaleString('en-US') }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">
                      {{ record.workingDays }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">
                      {{ record.attendedDays }}
                    </td>
                    <td class="px-6 py-4 text-sm text-amber-600 font-semibold">
                      {{ record.lateDays }}
                    </td>
                    <td class="px-6 py-4 text-sm text-rose-600 font-semibold">
                      {{ record.deductedDays }}
                    </td>
                    <td class="px-6 py-4 text-sm font-medium text-rose-600">
                      -৳{{ record.deductionAmount?.toLocaleString('en-US') }}
                    </td>
                    <td class="px-6 py-4 text-sm font-bold text-indigo-600">
                      ৳{{ record.finalPayableSalary?.toLocaleString('en-US') }}
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
export class SalaryReportsComponent implements OnDestroy {
  private salaryService = inject(SalaryService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly selectedMonth = signal<string>(this.getCurrentMonthStr());
  readonly searchQuery = signal('');
  readonly loading = signal(true);
  readonly salaryRecords = signal<SalaryOverviewRecord[]>([]);

  readonly filteredRecords = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.salaryRecords();

    return this.salaryRecords().filter(
      (r) =>
        r.employeeId?.name.toLowerCase().includes(query) ||
        r.employeeId?.employeeId.toLowerCase().includes(query) ||
        (r.employeeId?.designation && r.employeeId.designation.toLowerCase().includes(query))
    );
  });

  constructor() {
    this.loadReports();
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
      this.loadReports();
    }
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  loadReports() {
    this.loading.set(true);
    this.salaryService
      .getReports(this.selectedMonth())
      .pipe(
        tap((data) => this.salaryRecords.set(data)),
        catchError((err) => {
          console.error('Failed to load salary reports', err);
          this.toastr.error('Failed to load reports', 'Error');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
}
