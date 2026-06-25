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

@Component({
  selector: 'wfm-salary-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './reports.component.html',
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
        (r.employeeId?.designation && r.employeeId.designation.toLowerCase().includes(query)),
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
        takeUntil(this.destroy$),
      )
      .subscribe();
  }
}
