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
  bulkAllocated = {
    Annual: 15,
    Sick: 10,
    Casual: 10
  };

  showEditModal = signal(false);
  editingBalance: LeaveBalance | null = null;
  editingAllocated = {
    Annual: 15,
    Sick: 10,
    Casual: 10
  };

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
    this.editingAllocated = {
      Annual: balance.allocated?.Annual || 15,
      Sick: balance.allocated?.Sick || 10,
      Casual: balance.allocated?.Casual || 10
    };
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
    if (
      this.bulkAllocated.Annual < 0 ||
      this.bulkAllocated.Sick < 0 ||
      this.bulkAllocated.Casual < 0
    ) {
      this.toastr.warning('Please enter valid non-negative numbers of days');
      return;
    }

    if (
      confirm(
        `Are you sure you want to assign these leave days to ALL employees for ${this.selectedYear}?
Annual: ${this.bulkAllocated.Annual} days
Sick: ${this.bulkAllocated.Sick} days
Casual: ${this.bulkAllocated.Casual} days`,
      )
    ) {
      this.saving.set(true);
      this.leaveService
        .bulkUpdateAllocation(this.selectedYear, this.bulkAllocated)
        .pipe(
          tap((res) => {
            this.toastr.success(
              `Successfully updated leave allocation for ${res.count} employees`,
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
