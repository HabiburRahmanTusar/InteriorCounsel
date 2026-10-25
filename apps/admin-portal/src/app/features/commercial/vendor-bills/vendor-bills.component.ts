import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService, VendorBill, BillItem } from '../../../core/services/commercial.service';

@Component({
  selector: 'wfm-vendor-bills',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-bills.component.html',
})
export class VendorBillsComponent implements OnInit {
  private commercialService = inject(CommercialService);

  readonly vendorBills = signal<VendorBill[]>([]);
  readonly vendors = signal<any[]>([]);
  readonly masterBills = signal<any[]>([]);
  readonly loading = signal(false);
  readonly showModal = signal(false);

  // Form State
  formBill: any = {
    billNumber: '',
    billRef: '',
    vendorId: '',
    mainBillId: '',
    category: 'wood_board',
    items: [],
  };

  ngOnInit() {
    this.loadVendorBills();
    this.loadVendors();
    this.loadMasterBills();
  }

  loadVendorBills() {
    this.loading.set(true);
    this.commercialService.getVendorBills().subscribe({
      next: (res) => {
        this.vendorBills.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadVendors() {
    this.commercialService.getVendors().subscribe({
      next: (res) => this.vendors.set(res.data || []),
    });
  }

  loadMasterBills() {
    this.commercialService.getBills({ status: 'Confirmed' }).subscribe({
      next: (res) => this.masterBills.set(res.data || []),
    });
  }

  // Odoo Feature: Product Line Mirroring from Master Sales Bill
  onMasterBillSelected(billId: string) {
    if (!billId) {
      this.formBill.items = [];
      return;
    }
    this.commercialService.getBillLinesForVendor(billId).subscribe({
      next: (res) => {
        this.formBill.items = res.data || [];
      },
    });
  }

  addItem() {
    this.formBill.items.push({
      description: '',
      unit: 'pcs',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      isSelected: true,
    });
  }

  removeItem(index: number) {
    this.formBill.items.splice(index, 1);
  }

  calculateItemAmount(item: BillItem) {
    item.amount = Number(((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2));
  }

  get formTotal(): number {
    return (this.formBill.items || [])
      .filter((i: any) => i.isSelected !== false)
      .reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
  }

  openCreateModal() {
    this.formBill = {
      billNumber: `VB-${Date.now().toString().slice(-4)}`,
      billRef: '',
      vendorId: this.vendors()[0]?._id || '',
      mainBillId: '',
      category: 'wood_board',
      items: [
        { description: '18mm Gorjan Ply Board', unit: 'sheets', quantity: 20, unitPrice: 2200, amount: 44000, isSelected: true },
      ],
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitVendorBill() {
    if (!this.formBill.vendorId || !this.formBill.billNumber) {
      alert('Please fill in Vendor and Bill Number');
      return;
    }

    this.commercialService.createVendorBill(this.formBill).subscribe({
      next: () => {
        this.closeModal();
        this.loadVendorBills();
      },
      error: (err) => alert(err?.error?.message || 'Failed to create vendor bill'),
    });
  }

  deleteVendorBill(id: string) {
    if (confirm('Delete this vendor bill?')) {
      this.commercialService.deleteVendorBill(id).subscribe({
        next: () => this.loadVendorBills(),
        error: (err) => alert(err?.error?.message || 'Failed to delete'),
      });
    }
  }
}
