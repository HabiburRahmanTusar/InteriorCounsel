import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';

import { EmployeeService } from '../../core/services/employee.service';
import { ShiftService } from '../../core/services/shift.service';
import { Shift } from '../../core/models/shift.model';

@Component({
  selector: 'wfm-employee-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="space-y-6 max-w-4xl">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Employee details</h1>
        <p class="text-sm text-slate-500">
          Create or modify workforce member record and system privileges
        </p>
      </div>

      <div class="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            @if (isEdit()) {
              <div>
                <label
                  class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                  >Employee ID</label
                >
                <input
                  type="text"
                  formControlName="employeeId"
                  readonly
                  class="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all cursor-not-allowed"
                />
              </div>
            }
            <div [class.col-span-2]="!isEdit()">
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >Full name *</label
              >
              <input
                type="text"
                formControlName="name"
                placeholder="John Doe"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >Email address *</label
              >
              <input
                type="email"
                formControlName="email"
                placeholder="john.doe@company.com"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >Phone number</label
              >
              <input
                type="text"
                formControlName="phone"
                placeholder="+1 (555) 000-0000"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >Designation</label
              >
              <input
                type="text"
                formControlName="designation"
                placeholder="Software Engineer"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >Salary</label
              >
              <input
                type="number"
                formControlName="salary"
                placeholder="50000"
                min="0"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>
          </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >Role / Privileges</label
              >
              <div class="relative">
                <select
                  formControlName="role"
                  class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
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

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >Shift</label
              >
              <div class="relative">
                <select
                  formControlName="shiftId"
                  class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  <option value="">No shift assigned</option>
                  @for (shift of shifts(); track shift.id) {
                    <option [value]="shift.id">
                      {{ shift.name }} ({{ shift.startTime }} - {{ shift.endTime }})
                    </option>
                  }
                </select>
                @if (shiftsLoading()) {
                  <div class="absolute inset-y-0 right-8 flex items-center px-2 text-slate-400">
                    <span class="text-xs">Loading...</span>
                  </div>
                }
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

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                (click)="cancel()"
                class="btn btn-secondary btn-secondary-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="saving()"
                class="btn btn-primary btn-primary-sm"
              >
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class EmployeeFormComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private employeeService = inject(EmployeeService);
  private shiftService = inject(ShiftService);
  private destroy$ = new Subject<void>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly shiftsLoading = signal(true);
  readonly shifts = signal<Shift[]>([]);
  readonly isEdit = signal(false);
  readonly employeeId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    employeeId: [''],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    designation: [''],
    salary: [0],
    role: ['employee'],
    shiftId: [''],
    officeLocationId: [''],
    status: ['active'],
    password: [''],
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.employeeId.set(id);
      this.isEdit.set(true);
    }
    this.loadLookups();
    this.loadEmployee();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLookups() {
    this.shiftService
      .list()
      .pipe(
        tap((shifts) => this.shifts.set(shifts)),
        catchError(() => of([])),
        finalize(() => this.shiftsLoading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  loadEmployee() {
    const id = this.employeeId();
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.employeeService
      .getById(id)
      .pipe(
        tap((emp) => {
          this.form.patchValue({
            employeeId: emp.employeeId,
            name: emp.name,
            email: emp.email,
            phone: emp.phone || '',
            designation: emp.designation || '',
            salary: emp.salary ?? 0,
            role: emp.role,
            shiftId: emp.shiftId || '',
            officeLocationId: emp.officeLocationId || '',
            status: emp.status,
          });
        }),
        catchError((err) => {
          console.error('Failed to load employee', err);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload: any = { ...raw };
    if (!this.isEdit()) {
      delete payload.employeeId;
      payload.password = 'password123'; // Default password for new employees
    } else {
      delete payload.password; // Don't update password on edit
    }

    const request$ = this.isEdit()
      ? this.employeeService.update(this.employeeId()!, payload)
      : this.employeeService.create(payload);

    request$
      .pipe(
        tap(() => this.router.navigate(['/employees'])),
        catchError((err) => {
          console.error('Save failed', err);
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  cancel() {
    this.router.navigate(['/employees']);
  }
}
