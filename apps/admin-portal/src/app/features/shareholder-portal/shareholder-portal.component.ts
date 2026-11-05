import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommercialService } from '../../core/services/commercial.service';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'wfm-shareholder-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './shareholder-portal.component.html',
})
export class ShareholderPortalComponent implements OnInit {
  private commercialService = inject(CommercialService);
  private auth = inject(AuthService);
  private exportService = inject(ExportService);

  readonly currentUser = this.auth.currentUser;
  readonly currentRole = this.auth.currentRole;
  readonly isAdmin = computed(() => this.currentRole() === 'admin');

  // Loading & Action states
  readonly loading = signal(true);
  readonly submittingWithdrawal = signal(false);
  readonly activeTab = signal<'ledger' | 'pnl' | 'capTable'>('ledger');

  // Portal Data Signals
  readonly shareholder = signal<any | null>(null);
  readonly wallet = signal<any | null>(null);
  readonly companyMetrics = signal<any | null>(null);
  readonly monthlySummaries = signal<any[]>([]);
  readonly capTable = signal<any[]>([]);
  readonly shareholdersList = signal<any[]>([]);

  // Selected Shareholder for Admin switcher
  selectedShareholderId: string = '';

  // Ledger Filter & Search
  ledgerFilter = signal<'all' | 'distribution' | 'withdrawal'>('all');
  ledgerSearch = signal<string>('');

