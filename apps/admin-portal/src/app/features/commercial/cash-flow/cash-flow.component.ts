import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService, CashInRecord, CashOutRecord } from '../../../core/services/commercial.service';

@Component({
  selector: 'wfm-cash-flow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-flow.component.html',
})
export class CashFlowComponent implements OnInit {
  private commercialService = inject(CommercialService);

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

  // Forms
  formIn: any = {
    type: 'customer_payment',
    customerId: '',
    billId: '',
    amount: 0,
    paymentMethod: 'cash',
    transactionRef: '',
    notes: '',
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

  openInModal() {
    this.formIn = {
      type: 'customer_payment',
      customerId: this.clients()[0]?._id || '',
      billId: '',
      amount: 0,
      paymentMethod: 'cash',
      transactionRef: '',
      notes: '',
    };
    this.showInModal.set(true);
  }

  openOutModal() {
    this.formOut = {
      type: 'purchase',
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
    if (!this.formIn.amount || this.formIn.amount <= 0) {
      alert('Enter a valid amount');
      return;
    }

    this.commercialService.recordCashIn(this.formIn).subscribe({
      next: () => {
        this.showInModal.set(false);
        this.loadData();
      },
      error: (err) => alert(err?.error?.message || 'Failed to record cash in'),
    });
  }

  submitCashOut() {
    if (!this.formOut.amount || this.formOut.amount <= 0) {
      alert('Enter a valid disbursement amount');
      return;
    }

    this.commercialService.recordCashOut(this.formOut).subscribe({
      next: () => {
        this.showOutModal.set(false);
        this.loadData();
      },
      error: (err) => alert(err?.error?.message || 'Disbursement failed'),
    });
  }
}
