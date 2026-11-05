import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommercialService } from '../../../core/services/commercial.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'wfm-shareholders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './shareholders.component.html',
})
export class ShareholdersComponent implements OnInit {
  private commercialService = inject(CommercialService);
  private employeeService = inject(EmployeeService);
  private exportService = inject(ExportService);

  readonly wallets = signal<any[]>([]);
  readonly employees = signal<any[]>([]);
  readonly monthlyProfit = signal<any | null>(null);
  readonly loading = signal(false);
  readonly distributing = signal(false);

  // Month selector for profit distribution
  selectedMonth: string = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  // Modals & UI Toggles
  readonly showCreateModal = signal(false);
  readonly showEditModal = signal(false);
  readonly showLedgerModal = signal(false);
  readonly showBreakdownDetails = signal(true);
  readonly activeWallet = signal<any | null>(null);

  getSalesExpensesTotal(p: any): number {
    if (!p) return 0;
    if (p.salesExpenses?.totalSalesExpenses !== undefined) {
      return p.salesExpenses.totalSalesExpenses;
    }
    return (p.totalPurchases || 0) + (p.directCosts || 0);
  }

  getProfitBeforeOffice(p: any): number {
    if (!p) return 0;
    if (p.profit !== undefined) {
      return p.profit;
    }
    return (p.totalConfirmedSales || 0) - this.getSalesExpensesTotal(p);
  }

  getOfficeExpensesTotal(p: any): number {
    if (!p) return 0;
    if (p.officeExpenses?.totalOfficeExpenses !== undefined) {
      return p.officeExpenses.totalOfficeExpenses;
    }
    return p.operationalExpenses || 0;
  }

  newMode: 'existing' | 'new' = 'new';
  newForm = {
    shareholderId: '',
    name: '',
    email: '',
    phone: '',
    designation: 'Partner / Shareholder',
    sharePercentage: 0,
  };

  editForm: { shareholderId: string; shareholderName: string; sharePercentage: number } = {
    shareholderId: '',
    shareholderName: '',
    sharePercentage: 0,
  };

  ngOnInit() {
    this.loadData();
    this.loadEmployees();
    this.loadMonthlyProfit();
  }

