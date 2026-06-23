import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, tap } from 'rxjs';

import { SettingsService } from '../../core/services/settings.service';
import { OfficeLocation } from '../../core/models/office-location.model';

@Component({
  selector: 'wfm-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6 max-w-4xl">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p class="text-sm text-slate-500">
          Configure regional preferences, office geography, and validation rules
        </p>
      </div>

      <!-- Settings Card -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <!-- Tab Headers -->
        <div class="flex border-b border-slate-200 bg-slate-50/50 px-6">
          <button
            (click)="activeTab.set('office')"
            [class]="
              activeTab() === 'office'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-950'
            "
            class="px-4 py-4 border-b-2 text-sm font-medium transition-all outline-none"
          >
            Office locations
          </button>
          <button
            (click)="activeTab.set('rules')"
            [class]="
              activeTab() === 'rules'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-950'
            "
            class="px-4 py-4 border-b-2 text-sm font-medium transition-all outline-none"
          >
            Attendance rules
          </button>
          <button
            (click)="activeTab.set('company')"
            [class]="
              activeTab() === 'company'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-950'
            "
            class="px-4 py-4 border-b-2 text-sm font-medium transition-all outline-none"
          >
            Company
          </button>
        </div>

        <!-- Tab Body -->
        <div class="p-6 md:p-8">
          @if (activeTab() === 'office') {
            <div class="space-y-4">
              <div
                class="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-3 text-slate-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-indigo-500 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div class="space-y-1">
                  <h5 class="text-sm font-semibold text-slate-900">Geofencing parameters</h5>
                  <p class="text-xs text-slate-500 leading-relaxed">
                    Manage office locations (name, GPS coordinates, radius in metres). A Leaflet map
                    picker will be integrated in Phase 2.
                  </p>
                </div>
              </div>

              @if (locationsLoading()) {
                <div class="text-sm text-slate-500">Loading locations...</div>
              } @else if (locations().length === 0) {
                <div class="text-sm text-slate-500">No office locations configured.</div>
              } @else {
                <div class="space-y-3">
                  @for (loc of locations(); track loc.id) {
                    <div
                      class="border border-slate-200 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div class="text-sm font-semibold text-slate-900">{{ loc.name }}</div>
                        <div class="text-xs text-slate-500">
                          {{ loc.latitude }}, {{ loc.longitude }} — radius {{ loc.radius }}m
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (activeTab() === 'rules') {
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label
                    class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                    >Default grace period (min)</label
                  >
                  <input
                    type="number"
                    [value]="rules()['defaultGracePeriodMinutes'] ?? 15"
                    (input)="onGracePeriodInput($event)"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                    >Default office radius (m)</label
                  >
                  <input
                    type="number"
                    [value]="rules()['defaultOfficeRadiusMeters'] ?? 200"
                    (input)="onOfficeRadiusInput($event)"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                    >Default timezone</label
                  >
                  <input
                    type="text"
                    [value]="rules()['defaultTimezone'] ?? 'UTC+6'"
                    (input)="onTimezoneInput($event)"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div class="flex justify-end pt-4 border-t border-slate-100">
                <button
                  (click)="saveRules()"
                  [disabled]="savingRules()"
                  class="btn btn-primary btn-primary-sm"
                >
                  {{ savingRules() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>
          }

          @if (activeTab() === 'company') {
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                    >Company name</label
                  >
                  <input
                    type="text"
                    [value]="company()['name'] || ''"
                    (input)="onCompanyNameInput($event)"
                    placeholder="Enter company brand name"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label
                    class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                    >Legal name</label
                  >
                  <input
                    type="text"
                    [value]="company()['legalName'] || ''"
                    (input)="onLegalNameInput($event)"
                    placeholder="Enter official registered name"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div class="flex justify-end pt-4 border-t border-slate-100">
                <button
                  (click)="saveCompany()"
                  [disabled]="savingCompany()"
                  class="btn btn-primary btn-primary-sm"
                >
                  {{ savingCompany() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnDestroy {
  private settingsService = inject(SettingsService);
  private destroy$ = new Subject<void>();

  readonly activeTab = signal('office');
  readonly locationsLoading = signal(false);
  readonly locations = signal<OfficeLocation[]>([]);
  readonly rules = signal<Record<string, any>>({});
  readonly company = signal<Record<string, any>>({});
  readonly savingRules = signal(false);
  readonly savingCompany = signal(false);

  constructor() {
    this.loadOfficeLocations();
    this.loadCompany();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOfficeLocations() {
    this.locationsLoading.set(true);
    this.settingsService
      .listOfficeLocations()
      .pipe(
        tap((data) => this.locations.set(data)),
        catchError(() => of([])),
        finalize(() => this.locationsLoading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  loadCompany() {
    this.settingsService
      .getCompany()
      .pipe(
        tap((data: any) => this.company.set(data || {})),
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  updateRule(key: string, value: any) {
    this.rules.update((r) => ({ ...r, [key]: value }));
  }

  onGracePeriodInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateRule('defaultGracePeriodMinutes', Number(value));
  }

  onOfficeRadiusInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateRule('defaultOfficeRadiusMeters', Number(value));
  }

  onTimezoneInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateRule('defaultTimezone', value);
  }

  saveRules() {
    this.savingRules.set(true);
    const payload = {
      defaultGracePeriodMinutes: this.rules()['defaultGracePeriodMinutes'] ?? 15,
      defaultOfficeRadiusMeters: this.rules()['defaultOfficeRadiusMeters'] ?? 200,
      defaultTimezone: this.rules()['defaultTimezone'] ?? 'UTC+6',
    };
    this.settingsService
      .updateAttendanceRules(payload)
      .pipe(
        tap(() => {}),
        catchError((err) => {
          console.error('Failed to save rules', err);
          return of(null);
        }),
        finalize(() => this.savingRules.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  updateCompany(key: string, value: string) {
    this.company.update((c) => ({ ...c, [key]: value }));
  }

  onCompanyNameInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateCompany('name', value);
  }

  onLegalNameInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateCompany('legalName', value);
  }

  saveCompany() {
    this.savingCompany.set(true);
    this.settingsService
      .updateCompany(this.company())
      .pipe(
        tap(() => {}),
        catchError((err) => {
          console.error('Failed to save company', err);
          return of(null);
        }),
        finalize(() => this.savingCompany.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }
}
