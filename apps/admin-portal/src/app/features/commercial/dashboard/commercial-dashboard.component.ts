import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommercialService } from '../../../core/services/commercial.service';

@Component({
  selector: 'wfm-commercial-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './commercial-dashboard.component.html',
})
export class CommercialDashboardComponent implements OnInit {
  private commercialService = inject(CommercialService);

  readonly summary = signal<any | null>(null);
  readonly loading = signal(false);
  readonly selectedPeriod = signal<'today' | 'this_month' | 'last_month' | 'this_year'>('this_month');

  ngOnInit() {
    this.loadSummary();
  }

  loadSummary() {
    this.loading.set(true);
    this.commercialService.getFinancialSummary(this.selectedPeriod()).subscribe({
      next: (res) => {
        this.summary.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setPeriod(p: 'today' | 'this_month' | 'last_month' | 'this_year') {
    this.selectedPeriod.set(p);
    this.loadSummary();
  }
}
