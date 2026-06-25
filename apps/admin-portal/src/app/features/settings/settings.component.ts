import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize, of, tap } from 'rxjs';

import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'wfm-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnDestroy {
  private settingsService = inject(SettingsService);
  private destroy$ = new Subject<void>();

  readonly activeTab = signal('rules');
  readonly rules = signal<Record<string, any>>({});
  readonly company = signal<Record<string, any>>({});
  readonly savingRules = signal(false);
  readonly savingCompany = signal(false);

  constructor() {
    this.loadCompany();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  onTimezoneInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.updateRule('defaultTimezone', value);
  }

  saveRules() {
    this.savingRules.set(true);
    const payload = {
      defaultGracePeriodMinutes: this.rules()['defaultGracePeriodMinutes'] ?? 15,
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
