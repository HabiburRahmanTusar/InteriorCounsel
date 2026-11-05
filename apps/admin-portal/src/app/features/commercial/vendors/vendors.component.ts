import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommercialService } from '../../../core/services/commercial.service';

@Component({
  selector: 'wfm-vendors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendors.component.html',
})
export class VendorsComponent implements OnInit {
  private commercialService = inject(CommercialService);
  private toastr = inject(ToastrService);

  readonly vendors = signal<any[]>([]);
  readonly vendorBills = signal<any[]>([]);
  readonly masterBills = signal<any[]>([]);
  readonly selectedMasterBill = signal<any | null>(null);
  readonly loading = signal(false);

  // Modals
  readonly showModal = signal(false);
  readonly showDiscountModal = signal(false);
  readonly showHistoryModal = signal(false);
  readonly activeVendor = signal<any | null>(null);

  // Vendor Mode: user can register new vendor OR select existing vendor
  vendorMode: 'new' | 'existing' = 'new';
  selectedExistingVendorId = '';
  selectedMasterBillId = '';

  // Master Bill Line Items & Search
  readonly matchingBills = signal<any[]>([]);
  billSearch = '';
  billItems: any[] = [];
  billRef = '';

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
    this.loadMasterBills();
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

  loadMasterBills() {
    this.commercialService.getBills().subscribe({
      next: (res) => {
        this.masterBills.set(res.data || []);
      },
    });
  }

  openCreateModal() {
    this.vendorMode = 'new';
    this.selectedExistingVendorId = this.vendors()[0]?._id || '';
    this.selectedMasterBillId = '';
    this.billSearch = '';
    this.matchingBills.set([]);
    this.selectedMasterBill.set(null);
    this.billItems = [];
    this.billRef = '';
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

    // If exact match on billNumber (e.g. A748), immediately select and link!
    const exact = this.masterBills().find((b) => (b.billNumber || '').toLowerCase() === term);
    if (exact) {
      this.selectMasterBill(exact);
    }
  }

  selectMasterBill(bill: any): void {
    this.matchingBills.set([]);
    this.billSearch = bill.billNumber;
    this.selectedMasterBillId = bill._id;
    this.onMasterBillSelected(bill._id);
  }

  clearMasterBill(): void {
    this.billSearch = '';
    this.matchingBills.set([]);
    this.selectedMasterBillId = '';
    this.onMasterBillSelected('');
  }

  onMasterBillSelected(billId: string) {
    this.selectedMasterBillId = billId;
    if (!billId) {
      this.selectedMasterBill.set(null);
      this.billItems = [];
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
        const raw = res.data || bill?.items || [];
        this.billItems = raw.map((it: any) => ({
          description: it.description || '',
          unit: it.unit || 'pcs',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 0,
          amount: Number(((it.quantity || 1) * (it.unitPrice || 0)).toFixed(2)),
          isSelected: true,
        }));
      },
      error: () => {
        const raw = bill?.items || [];
        this.billItems = raw.map((it: any) => ({
          description: it.description || '',
          unit: it.unit || 'pcs',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 0,
          amount: Number(((it.quantity || 1) * (it.unitPrice || 0)).toFixed(2)),
          isSelected: true,
        }));
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
    this.billItems.push({
      description: '',
      unit: 'pcs',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      isSelected: true,
    });
  }

  removeItem(index: number) {
    this.billItems.splice(index, 1);
  }

  calculateItemAmount(item: any) {
    item.amount = Number(((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2));
  }

  get formItemsTotal(): number {
    return (this.billItems || [])
      .filter((i) => i.isSelected !== false)
      .reduce((acc, it) => acc + (it.amount || 0), 0);
  }

  get selectedItemsCount(): number {
    return (this.billItems || []).filter((i) => i.isSelected !== false).length;
  }

  saveVendorAndProcurement() {
    // If adding a new vendor, validate vendor details
    if (this.vendorMode === 'new') {
      if (!this.newVendor.name || !this.newVendor.name.trim()) {
        this.toastr.warning('Please enter Vendor / Supplier Name', 'Warning');
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
        next: (res: any) => {
          const created = res.data || res;
          const vendorId = created?._id || created?.id;
          this.toastr.success(`Vendor "${payload.name}" registered successfully`, 'Success');

          // If master sales bill or items exist, create vendor procurement bill
          const activeItems = this.billItems.filter((i) => i.isSelected !== false);
          if (this.selectedMasterBill() || activeItems.length > 0) {
            this.createProcurementBill(vendorId, payload.category);
          } else {
            this.showModal.set(false);
            this.loadVendors();
          }
        },
        error: (err) => {
          console.error(err);
          this.toastr.error(err?.error?.message || 'Failed to save vendor', 'Error');
        },
      });
    } else {
      // Existing vendor mode
      if (!this.selectedExistingVendorId) {
        this.toastr.warning('Please select an existing vendor', 'Warning');
        return;
      }

      const vendor = this.vendors().find((v) => v._id === this.selectedExistingVendorId);
      const category = vendor?.category || 'general_supply';

      const activeItems = this.billItems.filter((i) => i.isSelected !== false);
      if (this.selectedMasterBill() || activeItems.length > 0) {
        this.createProcurementBill(this.selectedExistingVendorId, category);
      } else {
        this.toastr.info('Existing vendor selected with no procurement bill created', 'Info');
        this.showModal.set(false);
      }
    }
  }

  saveVendor() {
    this.saveVendorAndProcurement();
  }

  private createProcurementBill(vendorId: string, category: string) {
    const selectedItems = this.billItems.filter((i) => i.isSelected !== false);
    const billData: any = {
      vendorId,
      billNumber: `VB-${Date.now().toString().slice(-6)}`,
      mainBillId: this.selectedMasterBill()?._id || undefined,
      billRef: this.billRef || `REF-${Date.now().toString().slice(-4)}`,
      category: category || 'wood_board',
      items: selectedItems.length > 0 ? selectedItems : this.billItems,
      status: 'Confirmed',
    };

    this.commercialService.createVendorBill(billData).subscribe({
      next: () => {
        this.toastr.success('Material purchase bill linked and saved successfully', 'Success');
        this.showModal.set(false);
        this.loadVendors();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error(err?.error?.message || 'Failed to create vendor bill', 'Error');
      },
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
      this.toastr.warning('Please select a supplier bill / invoice', 'Warning');
      return;
    }

    if (this.calculatedDiscountAmount <= 0) {
      this.toastr.warning('Please enter a valid discount value', 'Warning');
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
        this.toastr.success('Supplier discount applied successfully!', 'Success');
        this.showDiscountModal.set(false);
        this.loadVendors();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to apply supplier discount', 'Error');
      },
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
        this.toastr.success('Discount reversed successfully', 'Success');
        this.showHistoryModal.set(false);
        this.loadVendors();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to reverse discount', 'Error');
      },
    });
  }
}
