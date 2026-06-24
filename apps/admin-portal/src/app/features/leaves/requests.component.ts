import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { LeaveService, LeaveRequest } from '../../core/services/leave.service';
import { EmployeeService } from '../../core/services/employee.service';

@Component({
  selector: 'wfm-leave-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Leave Requests</h1>
          <p class="text-sm text-slate-500">Manage employee leave applications and approvals.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary">
          <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Leave Record
        </button>
      </div>

      <!-- Requests Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-200">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Employee</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Type</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Duration</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Reason</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (loading()) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-400">Loading requests...</td>
                </tr>
              } @else if (requests().length === 0) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                    <p class="text-sm">No leave requests found</p>
                  </td>
                </tr>
              } @else {
                @for (req of requests(); track req._id) {
                  <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="text-sm font-medium text-slate-900">{{ req.employeeId?.name }}</div>
                      <div class="text-xs text-slate-500">{{ req.employeeId?.employeeId }}</div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {{ req.leaveType }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">
                      <div>{{ req.startDate | date:'MMM d, y' }} - {{ req.endDate | date:'MMM d, y' }}</div>
                      <div class="text-xs text-slate-500">{{ req.requestedDays }} day(s)</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">{{ req.reason }}</td>
                    <td class="px-6 py-4">
                      <span [ngClass]="{
                        'bg-amber-50 text-amber-700 ring-amber-600/20': req.status === 'Pending',
                        'bg-emerald-50 text-emerald-700 ring-emerald-600/20': req.status === 'Approved',
                        'bg-rose-50 text-rose-700 ring-rose-600/20': req.status === 'Rejected'
                      }" class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset">
                        {{ req.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2" *ngIf="req.status === 'Pending'">
                        <button (click)="updateStatus(req, 'Approved')" class="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">Approve</button>
                        <button (click)="updateStatus(req, 'Rejected')" class="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors">Reject</button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Add Leave Record</h2>
            <button (click)="closeCreateModal()" class="text-slate-400 hover:text-slate-500">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div class="p-6 overflow-y-auto space-y-4">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-slate-700">Employee</label>
              <select [(ngModel)]="newRequest.employeeId" class="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm">
                <option value="">Select Employee</option>
                @for (emp of employees(); track emp._id) {
                  <option [value]="emp._id">{{ emp.name }} ({{ emp.employeeId }})</option>
                }
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700">Start Date</label>
                <input type="date" [(ngModel)]="newRequest.startDate" class="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm" />
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700">End Date</label>
                <input type="date" [(ngModel)]="newRequest.endDate" class="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700">Leave Type</label>
                <select [(ngModel)]="newRequest.leaveType" class="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm">
                  <option value="Annual">Annual</option>
                  <option value="Sick">Sick</option>
                  <option value="Casual">Casual</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700">Days Count</label>
                <input type="number" [(ngModel)]="newRequest.requestedDays" class="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm" />
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-sm font-medium text-slate-700">Reason</label>
              <textarea [(ngModel)]="newRequest.reason" rows="2" class="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"></textarea>
            </div>
          </div>
          
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button (click)="closeCreateModal()" class="btn btn-secondary bg-white">Cancel</button>
            <button (click)="submitRequest()" [disabled]="saving()" class="btn btn-primary">{{ saving() ? 'Saving...' : 'Save Record' }}</button>
          </div>
        </div>
      </div>
    }
  `
})
export class LeaveRequestsComponent implements OnInit, OnDestroy {
  private leaveService = inject(LeaveService);
  private employeeService = inject(EmployeeService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  loading = signal(true);
  saving = signal(false);
  requests = signal<LeaveRequest[]>([]);
  employees = signal<any[]>([]);
  
  showCreateModal = signal(false);
  newRequest: any = {
    employeeId: '',
    startDate: '',
    endDate: '',
    leaveType: 'Annual',
    requestedDays: 1,
    reason: ''
  };

  ngOnInit() {
    this.loadData();
    this.loadEmployees();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading.set(true);
    this.leaveService.getRequests()
      .pipe(
        tap(data => this.requests.set(data)),
        catchError(err => {
          this.toastr.error('Failed to load leave requests');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      ).subscribe();
  }

  loadEmployees() {
    this.employeeService.list({ limit: 1000 })
      .pipe(
        tap(result => this.employees.set(result.data)),
        takeUntil(this.destroy$)
      ).subscribe();
  }

  updateStatus(req: LeaveRequest, status: string) {
    if (!req._id) return;
    this.leaveService.updateRequestStatus(req._id, status)
      .pipe(
        tap(() => {
          this.toastr.success(`Leave request ${status.toLowerCase()}`);
          this.loadData();
        }),
        catchError(err => {
          this.toastr.error('Failed to update status');
          return of(null);
        }),
        takeUntil(this.destroy$)
      ).subscribe();
  }

  openCreateModal() {
    this.newRequest = {
      employeeId: '',
      startDate: '',
      endDate: '',
      leaveType: 'Annual',
      requestedDays: 1,
      reason: ''
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitRequest() {
    if (!this.newRequest.employeeId || !this.newRequest.startDate || !this.newRequest.endDate) {
      this.toastr.warning('Please fill in required fields');
      return;
    }
    this.saving.set(true);
    this.leaveService.createRequest(this.newRequest)
      .pipe(
        tap(() => {
          this.toastr.success('Leave record created');
          this.closeCreateModal();
          this.loadData();
        }),
        catchError(err => {
          this.toastr.error('Failed to create leave record');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$)
      ).subscribe();
  }
}
