import { Component, ChangeDetectionStrategy, signal, computed, inject, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SalaryService, DeductionLogRecord } from '../../core/services/salary.service';

@Component({
  selector: 'wfm-deductions-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Deduction History</h1>
          <p class="text-sm text-slate-500">Trace immutable salary penalty audit logs and linked attendance records</p>
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

      <!-- Deduction Audit Logs Table -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Timestamp</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Employee</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Trigger Reason</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Deducted Days</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Deducted Amount</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 text-right">Evidence</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                    <span class="text-sm font-medium">Loading audit logs...</span>
                  </td>
                </tr>
              } @else if (deductions().length === 0) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                    <span class="text-sm font-medium">No deduction events logged for this month</span>
                  </td>
                </tr>
              } @else {
                @for (log of deductions(); track log._id) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 text-sm text-slate-500 font-medium">
                      {{ formatTimestamp(log.timestamp) }}
                    </td>
                    <td class="px-6 py-4 text-sm font-semibold text-slate-900">
                      <span class="block text-slate-950 font-bold">{{ log.employeeId?.name }}</span>
                      <span class="block text-xs text-slate-500 font-normal">{{ log.employeeId?.employeeId }}</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700 font-medium">
                      {{ log.triggerReason }}
                    </td>
                    <td class="px-6 py-4 text-sm text-rose-600 font-bold">
                      -{{ log.deductedDays }} day
                    </td>
                    <td class="px-6 py-4 text-sm font-medium text-rose-600">
                      -৳{{ log.deductedAmount.toLocaleString('en-US', {minimumFractionDigits: 2}) }}
                    </td>
                    <td class="px-6 py-4 text-right text-sm">
                      <button
                        (click)="viewEvidence(log)"
                        class="btn-link-outline btn-link-outline-indigo"
                      >
                        View Logs
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Evidence / Linked Attendance Modal -->
      @if (selectedDeduction()) {
        <div
          class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          (click)="closeEvidenceModal()"
        >
          <div
            class="bg-white border border-slate-200/80 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 class="text-base font-bold text-slate-900">Audit Evidence</h2>
                <p class="text-xs text-slate-400">Linked attendance logs for {{ selectedDeduction()?.employeeId?.name }}</p>
              </div>
              <button
                (click)="closeEvidenceModal()"
                class="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-6 space-y-4">
              <p class="text-xs text-slate-500 font-medium">The following 3 late check-ins triggered this salary deduction event:</p>
              
              <div class="flex flex-col gap-2">
                @for (attendance of selectedDeduction()?.linkedAttendance; track attendance._id) {
                  <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span class="block font-bold text-slate-800">{{ formatAttendanceDate(attendance.attendanceDate) }}</span>
                      <span class="block text-slate-400">Check-in at: {{ formatTime(attendance.checkIn?.time) }}</span>
                    </div>
                    <span class="bg-rose-50 text-rose-700 border border-rose-100 font-semibold rounded-lg px-2.5 py-1 uppercase tracking-wide">
                      {{ attendance.checkIn?.status }}
                    </span>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-slate-400 text-xs font-semibold">
                    No linked attendance evidence found in this log.
                  </div>
                }
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                (click)="closeEvidenceModal()"
                class="border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
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
        takeUntil(this.destroy$)
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