  // Withdrawal Modal
  readonly showWithdrawalModal = signal(false);
  withdrawalForm = {
    amount: 0,
    paymentMethod: 'bank',
    bankName: '',
    chequeNumber: '',
    notes: '',
  };
  withdrawalError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPortalData();
  }

  loadPortalData(targetShareholderId?: string): void {
    this.loading.set(true);
    this.commercialService.getShareholderPortalSummary(targetShareholderId).subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.shareholder.set(data.shareholder || null);
        this.wallet.set(data.wallet || null);
        this.companyMetrics.set(data.companyMetrics || null);
        this.monthlySummaries.set(data.monthlySummaries || []);
        this.capTable.set(data.capTable || []);
        this.shareholdersList.set(data.shareholdersList || []);

        if (data.shareholder?._id) {
          this.selectedShareholderId = data.shareholder._id;
        } else if (data.wallet?.shareholderId?._id) {
          this.selectedShareholderId = data.wallet.shareholderId._id;
        } else if (data.wallet?.shareholderId) {
          this.selectedShareholderId = data.wallet.shareholderId;
        }

        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load shareholder portal data', err);
        this.loading.set(false);
      },
    });
  }

  onShareholderSwitch(id: string): void {
    if (!id) return;
    this.selectedShareholderId = id;
    this.loadPortalData(id);
  }

  // Filtered transactions for the ledger tab
  readonly filteredTransactions = computed(() => {
    const list = this.wallet()?.transactions || [];
    const filter = this.ledgerFilter();
    const search = this.ledgerSearch().trim().toLowerCase();

    return list.filter((t: any) => {
      const matchesType = filter === 'all' || t.type === filter;
      const matchesSearch =
        !search ||
        (t.reference && t.reference.toLowerCase().includes(search)) ||
        (t.notes && t.notes.toLowerCase().includes(search)) ||
        (t.month && t.month.toLowerCase().includes(search));
      return matchesType && matchesSearch;
    });
  });

  // ---------------- Withdrawal / Drawing Logic ----------------
  openWithdrawalModal(): void {
    this.withdrawalError.set(null);
    this.withdrawalForm = {
      amount: 0,
      paymentMethod: 'bank',
      bankName: '',
      chequeNumber: '',
      notes: '',
    };
    this.showWithdrawalModal.set(true);
  }

  setQuickAmount(percentage: number): void {
    const balance = this.wallet()?.currentBalance || 0;
    const calc = Math.floor((balance * percentage) / 100);
    this.withdrawalForm.amount = Math.max(0, calc);
  }

  submitWithdrawal(): void {
    this.withdrawalError.set(null);
    const amt = Number(this.withdrawalForm.amount);
    const balance = this.wallet()?.currentBalance || 0;

    if (!amt || amt <= 0) {
      this.withdrawalError.set('Please enter a valid withdrawal amount greater than zero.');
      return;
    }

    if (amt > balance) {
      this.withdrawalError.set(
        `Requested amount (৳${amt.toLocaleString()}) exceeds your current available balance (৳${balance.toLocaleString()}).`
      );
      return;
    }

    this.submittingWithdrawal.set(true);
    const targetId = this.selectedShareholderId || this.shareholder()?._id || this.currentUser()?.id;

    this.commercialService
      .requestShareholderWithdrawal({
        shareholderId: targetId,
        amount: amt,
        paymentMethod: this.withdrawalForm.paymentMethod,
        bankName: this.withdrawalForm.bankName,
        chequeNumber: this.withdrawalForm.chequeNumber,
        notes: this.withdrawalForm.notes,
      })
      .subscribe({
        next: (_res: any) => {
          this.submittingWithdrawal.set(false);
          this.showWithdrawalModal.set(false);
          this.loadPortalData(targetId);
        },
        error: (err: any) => {
          this.submittingWithdrawal.set(false);
          this.withdrawalError.set(err?.error?.message || 'Withdrawal failed. Please check ledger limits.');
        },
      });
  }

  // ---------------- Universal Data Exports (Excel & PDF) ----------------

  exportLedgerExcel(): void {
    const items = this.filteredTransactions();
    const partnerName = this.shareholder()?.name || 'Shareholder';
    const headers = ['#', 'Date', 'Type', 'Voucher / Ref', 'Period', 'Description / Notes', 'Inflow (BDT)', 'Drawing (BDT)'];
    const rows = items.map((t: any, index: number) => [
      index + 1,
      t.date ? new Date(t.date).toLocaleDateString('en-GB') : '—',
      t.type === 'distribution' ? 'Profit Distribution' : 'Profit Drawing',
      t.reference || '—',
      t.month || '—',
      t.notes || '—',
      t.type === 'distribution' ? (t.amount || 0) : 0,
      t.type === 'withdrawal' ? (t.amount || 0) : 0,
    ]);

    this.exportService.exportToExcel({
      filename: `Shareholder_Ledger_${partnerName.replace(/\s+/g, '_')}`,
      title: `Shareholder Dividend & Wallet Ledger — ${partnerName}`,
      subtitle: `Equity: ${this.wallet()?.sharePercentage || 0}% | Balance: BDT ${Number(this.wallet()?.currentBalance || 0).toLocaleString()}`,
      headers,
      rows,
    });
  }

  exportLedgerPdf(): void {
    const partner = this.shareholder() || {};
    const wallet = this.wallet() || {};
    const items = this.filteredTransactions();

    const headers = ['#', 'Date', 'Type', 'Reference', 'Period', 'Inflow (BDT)', 'Drawing (BDT)'];
    const rows = items.map((t: any, idx: number) => [
      idx + 1,
      t.date ? new Date(t.date).toLocaleDateString('en-GB') : '—',
      t.type === 'distribution' ? 'Distribution' : 'Drawing',
      t.reference || '—',
      t.month || '—',
      t.type === 'distribution' ? `৳${Number(t.amount || 0).toLocaleString()}` : '—',
      t.type === 'withdrawal' ? `৳${Number(t.amount || 0).toLocaleString()}` : '—',
    ]);

    const title = `Shareholder Dividend & Wallet Ledger — ${partner.name || 'Partner'}`;
    const subtitle = `Investor ID: ${partner.employeeId || 'N/A'} | Equity: ${wallet.sharePercentage || 0}% | Balance: ৳${Number(wallet.currentBalance || 0).toLocaleString()}`;

    this.exportService.exportToPdf({
      filename: `Shareholder_Ledger_${(partner.name || 'Partner').replace(/\s+/g, '_')}`,
      title,
      subtitle,
      headers,
      rows,
    });
  }

  exportPnlExcel(): void {
    const items = this.monthlySummaries();
    const headers = ['#', 'Month', 'Confirmed Sales', 'Direct Costs', 'Gross Profit', 'Office / Admin Exp', 'Net Distributable', 'Status'];
    const rows = items.map((s: any, idx: number) => [
      idx + 1,
      s.month,
      s.totalConfirmedSales || 0,
      s.salesExpenses?.totalSalesExpenses || s.totalPurchases || 0,
      s.profit || 0,
      s.officeExpenses?.totalOfficeExpenses || s.operationalExpenses || 0,
      s.netProfit || 0,
      s.isDistributed ? 'Distributed' : 'Draft / Pending',
    ]);

    this.exportService.exportToExcel({
      filename: 'Company_Financial_Performance_PnL',
      title: 'Company Monthly Financial Performance & P&L',
      subtitle: 'Interior Counsel ERP — Audited Shareholder Profit Base',
      headers,
      rows,
    });
  }

  exportPnlPdf(): void {
    const items = this.monthlySummaries();
    const headers = ['#', 'Month', 'Sales Billed', 'Direct Costs', 'Gross Profit', 'Office Exp', 'Net Profit', 'Status'];
    const rows = items.map((s: any, idx: number) => [
      idx + 1,
      s.month,
      `৳${Number(s.totalConfirmedSales || 0).toLocaleString()}`,
      `৳${Number(s.salesExpenses?.totalSalesExpenses || s.totalPurchases || 0).toLocaleString()}`,
      `৳${Number(s.profit || 0).toLocaleString()}`,
      `৳${Number(s.officeExpenses?.totalOfficeExpenses || s.operationalExpenses || 0).toLocaleString()}`,
      `৳${Number(s.netProfit || 0).toLocaleString()}`,
      s.isDistributed ? 'Distributed' : 'Draft',
    ]);

    this.exportService.exportToPdf({
      filename: 'Company_Financial_Performance_PnL',
      title: 'Company Financial Performance & Distributable P&L',
      subtitle: 'Interior Counsel ERP — Consolidated Profit & Loss Audits',
      headers,
      rows,
    });
  }

  exportCapTableExcel(): void {
    const items = this.capTable();
    const headers = ['#', 'Partner Name', 'Designation', 'Investor ID', 'Equity (%)', 'Total Received', 'Total Drawings', 'Wallet Balance'];
    const rows = items.map((c: any, idx: number) => [
      idx + 1,
      c.name,
      c.designation || 'Partner',
      c.employeeId || '—',
      `${c.sharePercentage}%`,
      c.totalDistributed || 0,
      c.totalWithdrawn || 0,
      c.currentBalance || 0,
    ]);

    this.exportService.exportToExcel({
      filename: 'Interior_Counsel_Cap_Table_Ownership',
      title: 'Interior Counsel — Cap Table & Partnership Distribution',
      subtitle: 'Official Equity Structure & Cumulative Financial Positions',
      headers,
      rows,
    });
  }

  exportCapTablePdf(): void {
    const items = this.capTable();
    const headers = ['#', 'Partner Name', 'Designation', 'Investor ID', 'Equity %', 'Total Profit', 'Drawings', 'Current Balance'];
    const rows = items.map((c: any, idx: number) => [
      idx + 1,
      c.name,
      c.designation || 'Partner',
      c.employeeId || '—',
      `${c.sharePercentage}%`,
      `৳${Number(c.totalDistributed || 0).toLocaleString()}`,
      `৳${Number(c.totalWithdrawn || 0).toLocaleString()}`,
      `৳${Number(c.currentBalance || 0).toLocaleString()}`,
    ]);

    this.exportService.exportToPdf({
      filename: 'Cap_Table_Ownership',
      title: 'Interior Counsel — Cap Table & Partnership Distribution',
      subtitle: 'Official Equity Structure & Cumulative Financial Positions',
      headers,
      rows,
    });
  }
}