  loadData() {
    this.loading.set(true);
    this.commercialService.getShareholders().subscribe({
      next: (res) => {
        this.wallets.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadEmployees() {
    this.employeeService.list({ limit: 100 }).subscribe({
      next: (res) => {
        this.employees.set(res.data || []);
      },
    });
  }

  loadMonthlyProfit() {
    this.commercialService.getMonthlyProfit(this.selectedMonth).subscribe({
      next: (res) => {
        this.monthlyProfit.set(res.data || null);
      },
    });
  }

  onMonthChange() {
    this.loadMonthlyProfit();
  }

  // Available users not already assigned an active wallet
  readonly availableEmployees = computed(() => {
    const existingIds = new Set(
      this.wallets().map((w) => (w.shareholderId?._id || w.shareholderId)?.toString())
    );
    return this.employees().filter((emp) => !existingIds.has((emp.id || emp._id)?.toString()));
  });

  openCreateModal() {
    const available = this.availableEmployees();
    this.newMode = available.length > 0 ? 'existing' : 'new';
    this.newForm = {
      shareholderId: available.length > 0 ? (available[0].id || available[0]._id) : '',
      name: '',
      email: '',
      phone: '',
      designation: 'Partner / Shareholder',
      sharePercentage: 0,
    };
    this.showCreateModal.set(true);
  }

  saveNewShareholder() {
    if (this.newMode === 'existing') {
      if (!this.newForm.shareholderId) {
        alert('Please select an employee or partner');
        return;
      }
    } else {
      if (!this.newForm.name || !this.newForm.name.trim()) {
        alert('Please enter partner/shareholder name');
        return;
      }
    }

    if (this.newForm.sharePercentage < 0 || this.newForm.sharePercentage > 100) {
      alert('Share percentage must be between 0% and 100%');
      return;
    }

    const payload: any = {
      sharePercentage: Number(this.newForm.sharePercentage) || 0,
    };
    if (this.newMode === 'existing') {
      payload.shareholderId = this.newForm.shareholderId;
    } else {
      payload.name = this.newForm.name.trim();
      payload.email = this.newForm.email.trim();
      payload.phone = this.newForm.phone.trim();
      payload.designation = this.newForm.designation.trim();
    }

    this.commercialService.registerShareholder(payload).subscribe({
      next: () => {
        this.showCreateModal.set(false);
        this.loadData();
      },
      error: (err) => alert(err?.error?.message || 'Failed to register shareholder'),
    });
  }

  openEditPercentage(wallet: any) {
    this.editForm = {
      shareholderId: wallet.shareholderId?._id || wallet.shareholderId,
      shareholderName: wallet.shareholderId?.name || 'Shareholder',
      sharePercentage: wallet.sharePercentage || 0,
    };
    this.showEditModal.set(true);
  }

  saveSharePercentage() {
    if (this.editForm.sharePercentage < 0 || this.editForm.sharePercentage > 100) {
      alert('Share percentage must be between 0% and 100%');
      return;
    }

    this.commercialService.updateSharePercentage(this.editForm.shareholderId, this.editForm.sharePercentage).subscribe({
      next: () => {
        this.showEditModal.set(false);
        this.loadData();
      },
      error: (err) => alert(err?.error?.message || 'Failed to update share percentage'),
    });
  }

  removeShareholder(wallet: any) {
    const name = wallet.shareholderId?.name || 'this shareholder';
    if (!confirm(`Are you sure you want to deactivate shareholder account for ${name}?`)) {
      return;
    }

    const id = wallet.shareholderId?._id || wallet.shareholderId;
    this.commercialService.removeShareholder(id).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => alert(err?.error?.message || 'Failed to remove shareholder'),
    });
  }

  openLedger(wallet: any) {
    this.activeWallet.set(wallet);
    this.showLedgerModal.set(true);
  }

  triggerDistributeProfit() {
    if (!confirm(`Are you sure you want to calculate and distribute net profit for ${this.selectedMonth} into shareholder wallets?`)) {
      return;
    }

    this.distributing.set(true);
    this.commercialService.distributeProfit(this.selectedMonth).subscribe({
      next: () => {
        this.distributing.set(false);
        alert(`Successfully distributed profit for ${this.selectedMonth}!`);
        this.loadData();
        this.loadMonthlyProfit();
      },
      error: (err) => {
        this.distributing.set(false);
        alert(err?.error?.message || 'Failed to distribute profit');
      },
    });
  }

  get totalAllocatedPercentage(): number {
    return this.wallets().reduce((acc, w) => acc + (w.sharePercentage || 0), 0);
  }

  get totalDistributedPool(): number {
    return this.wallets().reduce((acc, w) => acc + (w.totalDistributed || 0), 0);
  }

  get totalWithdrawnPool(): number {
    return this.wallets().reduce((acc, w) => acc + (w.totalWithdrawn || 0), 0);
  }

  get totalWalletLiabilities(): number {
    return this.wallets().reduce((acc, w) => acc + (w.currentBalance || 0), 0);
  }

  exportWalletsExcel(): void {
    const rows = this.wallets().map((w: any, idx: number) => [
      idx + 1,
      w.shareholderId?.name || 'Unnamed',
      w.shareholderId?.designation || 'Partner',
      w.shareholderId?.email || '',
      `${w.sharePercentage}%`,
      w.totalDistributed || 0,
      w.totalWithdrawn || 0,
      w.currentBalance || 0,
    ]);

    this.exportService.exportToExcel({
      filename: 'Shareholder_Equity_Wallets',
      title: 'Interior Counsel — Shareholder Equity & Wallets',
      subtitle: `Period: ${this.selectedMonth} | Active Shareholders: ${this.wallets().length}`,
      headers: ['#', 'Partner Name', 'Designation', 'Email', 'Equity %', 'Total Distributed (BDT)', 'Total Withdrawn (BDT)', 'Current Balance (BDT)'],
      rows,
    });
  }

  exportWalletsPdf(): void {
    const rows = this.wallets().map((w: any, idx: number) => [
      idx + 1,
      w.shareholderId?.name || 'Unnamed',
      w.shareholderId?.designation || 'Partner',
      `${w.sharePercentage}%`,
      `৳${Number(w.totalDistributed || 0).toLocaleString()}`,
      `৳${Number(w.totalWithdrawn || 0).toLocaleString()}`,
      `৳${Number(w.currentBalance || 0).toLocaleString()}`,
    ]);

    this.exportService.exportToPdf({
      filename: 'Shareholder_Equity_Wallets',
      title: 'Interior Counsel — Shareholder Equity & Wallets',
      subtitle: `Period: ${this.selectedMonth}`,
      headers: ['#', 'Partner Name', 'Designation', 'Equity %', 'Total Distributed', 'Withdrawn', 'Balance'],
      rows,
    });
  }
}
