import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'wfm-employee-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="space-y-6 max-w-4xl">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Employee details</h1>
        <p class="text-sm text-slate-500">Create or modify workforce member record and system privileges</p>
      </div>

      <div class="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Employee ID *</label>
              <input
                type="text"
                formControlName="employeeId"
                placeholder="EMP-001"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full name *</label>
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
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email address *</label>
              <input
                type="email"
                formControlName="email"
                placeholder="john.doe@company.com"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone number</label>
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
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
              <input
                type="text"
                formControlName="designation"
                placeholder="Software Engineer"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Role / Privileges</label>
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
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Shift</label>
              <div class="relative">
                <select
                  formControlName="shiftId"
                  class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  <option value="">No shift assigned</option>
                  <!-- TODO: load shifts via ShiftService -->
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
              <div class="relative">
                <select
                  formControlName="departmentId"
                  class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  <option value="">No department assigned</option>
                  <!-- TODO: load departments -->
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              (click)="cancel()"
              class="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl px-5 py-2.5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl px-6 py-2.5 transition-colors shadow-sm shadow-indigo-100"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class EmployeeFormComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    designation: [''],
    role: ['employee'],
    shiftId: [''],
    departmentId: [''],
    officeLocationId: [''],
    status: ['active'],
    password: ['', Validators.minLength(8)],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO: call EmployeeService.create or update
  }

  cancel() {
    this.router.navigate(['/employees']);
  }
}
