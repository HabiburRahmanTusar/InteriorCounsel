import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService } from '../../../core/services/commercial.service';

@Component({
  selector: 'wfm-vendors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendors.component.html',
})
export class VendorsComponent implements OnInit {
  private commercialService = inject(CommercialService);

  readonly vendors = signal<any[]>([]);
  readonly vendorBills = signal<any[]>([]);
  readonly loading = signal(false);

  // Modals
  readonly showModal = signal(false);
  readonly showDiscountModal = signal(false);
  readonly showHistoryModal = signal(false);
  readonly activeVendor = signal<any | null>(null);

  // New Vendor Form
  newVendor: any = {
    name: '',
    category: 'wood_board',
    phone: '',
    email: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    notes: '',
  };

  // Supplier Discount Form (Menu_RBAC Design)
  discountForm: any = {
    vendorBillId: '',
    type: 'Fixed',
    value: 0,
    date: new Date().toISOString().slice(0, 10),
    note: '',
  };

  ngOnInit() {
    this.loadVendors();
  }

  loadVendors() {
    this.loading.set(true);
    this.commercialService.getVendors().subscribe({
      next: (res) => {
        this.vendors.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreateModal() {
    this.newVendor = {
      name: '',
      category: 'wood_board',
      phone: '',
      email: '',
      bankAccountName: '',
      bankAccountNumber: '',
      bankName: '',
      notes: '',
    };
    this.showModal.set(true);
  }

  saveVendor() {
    if (!this.newVendor.name || !this.newVendor.name.trim()) {
      alert('Vendor Name is required');
      return;
    }

    const payload = {
      ...this.newVendor,
      name: this.newVendor.name.trim(),
      phone: (this.newVendor.phone || '').trim() || '01XXXXXXXXX',
      category: this.newVendor.category || 'general_supply',
      bankDetails: {
        bankName: this.newVendor.bankName || '',
        accountName: this.newVendor.bankAccountName || '',
        accountNumber: this.newVendor.bankAccountNumber || '',
      },
    };

    this.commercialService.createVendor(payload).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadVendors();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save vendor'),
    });
  }

  // --- Supplier Discount Handling (Odoo & Menu_RBAC Engine) ---
  openDiscountModal(vendor: any) {
    this.activeVendor.set(vendor);
    const vendorId = vendor._id || vendor.id;

    // Fetch confirmed bills for this vendor to give discount against
    this.commercialService.getVendorBills({ vendorId }).subscribe({
      next: (res) => {
        const bills = res.data || [];
        this.vendorBills.set(bills);
        this.discountForm = {
          vendorBillId: bills[0]?._id || '',
          type: 'Fixed',
          value: 0,
          date: new Date().toISOString().slice(0, 10),
          note: 'Supplier discount agreed on procurement',
        };
        this.showDiscountModal.set(true);
      },
    });
  }

  get selectedVendorBill(): any | null {
    return this.vendorBills().find((b) => b._id === this.discountForm.vendorBillId) || null;
  }

  get calculatedDiscountAmount(): number {
    const bill = this.selectedVendorBill;
    if (!bill) return 0;
    if (this.discountForm.type === 'Percent') {
      return Number(((bill.totalAmount * (this.discountForm.value || 0)) / 100).toFixed(2));
    }
    return Number((this.discountForm.value || 0).toFixed(2));
  }

  get remainingNetPurchase(): number {
    const bill = this.selectedVendorBill;
    if (!bill) return 0;
    const currentNet = Math.max(0, (bill.totalAmount || 0) - (bill.discountAmount || 0));
    return Math.max(0, currentNet - this.calculatedDiscountAmount);
  }

  applyDiscount() {
    if (!this.discountForm.vendorBillId) {
      alert('Please select a supplier bill / invoice');
      return;
    }

    if (this.calculatedDiscountAmount <= 0) {
      alert('Please enter a valid discount value');
      return;
    }

    const vendorId = this.activeVendor()._id || this.activeVendor().id;
    const payload = {
      vendorBillId: this.discountForm.vendorBillId,
      billNo: this.selectedVendorBill?.billNumber,
      supplierRef: this.selectedVendorBill?.billRef,
      type: this.discountForm.type,
      value: this.discountForm.value,
      date: this.discountForm.date,
      note: this.discountForm.note,
    };

    this.commercialService.applySupplierDiscount(vendorId, payload).subscribe({
      next: () => {
        alert('Supplier discount applied successfully!');
        this.showDiscountModal.set(false);
        this.loadVendors();
      },
      error: (err) => alert(err?.error?.message || 'Failed to apply supplier discount'),
    });
  }

  openHistory(vendor: any) {
    this.activeVendor.set(vendor);
    this.showHistoryModal.set(true);
  }

  reverseDiscount(discountId: string) {
    if (!confirm('Are you sure you want to reverse this supplier discount? The purchase payable will go back up.')) {
      return;
    }

    const vendorId = this.activeVendor()._id || this.activeVendor().id;
    this.commercialService.reverseSupplierDiscount(vendorId, discountId).subscribe({
      next: () => {
        this.showHistoryModal.set(false);
        this.loadVendors();
      },
      error: (err) => alert(err?.error?.message || 'Failed to reverse discount'),
    });
  }
}
