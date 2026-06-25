import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, tap } from 'rxjs';

import { ShiftService } from '../../core/services/shift.service';
import { Shift } from '../../core/models/shift.model';

@Component({
  selector: 'wfm-shift-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './shift-list.component.html',
})
export class ShiftListComponent implements OnDestroy {
  private shiftService = inject(ShiftService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly shifts = signal<Shift[]>([]);
  readonly isModalOpen = signal(false);
  readonly editingShift = signal<Shift | null>(null);

  readonly shiftForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    gracePeriod: [15, [Validators.required, Validators.min(0), Validators.max(120)]],
  });

  constructor() {
    this.loadShifts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadShifts() {
    this.loading.set(true);
    this.shiftService
      .list()
      .pipe(
        tap((data) => this.shifts.set(data)),
        catchError((err) => {
          console.error('Failed to load shifts', err);
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  openNewModal() {
    this.editingShift.set(null);
    this.shiftForm.reset({
      name: '',
      startTime: '',
      endTime: '',
      gracePeriod: 15,
    });
    this.isModalOpen.set(true);
  }

  openEditModal(shift: Shift) {
    this.editingShift.set(shift);
    this.shiftForm.patchValue({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriod: shift.gracePeriod,
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingShift.set(null);
  }

  saveShift() {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = this.shiftForm.getRawValue();
    const editing = this.editingShift();

    const shiftId = editing ? editing.id || editing._id : null;

    const request$ = shiftId
      ? this.shiftService.update(shiftId, payload)
      : this.shiftService.create(payload);

    request$
      .pipe(
        tap(() => {
          this.closeModal();
          this.loadShifts();
        }),
        catchError((err) => {
          console.error('Failed to save shift', err);
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  deleteShift(id: string) {
    if (!confirm('Are you sure you want to delete this shift?')) {
      return;
    }

    this.loading.set(true);
    this.shiftService
      .remove(id)
      .pipe(
        tap(() => {
          this.loadShifts();
        }),
        catchError((err) => {
          console.error('Failed to delete shift', err);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  formatTime12Hour(timeStr: string): string {
    if (!timeStr) return '';
    const [hourStr, minStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minStr} ${ampm}`;
  }
}
