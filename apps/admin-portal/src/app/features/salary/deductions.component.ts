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
import { SalaryService, DeductionLogRecord } from '../../core/services/salary.service';

@Component({
  selector: 'wfm-deductions-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './deductions.component.html',
})
export class DeductionHistoryComponent implements OnDestroy {
  private salaryService = inject(SalaryService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly selectedMonth = signal<string>(this.getCurrentMonthStr());
  readonly loading = signal(true);
  readonly deductions = signal<DeductionLogRecord[]>([]);
  readonly selectedDeduction = signal<DeductionLogRecord | null>(null);

  constructor() {
    this.loadDeductions();
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
      this.loadDeductions();
    }
  }

  loadDeductions() {
    this.loading.set(true);
    this.salaryService
      .getDeductions(this.selectedMonth())
      .pipe(
        tap((data) => this.deductions.set(data)),
        catchError((err) => {
          console.error('Failed to load deductions list', err);
          this.toastr.error('Failed to load deduction logs', 'Error');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  formatTimestamp(timestampStr: string): string {
    if (!timestampStr) return '';
    const date = new Date(timestampStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatAttendanceDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  formatTime(timeStr?: string): string {
    if (!timeStr) return '—';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  viewEvidence(log: DeductionLogRecord) {
    this.selectedDeduction.set(log);
  }

  closeEvidenceModal() {
    this.selectedDeduction.set(null);
  }
}
