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
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Employees</h1>
          <p class="text-sm text-slate-500">Manage workforce directory and shift schedules</p>
        </div>
        <button routerLink="/employees/new" class="btn btn-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Add employee</span>
        </button>
      </div>

      <!-- Filters -->
      <div
        class="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row gap-4"
      >
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >Search directory</label
          >
          <input
            type="text"
            [value]="search()"
            (input)="onSearch($event)"
            placeholder="Search by name, email or employee ID"
            class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
          />
        </div>
        <div class="w-full sm:w-48">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >Status</label
          >
          <div class="relative">
            <select
              [value]="status()"
              (change)="onStatusChange($event)"
              class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer pr-10"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Employee ID
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Name
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Email
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Designation
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Role
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Status
                </th>
                <th
                  class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 text-right"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                    <span class="text-sm font-medium">Loading employees...</span>
                  </td>
                </tr>
              } @else if (employees().length === 0) {
                <tr>
                  <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                    <div class="flex flex-col items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-8 w-8 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span class="text-sm font-medium">No employees found</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (employee of employees(); track employee.id) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 text-sm font-medium text-slate-900">
                      {{ employee.employeeId }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ employee.name }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ employee.email }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">
                      {{ employee.designation || '—' }}
                    </td>
                    <td class="px-6 py-4 text-sm">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                        [class]="
                          employee.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : employee.role === 'hr'
                              ? 'bg-purple-50 text-purple-700 border border-purple-100'
                              : employee.role === 'manager'
                                ? 'bg-sky-50 text-sky-700 border border-sky-100'
                                : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                        "
                      >
                        {{ employee.role }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class]="
                          employee.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        "
                      >
                        {{ employee.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right text-sm space-x-3">
                      <button
                        (click)="viewEmployee(employee)"
                        class="btn-link-outline btn-link-outline-indigo"
                      >
                        View
                      </button>
                      @if (isAdminOrHr()) {
                        <a
                          [routerLink]="['/employees', employee.id]"
                          class="btn-link-outline btn-link-outline-indigo"
                          >Edit</a
                        >
                        <button
                          (click)="toggleStatus(employee)"
                          class="btn-link-outline"
                          [class.btn-link-outline-amber]="employee.status === 'active'"
                          [class.btn-link-outline-emerald]="employee.status !== 'active'"
                        >
                          {{ employee.status === 'active' ? 'Deactivate' : 'Activate' }}
                        </button>
                      }
                      @if (isAdmin()) {
                        <button
                          (click)="deleteEmployee(employee)"
                          class="btn-link-outline btn-link-outline-rose"
                        >
                          Delete
                        </button>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Paginator -->
        <div
          class="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50"
        >
          <span class="text-xs text-slate-500"
            >Showing {{ pagination().data.length }} of
            {{ pagination().pagination.total }} employees</span
          >
          <div class="flex gap-2">
            <button
              (click)="prevPage()"
              [disabled]="pagination().pagination.page <= 1"
              class="border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              Previous
            </button>
            <button
              (click)="nextPage()"
              [disabled]="pagination().pagination.page >= pagination().pagination.totalPages"
              class="border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    @if (selectedEmployee()) {
      <div
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        (click)="closeModal()"
      >
        <!-- Modal Card -->
        <div
          class="bg-white border border-slate-200/80 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
          (click)="$event.stopPropagation()"
        >
          <!-- Modal Header -->
          <div
            class="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between"
          >
            <h2 class="text-base font-bold text-slate-900">Employee Details</h2>
            <button
              (click)="closeModal()"
              class="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="p-6 space-y-6">
            <!-- Identity block -->
            <div class="flex items-center gap-4 pb-5 border-b border-slate-100">
              <div
                class="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl"
              >
                {{ getInitials(selectedEmployee()?.name) }}
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900">{{ selectedEmployee()?.name }}</h3>
                <p class="text-xs text-slate-500">
                  {{ selectedEmployee()?.designation || 'Staff Member' }}
                </p>
              </div>
            </div>

            <!-- Metadata Grid -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
              <div class="space-y-1">
                <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >Employee ID</span
                >
                <span class="font-semibold text-slate-800">{{
                  selectedEmployee()?.employeeId
                }}</span>
              </div>

              <div class="space-y-1">
                <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >Role</span
                >
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {{ selectedEmployee()?.role }}
                </span>
              </div>

              <div class="space-y-1 col-span-2">
                <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >Email Address</span
                >
                <span class="font-medium text-slate-800">{{ selectedEmployee()?.email }}</span>
              </div>

              <div class="space-y-1">
                <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >Phone</span
                >
                <span class="font-medium text-slate-800">{{
                  selectedEmployee()?.phone || '—'
                }}</span>
              </div>

              <div class="space-y-1">
                <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >Salary</span
                >
                <p class="font-medium text-slate-900 mt-0.5">
                  {{
                  selectedEmployee()?.salary ? '৳' + selectedEmployee()?.salary?.toLocaleString('en-US') : '—'
                  }}
                </p>
              </div>

              <div class="space-y-1">
                <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >Status</span
                >
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  [class]="
                    selectedEmployee()?.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  "
                >
                  {{ selectedEmployee()?.status }}
                </span>
              </div>
            </div>

            <!-- Shift Block -->
            <div class="border-t border-slate-100 pt-5 space-y-3">
              <span class="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
                >Shift Assignment</span
              >
              @if (selectedEmployee()?.shiftId) {
                <div
                  class="bg-slate-50 border border-slate-100/80 rounded-xl p-3 flex justify-between items-center text-xs"
                >
                  <div>
                    <span class="font-bold text-slate-800 block">{{
                      getShift(selectedEmployee())?.name
                    }}</span>
                    <span class="text-slate-500"
                      >Grace period: {{ getShift(selectedEmployee())?.gracePeriod }} mins</span
                    >
                  </div>
                  <span
                    class="font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-lg px-2 py-1"
                  >
                    {{ formatTime(getShift(selectedEmployee())?.startTime) }} -
                    {{ formatTime(getShift(selectedEmployee())?.endTime) }}
                  </span>
                </div>
              } @else {
                <span class="text-xs text-slate-500">No shift assigned</span>
              }
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              (click)="closeModal()"
              class="border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
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
    if (confirm(`Are you sure you want to delete ${employee.name}?`)) {
      this.employeeService
        .remove(employee.id)
        .pipe(
          tap(() => this.loadEmployees()),
          catchError((err) => {
            console.error('Failed to delete employee', err);
            alert('Failed to delete employee. Please try again.');
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
        tap(() => this.loadEmployees()),
        catchError((err) => {
          console.error('Failed to toggle employee status', err);
          alert('Failed to toggle status. Please try again.');
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
