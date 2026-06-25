import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { LeaveService, LeaveBalance } from '../../core/services/leave.service';

@Component({
  selector: 'wfm-leave-balances',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './balances.component.html',
})
export class LeaveBalancesComponent implements OnInit, OnDestroy {
  private leaveService = inject(LeaveService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  loading = signal(true);
  saving = signal(false);
  balances = signal<LeaveBalance[]>([]);

  currentYear = new Date().getFullYear();
  selectedYear = this.currentYear;
  bulkAllocated = 20;

  showEditModal = signal(false);
  editingBalance: LeaveBalance | null = null;
  editingAllocated = 20;

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading.set(true);
    this.leaveService
      .getBalances(this.selectedYear)
      .pipe(
        tap((data) => this.balances.set(data)),
        catchError((err) => {
          this.toastr.error('Failed to load leave balances');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  openEditModal(balance: LeaveBalance) {
    this.editingBalance = balance;
    this.editingAllocated = balance.allocated;
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingBalance = null;
  }

  saveAllocation() {
    if (!this.editingBalance) return;
    this.saving.set(true);

    this.leaveService
      .updateAllocation(
        this.editingBalance.employeeId._id,
        this.selectedYear,
        this.editingAllocated,
      )
      .pipe(
        tap(() => {
          this.toastr.success('Allocation updated successfully');
          this.closeEditModal();
          this.loadData();
        }),
        catchError((err) => {
          this.toastr.error('Failed to update allocation');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  bulkSaveAllocation() {
    if (!this.bulkAllocated || this.bulkAllocated < 0) {
      this.toastr.warning('Please enter a valid number of days');
      return;
    }

    if (
      confirm(
        `Are you sure you want to assign ${this.bulkAllocated} leave days to ALL employees for ${this.selectedYear}?`,
      )
    ) {
      this.saving.set(true);
      this.leaveService
        .bulkUpdateAllocation(this.selectedYear, this.bulkAllocated)
        .pipe(
          tap((res) => {
            this.toastr.success(
              `Successfully assigned ${this.bulkAllocated} days to ${res.count} employees`,
            );
            this.loadData();
          }),
          catchError((err) => {
            this.toastr.error('Failed to bulk assign leave days');
            return of(null);
          }),
          finalize(() => this.saving.set(false)),
          takeUntil(this.destroy$),
        )
        .subscribe();
    }
  }
}
