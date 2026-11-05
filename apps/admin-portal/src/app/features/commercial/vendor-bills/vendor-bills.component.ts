import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService, VendorBill, BillItem } from '../../../core/services/commercial.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'wfm-vendor-bills',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-bills.component.html',
})
export class VendorBillsComponent implements OnInit {
  private commercialService = inject(CommercialService);
  private exportService = inject(ExportService);

  readonly vendorBills = signal<VendorBill[]>([]);
  readonly vendors = signal<any[]>([]);
  readonly masterBills = signal<any[]>([]);
  readonly selectedMasterBill = signal<any | null>(null);
  readonly matchingBills = signal<any[]>([]);
  billSearch = '';
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
    this.commercialService.getBills().subscribe({
      next: (res) => this.masterBills.set(res.data || []),
    });
  }

  onBillSearchChange(): void {
    const term = (this.billSearch || '').trim().toLowerCase();
    if (!term) {
      this.matchingBills.set([]);
      return;
    }

    const matches = this.masterBills().filter((b) => {
      const bNum = (b.billNumber || '').toLowerCase();
      const pName = (b.projectName || '').toLowerCase();
      const cName = this.getCustomerName(b).toLowerCase();
      return bNum.includes(term) || pName.includes(term) || cName.includes(term);
    });

    this.matchingBills.set(matches);

    // If exact match on billNumber, select and link immediately!
    const exact = this.masterBills().find((b) => (b.billNumber || '').toLowerCase() === term);
    if (exact) {
      this.selectMasterBill(exact);
    }
  }

  selectMasterBill(bill: any): void {
    this.matchingBills.set([]);
    this.billSearch = bill.billNumber;
    this.formBill.mainBillId = bill._id;
    this.onMasterBillSelected(bill._id);
  }

  clearMasterBill(): void {
    this.billSearch = '';
    this.matchingBills.set([]);
    this.formBill.mainBillId = '';
    this.onMasterBillSelected('');
  }

  // Odoo Feature: Product Line Mirroring from Master Sales Bill
  onMasterBillSelected(billId: string) {
    if (!billId) {
      this.selectedMasterBill.set(null);
      this.formBill.items = [];
      this.billSearch = '';
      this.matchingBills.set([]);
      return;
    }
    const bill = this.masterBills().find((b) => b._id === billId);
    this.selectedMasterBill.set(bill || null);
    if (bill && !this.billSearch) {
      this.billSearch = bill.billNumber;
    }
    this.matchingBills.set([]);

    this.commercialService.getBillLinesForVendor(billId).subscribe({
      next: (res) => {
        this.formBill.items = res.data || [];
      },
    });
  }

  getSalespersonName(bill: any): string {
    if (!bill) return 'System Admin';
    if (bill.salespersonId && typeof bill.salespersonId === 'object') {
      return bill.salespersonId.name || 'System Admin';
    }
    return bill.salespersonName || 'System Admin';
  }

  getCustomerName(bill: any): string {
    if (!bill) return 'General Client';
    if (bill.customerId && typeof bill.customerId === 'object') {
      return bill.customerId.name || bill.customerId.companyName || 'General Client';
    }
    return bill.customerName || 'General Client';
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
    this.billSearch = '';
    this.matchingBills.set([]);
    this.selectedMasterBill.set(null);
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

  exportExcel() {
    const list = this.vendorBills();
    if (!list || list.length === 0) {
      alert('No vendor purchase bills to export');
      return;
    }
    const rows = list.map((vb: any) => [
      vb.billNumber || vb.billRef || '—',
      vb.date ? new Date(vb.date).toISOString().slice(0, 10) : '—',
      vb.vendorId?.name || vb.vendorName || 'Supplier',
      vb.category || 'General',
      vb.totalAmount || 0,
      vb.paidAmount || 0,
      vb.dueAmount || ((vb.totalAmount || 0) - (vb.paidAmount || 0)) || 0,
      vb.paymentStatus || 'Pending',
    ]);
    this.exportService.exportToExcel({
      filename: 'InteriorCounsel_Vendor_Purchase_Bills',
      title: 'Supplier Purchase & Vendor Bills Register',
      subtitle: 'Total Bills: ' + rows.length,
      headers: ['Bill Number', 'Date', 'Supplier / Vendor', 'Category', 'Total Billed (BDT)', 'Paid (BDT)', 'Due (BDT)', 'Status'],
      rows,
    });
  }

  exportPdf() {
    const list = this.vendorBills();
    if (!list || list.length === 0) {
      alert('No vendor purchase bills to export');
      return;
    }
    const rows = list.map((vb: any) => [
      vb.billNumber || vb.billRef || '—',
      vb.date ? new Date(vb.date).toISOString().slice(0, 10) : '—',
      vb.vendorId?.name || vb.vendorName || 'Supplier',
      vb.category || 'General',
      (vb.totalAmount || 0).toLocaleString(),
      (vb.paidAmount || 0).toLocaleString(),
      (((vb.totalAmount || 0) - (vb.paidAmount || 0))).toLocaleString(),
      vb.paymentStatus || 'Pending',
    ]);
    this.exportService.exportToPdf({
      filename: 'InteriorCounsel_Vendor_Purchase_Bills',
      title: 'Supplier Purchase & Vendor Bills Register',
      subtitle: 'Total Purchase Invoices: ' + rows.length,
      headers: ['Bill No', 'Date', 'Supplier', 'Category', 'Total (Tk)', 'Paid (Tk)', 'Due (Tk)', 'Status'],
      rows,
      orientation: 'landscape',
    });
  }

}
