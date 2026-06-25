import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs';

import { ReportService } from '../../core/services/report.service';

@Component({
  selector: 'wfm-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './report.component.html',
})
export class ReportComponent implements OnDestroy {
  private reportService = inject(ReportService);
  private destroy$ = new Subject<void>();

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFrom(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.from.set(value);
  }

  setTo(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.to.set(value);
  }

  setFormat(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'excel' | 'csv' | 'pdf';
    this.format.set(value);
  }

  readonly from = signal(this.getToday());
  readonly to = signal(this.getToday());
  readonly format = signal<'excel' | 'csv' | 'pdf'>('excel');
  readonly exporting = signal(false);

  exportReport() {
    if (!this.from() || !this.to()) return;
    this.exporting.set(true);
    this.reportService
      .export({
        format: this.format(),
        from: this.from(),
        to: this.to(),
      })
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.exporting.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe((blob: any) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${this.format()}-${this.from()}-${this.to()}.${
            this.format() === 'excel' ? 'xlsx' : this.format()
          }`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      });
  }
}
