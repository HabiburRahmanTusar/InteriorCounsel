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
  templateUrl: './employee-form.component.html',
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
    status: ['active'],
    joiningDate: [''],
    resignationDate: [''],
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
            shiftId: (emp.shiftId as any)?._id || emp.shiftId || '',
            status: emp.status,
            joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
            resignationDate: emp.resignationDate ? emp.resignationDate.split('T')[0] : '',
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
    if (!payload.shiftId) payload.shiftId = null;
    if (!payload.joiningDate) payload.joiningDate = null;
    if (!payload.resignationDate) payload.resignationDate = null;
    if (!this.isEdit()) {
      delete payload.employeeId;
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

  formatTime(timeStr: string): string {
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

  cancel() {
    this.router.navigate(['/employees']);
  }
}
