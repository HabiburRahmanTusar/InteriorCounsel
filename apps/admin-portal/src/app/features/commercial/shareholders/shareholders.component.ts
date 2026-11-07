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
  readonly loadingProfit = signal(false);
  readonly distributing = signal(false);

  // Month-to-month selector for draft profit calculation
  fromMonth: string = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  toMonth: string = new Date().toISOString().slice(0, 7);   // 'YYYY-MM'
  selectedMonth: string = new Date().toISOString().slice(0, 7); // kept for backward compatibility

  // Modals & UI Toggles
  readonly showCreateModal = signal(false);
  readonly showEditModal = signal(false);
  readonly showLedgerModal = signal(false);
  readonly showBreakdownDetails = signal(true);
  readonly showDisburseConfirmModal = signal(false);
  readonly activeWallet = signal<any | null>(null);

  // Disbursement Form
  disburseNotes: string = '';
  disburseCustomAmount: number | null = null;
  readonly disburseError = signal<string | null>(null);
  readonly disburseSuccess = signal<string | null>(null);

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
    this.loadingProfit.set(true);
    this.commercialService.getMonthlyProfit(this.fromMonth, this.toMonth).subscribe({
      next: (res) => {
        this.monthlyProfit.set(res.data || null);
        this.loadingProfit.set(false);
      },
      error: () => this.loadingProfit.set(false),
    });
  }

  onPeriodChange() {
    if (this.fromMonth && this.toMonth && this.fromMonth > this.toMonth) {
      this.toMonth = this.fromMonth;
    }
    this.selectedMonth = this.fromMonth;
    this.loadMonthlyProfit();
  }

  setQuickPeriod(preset: 'this_month' | 'last_month' | 'last_3_months' | 'ytd') {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const thisMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

    if (preset === 'this_month') {
      this.fromMonth = thisMonthStr;
      this.toMonth = thisMonthStr;
    } else if (preset === 'last_month') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      this.fromMonth = lastMonthStr;
      this.toMonth = lastMonthStr;
    } else if (preset === 'last_3_months') {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      this.fromMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      this.toMonth = thisMonthStr;
    } else if (preset === 'ytd') {
      this.fromMonth = `${now.getFullYear()}-01`;
      this.toMonth = thisMonthStr;
    }
    this.onPeriodChange();
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
        this.loadMonthlyProfit();
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
        this.loadMonthlyProfit();
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
        this.loadMonthlyProfit();
      },
      error: (err) => alert(err?.error?.message || 'Failed to remove shareholder'),
    });
  }

  openLedger(wallet: any) {
    this.activeWallet.set(wallet);
    this.showLedgerModal.set(true);
  }

  openDisburseConfirm() {
    const p = this.monthlyProfit();
    if (!p) return;
    if (p.isDistributed) {
      alert(`Profit for ${p.periodLabel || p.month} has already been disbursed on ${new Date(p.distributionDate).toLocaleDateString()}.`);
      return;
    }
    if (!p.netProfit || p.netProfit <= 0) {
      alert(`Distributable net profit is ৳${p.netProfit || 0}. Cannot disburse zero or negative profit.`);
      return;
    }
    this.disburseNotes = '';
    this.disburseCustomAmount = p.netProfit;
    this.disburseError.set(null);
    this.showDisburseConfirmModal.set(true);
  }

  executeFinalDisbursement() {
    const p = this.monthlyProfit();
    if (!p) return;
    this.distributing.set(true);
    this.disburseError.set(null);

    const payload = {
      fromMonth: this.fromMonth,
      toMonth: this.toMonth,
      distributableAmount: this.disburseCustomAmount !== null ? Number(this.disburseCustomAmount) : p.netProfit,
      notes: this.disburseNotes,
    };

    this.commercialService.distributeProfit(payload).subscribe({
      next: () => {
        this.distributing.set(false);
        this.showDisburseConfirmModal.set(false);
        const amountFormatted = (payload.distributableAmount || 0).toLocaleString();
        const periodStr = p.periodLabel || `${this.fromMonth} to ${this.toMonth}`;
        this.disburseSuccess.set(`Net profit of ৳${amountFormatted} successfully disbursed to all shareholders for ${periodStr}! Wallets credited.`);
        setTimeout(() => this.disburseSuccess.set(null), 8000);
        this.loadData();
        this.loadMonthlyProfit();
      },
      error: (err) => {
        this.distributing.set(false);
        const errMsg = err?.error?.message || 'Failed to disburse profit';
        this.disburseError.set(errMsg);
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
      subtitle: `Period: ${this.fromMonth} to ${this.toMonth} | Active Shareholders: ${this.wallets().length}`,
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
      subtitle: `Period: ${this.fromMonth} to ${this.toMonth}`,
      headers: ['#', 'Partner Name', 'Designation', 'Equity %', 'Total Distributed', 'Withdrawn', 'Balance'],
      rows,
    });
  }

  exportProfitDraftPdf(): void {
    const p = this.monthlyProfit();
    if (!p) return;
    const allocations = p.draftAllocations || [];
    const rows = allocations.map((a: any, idx: number) => [
      idx + 1,
      a.name,
      a.designation,
      `${a.sharePercentage}%`,
      `৳${Number(a.draftShareAmount || 0).toLocaleString()}`,
      `৳${Number(a.currentBalance || 0).toLocaleString()}`,
      `৳${Number(a.projectedBalance || 0).toLocaleString()}`,
      a.status === 'finalized' ? 'Disbursed' : 'Draft',
    ]);

    this.exportService.exportToPdf({
      filename: `Profit_Distribution_${p.periodKey}`,
      title: `Interior Counsel — Profit Distribution Worksheet (${p.periodLabel})`,
      subtitle: `Distributable Net Profit: ৳${Number(p.netProfit || 0).toLocaleString()} | Status: ${p.isDistributed ? 'FINAL DISBURSED' : 'DRAFT CALCULATION'}`,
      headers: ['#', 'Partner Name', 'Role', 'Equity %', 'Share (BDT)', 'Current Balance', 'New Balance', 'Status'],
      rows,
    });
  }
}
