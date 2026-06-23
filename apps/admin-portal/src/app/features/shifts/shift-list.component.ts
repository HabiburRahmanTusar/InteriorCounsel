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
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Shifts</h1>
          <p class="text-sm text-slate-500">Configure standard operating hours and grace periods</p>
        </div>
        <button
          (click)="openNewModal()"
          class="btn btn-primary btn-primary-sm"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>New shift</span>
        </button>
      </div>

      <!-- Table Card -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Name
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Start Time
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  End Time
                </th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                  Grace (min)
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
                  <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                    <span class="text-sm font-medium">Loading shifts...</span>
                  </td>
                </tr>
              } @else if (shifts().length === 0) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-400">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span class="text-sm font-medium">No shifts configured</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (shift of shifts(); track shift.id || shift._id) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 text-sm font-medium text-slate-900">{{ shift.name }}</td>
                    <td class="px-6 py-4 text-sm text-slate-700">
                      {{ formatTime12Hour(shift.startTime) }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">
                      {{ formatTime12Hour(shift.endTime) }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-700">{{ shift.gracePeriod }}</td>
                    <td class="px-6 py-4 text-right text-sm">
                      <div class="flex justify-end gap-3">
                        <button
                          (click)="openEditModal(shift)"
                          class="btn-link-outline btn-link-outline-indigo"
                        >
                          Edit
                        </button>
                        <button
                          (click)="deleteShift(shift.id || shift._id!)"
                          class="btn-link-outline btn-link-outline-rose"
                        >
                          Delete
                        </button>
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

    <!-- Edit/New Modal Overlay -->
    @if (isModalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      >
        <div
          class="bg-white border border-slate-200/80 rounded-2xl p-6 w-full max-w-lg shadow-xl mx-4"
        >
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-slate-900">
              {{ editingShift() ? 'Edit Shift' : 'New Shift' }}
            </h2>
            <button
              (click)="closeModal()"
              class="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form [formGroup]="shiftForm" (ngSubmit)="saveShift()" class="space-y-4">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                Shift Name *
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Day Shift"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
              @if (shiftForm.get('name')?.touched && shiftForm.get('name')?.invalid) {
                <p class="text-rose-500 text-xs mt-1">Name is required (min 2 characters)</p>
              }
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Start Time *
                </label>
                <input
                  type="time"
                  formControlName="startTime"
                  class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                />
                @if (shiftForm.get('startTime')?.touched && shiftForm.get('startTime')?.invalid) {
                  <p class="text-rose-500 text-xs mt-1">Start time is required</p>
                }
              </div>
              <div>
                <label
                  class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  End Time *
                </label>
                <input
                  type="time"
                  formControlName="endTime"
                  class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                />
                @if (shiftForm.get('endTime')?.touched && shiftForm.get('endTime')?.invalid) {
                  <p class="text-rose-500 text-xs mt-1">End time is required</p>
                }
              </div>
            </div>

            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                Grace Period (min)
              </label>
              <input
                type="number"
                formControlName="gracePeriod"
                placeholder="15"
                class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              />
              @if (shiftForm.get('gracePeriod')?.touched && shiftForm.get('gracePeriod')?.invalid) {
                <p class="text-rose-500 text-xs mt-1">Must be between 0 and 120</p>
              }
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                (click)="closeModal()"
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
    }
  `,
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
