import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnDestroy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, tap } from 'rxjs';

import { ToastrService } from 'ngx-toastr';
import { EmployeeService } from '../../core/services/employee.service';
import { AuthService } from '../../core/services/auth.service';
import { Employee, UserStatus } from '../../core/models/employee.model';

@Component({
  selector: 'wfm-employee-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './employee-list.component.html',
})
export class EmployeeListComponent implements OnDestroy {
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly search = signal('');
  readonly status = signal('');
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly selectedEmployee = signal<Employee | null>(null);

  readonly employees = signal<Employee[]>([]);
  readonly pagination = computed(() => ({
    data: this.employees(),
    pagination: {
      page: this.page(),
      limit: 10,
      total: this.employees().length,
      totalPages: Math.ceil(this.employees().length / 10) || 1,
    },
  }));

  readonly isAdmin = computed(() => this.authService.currentRole() === 'admin');
  readonly isAdminOrHr = computed(() => {
    const role = this.authService.currentRole();
    return role === 'admin' || role === 'hr';
  });

  constructor() {
    this.loadEmployees();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmployees() {
    this.loading.set(true);
    this.employeeService
      .list({
        page: this.page(),
        limit: 10,
        search: this.search() || undefined,
        status: this.status() as UserStatus | undefined,
      })
      .pipe(
        tap((result) => {
          this.employees.set(result.data);
        }),
        catchError((err) => {
          this.toastr.error('Failed to load employees', 'Error');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.page.set(1);
    this.loadEmployees();
  }

  onStatusChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.status.set(value);
    this.page.set(1);
    this.loadEmployees();
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadEmployees();
    }
  }

  nextPage() {
    if (this.page() < this.pagination().pagination.totalPages) {
      this.page.update((p) => p + 1);
      this.loadEmployees();
    }
  }

  deleteEmployee(employee: Employee) {
    if (employee.role === 'admin') {
      this.toastr.error('Admin employees cannot be deleted.', 'Error');
      return;
    }
    if (confirm(`Are you sure you want to delete ${employee.name}?`)) {
      this.employeeService
        .remove(employee.id)
        .pipe(
          tap(() => {
            this.toastr.success('Employee deleted successfully', 'Success');
            this.loadEmployees();
          }),
          catchError((err) => {
            console.error('Failed to delete employee', err);
            const msg = err.error?.message || 'Failed to delete employee. Please try again.';
            this.toastr.error(msg, 'Error');
            return of(null);
          }),
          takeUntil(this.destroy$),
        )
        .subscribe();
    }
  }

  toggleStatus(employee: Employee) {
    const nextStatus = employee.status === 'active' ? 'inactive' : 'active';
    this.employeeService
      .update(employee.id, { status: nextStatus })
      .pipe(
        tap(() => {
          this.toastr.success(`Employee status updated to ${nextStatus}`, 'Success');
          this.loadEmployees();
        }),
        catchError((err) => {
          console.error('Failed to toggle employee status', err);
          const msg = err.error?.message || 'Failed to toggle status. Please try again.';
          this.toastr.error(msg, 'Error');
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  viewEmployee(employee: Employee) {
    this.selectedEmployee.set(employee);
  }

  closeModal() {
    this.selectedEmployee.set(null);
  }

  getInitials(name?: string): string {
    return name ? name.charAt(0).toUpperCase() : 'E';
  }

  getShift(employee: any): any {
    return employee?.shiftId;
  }

  getEmployeeTypeLabel(type: any): string {
    if (!type) return '';
    return typeof type === 'object' ? type.label || '' : '';
  }

  formatTime(timeStr?: string): string {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours.toString().padStart(2, '0')}:${displayMinutes} ${ampm}`;
  }
}
