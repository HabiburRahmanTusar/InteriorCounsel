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
  readonly showDetailsModal = signal(false);
  readonly selectedBillForDetails = signal<any | null>(null);

  viewDetails(bill: any) {
    this.selectedBillForDetails.set(bill);
    this.showDetailsModal.set(true);
  }

  // Form State
  formBill: any = {
    billNumber: '',
    billRef: '',
    vendorId: '',
    mainBillId: '',
    category: 'wood_board',
    discountAmount: 0,
    items: [],
  };

  // Quick Vendor Modal
  readonly showVendorModal = signal(false);
  quickVendor: any = {
    name: '',
    category: 'wood_board',
    phone: '',
    email: '',
    address: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    branch: '',
    notes: '',
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

  // Product Line Mirroring from Master Sales Bill
  onMasterBillSelected(billId: string) {
    if (!billId) {
      this.selectedMasterBill.set(null);
      this.formBill.mainBillId = '';
      this.formBill.items = [];
      this.billSearch = '';
      this.matchingBills.set([]);
      return;
    }

    this.formBill.mainBillId = billId;
    const bill = this.masterBills().find((b) => b._id === billId || b.id === billId || (b.billNumber && b.billNumber.toLowerCase() === billId.toLowerCase()));
    this.selectedMasterBill.set(bill || null);
    if (bill && !this.billSearch) {
      this.billSearch = bill.billNumber;
    }
    this.matchingBills.set([]);

    const mapItems = (items: any[]) => items.map((it: any) => ({
      description: it.description || '',
      unit: it.unit || 'pcs',
      quantity: Number(it.quantity) || 1,
      unitPrice: it.purchaseAmount && it.quantity ? Number((it.purchaseAmount / it.quantity).toFixed(2)) : (Number(it.unitPrice) || 0),
      amount: Number((Number(it.purchaseAmount) || Number(it.amount) || ((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0))).toFixed(2)),
      isSelected: true,
    }));

    // 1. Immediately mirror lines if cached on the bill object
    if (bill && Array.isArray(bill.items) && bill.items.length > 0) {
      this.formBill.items = mapItems(bill.items);
    }

    // 2. Fetch full bill by ID to ensure complete and up-to-date products
    this.commercialService.getBillById(billId).subscribe({
      next: (res: any) => {
        const fullBill = res.data || res;
        if (fullBill && Array.isArray(fullBill.items) && fullBill.items.length > 0) {
          this.formBill.items = mapItems(fullBill.items);
        }
      },
      error: () => {
        // Fallback to getBillLinesForVendor
        this.commercialService.getBillLinesForVendor(billId).subscribe({
          next: (r: any) => {
            const lines = r?.data || r || [];
            if (Array.isArray(lines) && lines.length > 0) {
              this.formBill.items = mapItems(lines);
            }
          },
        });
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

  get formNetAmount(): number {
    return Math.max(0, Number((this.formTotal - (Number(this.formBill.discountAmount) || 0)).toFixed(2)));
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
      discountAmount: 0,
      items: [
        { description: '18mm Gorjan Ply Board', unit: 'sheets', quantity: 20, unitPrice: 2200, amount: 44000, isSelected: true },
      ],
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  openQuickVendorModal() {
    this.quickVendor = {
      name: '',
      category: this.formBill.category || 'wood_board',
      phone: '',
      email: '',
      address: '',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      branch: '',
      notes: '',
    };
    this.showVendorModal.set(true);
  }

  saveQuickVendor() {
    if (!this.quickVendor.name || !this.quickVendor.name.trim()) {
      alert('Please enter Vendor / Supplier Name');
      return;
    }
    if (!this.quickVendor.phone || !this.quickVendor.phone.trim()) {
      alert('Please enter Contact Phone Number');
      return;
    }

    const payload = {
      name: this.quickVendor.name.trim(),
      category: this.quickVendor.category || 'general_supply',
      phone: this.quickVendor.phone.trim(),
      email: (this.quickVendor.email || '').trim(),
      address: (this.quickVendor.address || '').trim(),
      bankDetails: {
        bankName: (this.quickVendor.bankName || '').trim(),
        accountName: (this.quickVendor.bankAccountName || '').trim(),
        accountNumber: (this.quickVendor.bankAccountNumber || '').trim(),
        branch: (this.quickVendor.branch || '').trim(),
      },
      notes: (this.quickVendor.notes || '').trim(),
    };

    this.commercialService.createVendor(payload).subscribe({
      next: (res: any) => {
        const created = res.data || res;
        this.loadVendors();
        if (created?._id) {
          this.formBill.vendorId = created._id;
        }
        this.showVendorModal.set(false);
      },
      error: (err) => alert(err?.error?.message || 'Failed to save vendor'),
    });
  }

  submitVendorBill() {
    if (!this.formBill.vendorId || !this.formBill.billNumber) {
      alert('Please fill in Vendor and Bill Number');
      return;
    }

    const payload = {
      ...this.formBill,
      totalAmount: this.formTotal,
      discountAmount: Number(this.formBill.discountAmount) || 0,
      netAmount: this.formNetAmount,
      vendorDue: this.formNetAmount,
    };

    this.commercialService.createVendorBill(payload).subscribe({
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
      vb.vendorId?.name || vb.vendorName || 'Supplier',
      vb.vendorId?.phone || '-',
      vb.totalAmount || 0,
      vb.paidAmount || 0,
      vb.vendorDue !== undefined ? vb.vendorDue : Math.max(0, (vb.totalAmount || 0) - (vb.discountAmount || 0) - (vb.paidAmount || 0)),
      vb.billNumber || vb.billRef || '-',
      vb.date ? new Date(vb.date).toISOString().slice(0, 10) : '-',
      vb.paymentState || 'not_paid',
    ]);
    this.exportService.exportToExcel({
      filename: 'InteriorCounsel_Vendor_Purchase_Bills',
      title: 'Supplier Purchase & Vendor Bills Register',
      subtitle: 'Total Bills: ' + rows.length,
      headers: ['Supplier Name', 'Contact Phone', 'Total Purchased (BDT)', 'Total Payment (BDT)', 'Outstanding Due (BDT)', 'Bill No', 'Date', 'Status'],
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
      vb.vendorId?.name || vb.vendorName || 'Supplier',
      vb.vendorId?.phone || '—',
      (vb.totalAmount || 0).toLocaleString(),
      (vb.paidAmount || 0).toLocaleString(),
      (vb.vendorDue !== undefined ? vb.vendorDue : Math.max(0, (vb.totalAmount || 0) - (vb.discountAmount || 0) - (vb.paidAmount || 0))).toLocaleString(),
      vb.billNumber || vb.billRef || '—',
    ]);
    this.exportService.exportToPdf({
      filename: 'InteriorCounsel_Vendor_Purchase_Bills',
      title: 'Supplier Purchase & Vendor Bills Register',
      subtitle: 'Total Purchase Invoices: ' + rows.length,
      headers: ['Supplier Name', 'Contact', 'Total Purchased (Tk)', 'Total Payment (Tk)', 'Outstanding Due (Tk)', 'Bill No'],
      rows,
      orientation: 'landscape',
    });
  }

}
