import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { CommercialService, CashInRecord, CashOutRecord, Bill } from '../../../core/services/commercial.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'wfm-cash-flow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-flow.component.html',
})
export class CashFlowComponent implements OnInit {
  private commercialService = inject(CommercialService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);
  private exportService = inject(ExportService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);

  readonly activeTab = signal<'in' | 'out'>('in');
  readonly cashInList = signal<CashInRecord[]>([]);
  readonly cashOutList = signal<CashOutRecord[]>([]);
  readonly loading = signal(false);

  // Modals
  readonly showInModal = signal(false);
  readonly showOutModal = signal(false);

  // Data helpers
  readonly clients = signal<any[]>([]);
  readonly vendors = signal<any[]>([]);
  readonly bills = signal<any[]>([]);
  readonly vendorBills = signal<any[]>([]);
  readonly shareholders = signal<any[]>([]);
  readonly employees = signal<any[]>([]);

  // Bill Selection & Search Signals
  readonly matchingBills = signal<any[]>([]);
  readonly selectedBill = signal<any | null>(null);

  // Forms
  formIn: any = {
    date: new Date().toISOString().slice(0, 10),
    billSearch: '',
    billId: '',
    customerId: '',
    type: 'customer_payment',
    amount: 0,
    paymentMethod: 'cash',
    bankName: '',
    accountNumber: '',
    chequeNumber: '',
    chequeDate: new Date().toISOString().slice(0, 10),
    mfsProvider: 'bKash',
    mobileNumber: '',
    transactionRef: '',
    notes: '',
    receivedBy: '',
    receivedByName: '',
  };

  formOut: any = {
    type: 'purchase',
    amount: 0,
    paymentMethod: 'cash',
    vendorId: '',
    vendorBillId: '',
    billId: '',
    shareholderId: '',
    recipientName: '',
    transactionRef: '',
    notes: '',
  };

  ngOnInit() {
    this.loadData();
    this.route.queryParams.subscribe((params) => {
      if (params['type'] === 'office') {
        this.activeTab.set('out');
        this.openOutModal('operating_expense');
      }
    });
  }

