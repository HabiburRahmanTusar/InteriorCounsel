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
import { LeaveService, LeaveRequest } from '../../core/services/leave.service';
import { EmployeeService } from '../../core/services/employee.service';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'wfm-leave-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './requests.component.html',
})
export class LeaveRequestsComponent implements OnInit, OnDestroy {
  private leaveService = inject(LeaveService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private exportService = inject(ExportService);
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
    reason: '',
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
    this.leaveService
      .getRequests()
      .pipe(
        tap((data) => this.requests.set(data)),
        catchError((err) => {
          this.toastr.error('Failed to load leave requests');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  loadEmployees() {
    this.employeeService
      .list({ limit: 1000 })
      .pipe(
        tap((result) => this.employees.set(result.data)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  updateStatus(req: LeaveRequest, status: string) {
    if (!req._id) return;
    
    let remarks = '';
    if (status === 'Rejected') {
      const input = prompt('Please enter a rejection reason (optional):');
      if (input === null) return; // cancelled
      remarks = input;
    } else if (status === 'Approved') {
      const input = prompt('Please enter approval remarks (optional):');
      if (input === null) return;
      remarks = input;
    }

    this.leaveService
      .updateRequestStatus(req._id, status, remarks)
      .pipe(
        tap(() => {
          this.toastr.success(`Leave request ${status.toLowerCase()}`);
          this.loadData();
        }),
        catchError((err) => {
          this.toastr.error('Failed to update status');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  openCreateModal() {
    this.newRequest = {
      employeeId: '',
      startDate: '',
      endDate: '',
      leaveType: 'Annual',
      requestedDays: 1,
      reason: '',
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
    this.leaveService
      .createRequest(this.newRequest)
      .pipe(
        tap(() => {
          this.toastr.success('Leave record created');
          this.closeCreateModal();
          this.loadData();
        }),
        catchError((err) => {
          this.toastr.error('Failed to create leave record');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  isApprover(req: LeaveRequest): boolean {
    if (req.status !== 'Pending') return false;
    
    const user = this.authService.currentUser();
    if (!user) return false;
    
    const role = user.role?.toLowerCase();
    if (role === 'admin') return true;

    // Active stage
    const activeStage = req.approvalStages && req.approvalStages.length > 0
      ? req.approvalStages.find(s => s.status === 'Pending')
      : null;

    if (!activeStage) {
      // Legacy request, default is HR approval
      return role === 'hr';
    }

    if (activeStage.role === 'manager') {
      const reportsToId = req.employeeId && ((req.employeeId.reportsTo as any)?._id || (req.employeeId as any)?.reportsTo);
      return !!(reportsToId && reportsToId.toString() === user.id.toString());
    }

    return role === activeStage.role?.toLowerCase();
  }

  exportExcel() {
    const list = this.requests();
    if (!list || list.length === 0) {
      this.toastr.warning('No leave requests to export', 'Export Warning');
      return;
    }
    const rows = list.map((r: any) => [
      r.employeeId?.employeeId || '—',
      r.employeeId?.name || 'Employee',
      r.leaveType || 'Annual',
      r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : '—',
      r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : '—',
      r.requestedDays || 1,
      r.status || 'Pending',
      r.reason || '—',
    ]);
    this.exportService.exportToExcel({
      filename: 'InteriorCounsel_Leave_Requests',
      title: 'Employee Leave Applications & Requests',
      subtitle: 'Total Requests: ' + rows.length,
      headers: ['Emp ID', 'Staff Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'],
      rows,
    });
    this.toastr.success('Leave requests exported to Excel', 'Export Complete');
  }

  exportPdf() {
    const list = this.requests();
    if (!list || list.length === 0) {
      this.toastr.warning('No leave requests to export', 'Export Warning');
      return;
    }
    const rows = list.map((r: any) => [
      r.employeeId?.employeeId || '—',
      r.employeeId?.name || 'Employee',
      r.leaveType || 'Annual',
      r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : '—',
      r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : '—',
      (r.requestedDays || 1) + 'd',
      r.status || 'Pending',
    ]);
    this.exportService.exportToPdf({
      filename: 'InteriorCounsel_Leave_Requests',
      title: 'Employee Leave Requests Register',
      subtitle: 'Total Applications: ' + rows.length,
      headers: ['Emp ID', 'Name', 'Type', 'Start', 'End', 'Days', 'Status'],
      rows,
      orientation: 'landscape',
    });
    this.toastr.success('Leave requests exported to PDF', 'Export Complete');
  }

}
