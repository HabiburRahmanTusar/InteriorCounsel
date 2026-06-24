import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy } from '@angular/core';
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
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Leave Balances</h1>
          <p class="text-sm text-slate-500">View and adjust annual leave quotas for employees.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-600 font-medium">Year:</span>
          <select [(ngModel)]="selectedYear" (change)="loadData()" class="block rounded-lg border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm">
            <option [value]="currentYear - 1">{{ currentYear - 1 }}</option>
            <option [value]="currentYear">{{ currentYear }}</option>
            <option [value]="currentYear + 1">{{ currentYear + 1 }}</option>
          </select>
        </div>
      </div>

      <!-- Balances Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-200">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Employee</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Allocated Days</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Used Days</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Remaining</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (loading()) {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-slate-400">Loading balances...</td>
                </tr>
              } @else if (balances().length === 0) {
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                    <p class="text-sm">No balances found</p>
                  </td>
                </tr>
              } @else {
                @for (b of balances(); track b.employeeId?._id) {
                  <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="text-sm font-medium text-slate-900">{{ b.employeeId?.name }}</div>
                      <div class="text-xs text-slate-500">{{ b.employeeId?.employeeId }}</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700 font-medium">
                      {{ b.allocated }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">
                      {{ b.used }}
                    </td>
                    <td class="px-6 py-4 text-sm font-medium">
                      <span [ngClass]="b.remaining < 5 ? 'text-amber-600' : 'text-emerald-600'">
                        {{ b.remaining }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <button (click)="openEditModal(b)" class="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">Adjust Quota</button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    @if (showEditModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-slate-100">
            <h2 class="text-lg font-semibold text-slate-900">Adjust Annual Quota</h2>
            <p class="text-xs text-slate-500 mt-1">{{ editingBalance?.employeeId?.name }} ({{ selectedYear }})</p>
          </div>
          
          <div class="p-6 space-y-4">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-slate-700">Allocated Days</label>
              <input type="number" [(ngModel)]="editingAllocated" class="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm" />
            </div>
            <p class="text-xs text-slate-500">Currently used: {{ editingBalance?.used }} days. Changes will apply immediately.</p>
          </div>
          
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button (click)="closeEditModal()" class="btn btn-secondary bg-white">Cancel</button>
            <button (click)="saveAllocation()" [disabled]="saving()" class="btn btn-primary">{{ saving() ? 'Saving...' : 'Save Changes' }}</button>
          </div>
        </div>
      </div>
    }
  `
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
    this.leaveService.getBalances(this.selectedYear)
      .pipe(
        tap(data => this.balances.set(data)),
        catchError(err => {
          this.toastr.error('Failed to load leave balances');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      ).subscribe();
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
    
    this.leaveService.updateAllocation(this.editingBalance.employeeId._id, this.selectedYear, this.editingAllocated)
      .pipe(
        tap(() => {
          this.toastr.success('Allocation updated successfully');
          this.closeEditModal();
          this.loadData();
        }),
        catchError(err => {
          this.toastr.error('Failed to update allocation');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$)
      ).subscribe();
  }
}