  loadData() {
    this.loading.set(true);
    this.commercialService.getCashIn().subscribe({
      next: (res) => this.cashInList.set(res.data || []),
    });

    this.commercialService.getCashOut().subscribe({
      next: (res) => {
        this.cashOutList.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.commercialService.getClients().subscribe((res) => this.clients.set(res.data || []));
    this.commercialService.getVendors().subscribe((res) => this.vendors.set(res.data || []));
    this.commercialService.getBills().subscribe((res) => this.bills.set(res.data || []));
    this.commercialService.getVendorBills().subscribe((res) => this.vendorBills.set(res.data || []));
    this.commercialService.getShareholders().subscribe((res) => this.shareholders.set(res.data || []));

    this.employeeService.list({ limit: 100 }).subscribe({
      next: (res) => this.employees.set(res.data || []),
      error: () => {},
    });
  }

  get totalCashInAmount(): number {
    return this.cashInList().reduce((acc, c) => acc + (c.amount || 0), 0);
  }

  get totalCashOutAmount(): number {
    return this.cashOutList().reduce((acc, c) => acc + (c.amount || 0), 0);
  }

  get netLiquidity(): number {
    return this.totalCashInAmount - this.totalCashOutAmount;
  }

  // -------------------------------------------------------------
  // Bill Selection & Lookup Helpers
  // -------------------------------------------------------------

  getCustomerName(bill: any): string {
    if (!bill) return '—';
    if (bill.customerId && typeof bill.customerId === 'object') {
      return bill.customerId.name || bill.customerId.companyName || '—';
    }
    const c = this.clients().find((cli) => cli._id === bill.customerId);
    return c?.name || c?.companyName || '—';
  }

  getBillDue(bill: any): number {
    if (!bill) return 0;
    if (bill.customerDue !== undefined && bill.customerDue !== null) {
      return bill.customerDue;
    }
    return Math.max(0, (bill.totalAmount || 0) - (bill.totalCashIn || 0));
  }

  onBillSearchChange(): void {
    const term = (this.formIn.billSearch || '').trim().toLowerCase();
    if (!term) {
      this.matchingBills.set([]);
      return;
    }

    const matches = this.bills().filter((b) => {
      const bNum = (b.billNumber || '').toLowerCase();
      const pName = (b.projectName || '').toLowerCase();
      const cName = this.getCustomerName(b).toLowerCase();
      return bNum.includes(term) || pName.includes(term) || cName.includes(term);
    });

    this.matchingBills.set(matches);

    // If exact match on billNumber, automatically select it
    const exact = this.bills().find((b) => (b.billNumber || '').toLowerCase() === term);
    if (exact) {
      this.selectBill(exact);
    }
  }

  selectBill(bill: any): void {
    this.selectedBill.set(bill);
    this.formIn.billId = bill._id;
    this.formIn.billSearch = bill.billNumber;
    this.formIn.customerId = bill.customerId?._id || bill.customerId;

    const due = this.getBillDue(bill);
    if (due > 0 && (!this.formIn.amount || this.formIn.amount === 0)) {
      this.formIn.amount = due;
    }
    this.matchingBills.set([]);
  }

  clearBillSelection(): void {
    this.selectedBill.set(null);
    this.formIn.billId = '';
    this.formIn.billSearch = '';
    this.matchingBills.set([]);
  }

  onBillDropdownSelect(event: Event): void {
    const billId = (event.target as HTMLSelectElement).value;
    if (!billId) {
      this.clearBillSelection();
      return;
    }
    const found = this.bills().find((b) => b._id === billId);
    if (found) {
      this.selectBill(found);
    }
  }

  // -------------------------------------------------------------
  // Modals & Submissions
  // -------------------------------------------------------------

  openInModal() {
    const today = new Date().toISOString().slice(0, 10);
    const currentUser = this.authService.currentUser();
    const defaultReceiver = currentUser?.name || 'System Admin';
    const defaultReceiverId = currentUser?.id || '';

    this.formIn = {
      date: today,
      billSearch: '',
      billId: '',
      customerId: '',
      type: 'customer_payment',
      amount: 0,
      paymentMethod: 'cash',
      bankName: '',
      accountNumber: '',
      chequeNumber: '',
      chequeDate: today,
      mfsProvider: 'bKash',
      mobileNumber: '',
      transactionRef: '',
      notes: '',
      receivedBy: defaultReceiverId,
      receivedByName: defaultReceiver,
    };
    this.selectedBill.set(null);
    this.matchingBills.set([]);
    this.showInModal.set(true);
  }

  openOutModal(defaultType: string = 'purchase') {
    this.formOut = {
      type: defaultType,
      amount: 0,
      paymentMethod: 'cash',
      vendorId: this.vendors()[0]?._id || '',
      vendorBillId: '',
      billId: '',
      shareholderId: '',
      recipientName: '',
      transactionRef: '',
      notes: '',
    };
    this.showOutModal.set(true);
  }

  submitCashIn() {
    if (!this.formIn.date) {
      this.toastr.warning('Please select a payment receipt date', 'Warning');
      return;
    }

    if (!this.formIn.amount || this.formIn.amount <= 0) {
      this.toastr.warning('Please enter a valid receipt amount', 'Warning');
      return;
    }

    if (!this.formIn.receivedByName) {
      this.toastr.warning('Please specify who received this payment', 'Warning');
      return;
    }

    // Build method-specific audit notes
    let extraNotes = this.formIn.notes || '';
    if (this.formIn.paymentMethod === 'bank_transfer') {
      const bankDetails = [this.formIn.bankName, this.formIn.accountNumber, this.formIn.transactionRef]
        .filter(Boolean)
        .join(' | ');
      if (bankDetails) extraNotes = `[Bank Transfer: ${bankDetails}] ${extraNotes}`;
    } else if (this.formIn.paymentMethod === 'cheque') {
      const chqDetails = [this.formIn.chequeNumber, this.formIn.bankName, this.formIn.chequeDate]
        .filter(Boolean)
        .join(' | ');
      if (chqDetails) extraNotes = `[Cheque: ${chqDetails}] ${extraNotes}`;
    } else if (this.formIn.paymentMethod === 'mfs') {
      const mfsDetails = [this.formIn.mfsProvider, this.formIn.mobileNumber, this.formIn.transactionRef]
        .filter(Boolean)
        .join(' | ');
      if (mfsDetails) extraNotes = `[MFS: ${mfsDetails}] ${extraNotes}`;
    }

    const payload = {
      ...this.formIn,
      notes: extraNotes.trim(),
    };

    this.commercialService.recordCashIn(payload).subscribe({
      next: () => {
        this.toastr.success('Cash In (Receipt) recorded successfully', 'Success');
        this.showInModal.set(false);
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error(err?.error?.message || 'Failed to record cash in', 'Error');
      },
    });
  }

  submitCashOut() {
    if (!this.formOut.amount || this.formOut.amount <= 0) {
      this.toastr.warning('Enter a valid disbursement amount', 'Warning');
      return;
    }

    this.commercialService.recordCashOut(this.formOut).subscribe({
      next: () => {
        this.toastr.success('Cash Out recorded successfully', 'Success');
        this.showOutModal.set(false);
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error(err?.error?.message || 'Disbursement failed', 'Error');
      },
    });
  }

  exportCashInExcel() {
    const list = this.cashInList();
    if (!list || list.length === 0) {
      this.toastr.warning('No cash-in records to export');
      return;
    }
    const rows = list.map((c: any) => [
      c.date ? new Date(c.date).toISOString().slice(0, 10) : '—',
      c.billId?.billNumber || c.billNumber || '—',
      c.customerId?.name || c.customerName || 'Customer',
      c.amount || 0,
      (c.paymentMethod || 'cash').toUpperCase(),
      c.bankName || c.mfsProvider || '—',
      c.transactionRef || c.chequeNumber || '—',
      c.note || '—',
    ]);
    this.exportService.exportToExcel({
      filename: 'InteriorCounsel_CashIn_Receipts',
      title: 'Commercial Inflows & Customer Receipts Ledger',
      subtitle: 'Total Receipts: ' + rows.length,
      headers: ['Receipt Date', 'Master Bill #', 'Customer Name', 'Amount (BDT)', 'Payment Mode', 'Bank / Gateway', 'Reference #', 'Remarks'],
      rows,
    });
    this.toastr.success('Cash-in records exported to Excel');
  }

  exportCashInPdf() {
    const list = this.cashInList();
    if (!list || list.length === 0) {
      this.toastr.warning('No cash-in records to export');
      return;
    }
    const rows = list.map((c: any) => [
      c.date ? new Date(c.date).toISOString().slice(0, 10) : '—',
      c.billId?.billNumber || c.billNumber || '—',
      c.customerId?.name || c.customerName || 'Customer',
      (c.amount || 0).toLocaleString(),
      (c.paymentMethod || 'cash').toUpperCase(),
      c.transactionRef || c.chequeNumber || '—',
    ]);
    this.exportService.exportToPdf({
      filename: 'InteriorCounsel_CashIn_Receipts',
      title: 'Commercial Inflows & Customer Receipts Ledger',
      subtitle: 'Total Receipts: ' + rows.length,
      headers: ['Date', 'Bill #', 'Customer', 'Amount (Tk)', 'Method', 'Reference'],
      rows,
      orientation: 'landscape',
    });
    this.toastr.success('Cash-in records exported to PDF');
  }

  exportCashOutExcel() {
    const list = this.cashOutList();
    if (!list || list.length === 0) {
      this.toastr.warning('No cash-out records to export');
      return;
    }
    const rows = list.map((c: any) => [
      c.date ? new Date(c.date).toISOString().slice(0, 10) : '—',
      c.expenseCategory || c.type || 'Operational',
      c.vendorId?.name || c.vendorName || c.recipient || '—',
      c.amount || 0,
      (c.paymentMethod || 'cash').toUpperCase(),
      c.bankName || c.mfsProvider || '—',
      c.transactionRef || c.voucherNumber || '—',
      c.note || '—',
    ]);
    this.exportService.exportToExcel({
      filename: 'InteriorCounsel_CashOut_Payments',
      title: 'Expenses & Vendor Disbursements Ledger',
      subtitle: 'Total Payments: ' + rows.length,
      headers: ['Payment Date', 'Expense Category', 'Vendor / Recipient', 'Amount (BDT)', 'Mode', 'Bank / Gateway', 'Voucher / Ref', 'Remarks'],
      rows,
    });
    this.toastr.success('Cash-out records exported to Excel');
  }

  exportCashOutPdf() {
    const list = this.cashOutList();
    if (!list || list.length === 0) {
      this.toastr.warning('No cash-out records to export');
      return;
    }
    const rows = list.map((c: any) => [
      c.date ? new Date(c.date).toISOString().slice(0, 10) : '—',
      c.expenseCategory || c.type || 'Expense',
      c.vendorId?.name || c.vendorName || c.recipient || '—',
      (c.amount || 0).toLocaleString(),
      (c.paymentMethod || 'cash').toUpperCase(),
      c.transactionRef || c.voucherNumber || '—',
    ]);
    this.exportService.exportToPdf({
      filename: 'InteriorCounsel_CashOut_Payments',
      title: 'Expenses & Vendor Disbursements Ledger',
      subtitle: 'Total Disbursements: ' + rows.length,
      headers: ['Date', 'Category', 'Vendor / Payee', 'Amount (Tk)', 'Method', 'Ref #'],
      rows,
      orientation: 'landscape',
    });
    this.toastr.success('Cash-out records exported to PDF');
  }

}
