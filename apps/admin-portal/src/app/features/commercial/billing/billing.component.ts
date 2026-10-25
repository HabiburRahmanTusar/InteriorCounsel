import { Component, OnInit, inject, signal, computed, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService, Bill, BillItem } from '../../../core/services/commercial.service';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';

export function takaInWords(n: number): string {
  n = Math.round(Math.abs(n || 0));
  if (!n) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? a[x] : t[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''));
  const three = (x: number) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const parts: [number, string][] = [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand'],
  ];
  const o: string[] = [];
  parts.forEach(([v, l]) => {
    if (n >= v) {
      const q = Math.floor(n / v);
      o.push(three(q) + ' ' + l);
      n %= v;
    }
  });
  if (n) o.push(three(n));
  return o.join(' ');
}

@Component({
  selector: 'wfm-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.component.html',
})
export class BillingComponent implements OnInit {
  private commercialService = inject(CommercialService);
  private authService = inject(AuthService);
  private employeeService = inject(EmployeeService);
  private eRef = inject(ElementRef);

  readonly currentUser = this.authService.currentUser;

  // View state: 'list' | 'new' | 'view'
  readonly mode = signal<'list' | 'new' | 'view'>('list');
  readonly activeTab = signal<'bills' | 'quotations'>('bills');

  readonly bills = signal<Bill[]>([]);
  readonly quotations = signal<any[]>([]);
  readonly clients = signal<any[]>([]);
  readonly suppliers = signal<any[]>([]);
  readonly products = signal<any[]>([]);
  readonly salespersons = signal<string[]>(['tusar', 'Abdul Ahad Khan', 'Mahmudul Hasan']);
  readonly activeBillSubTab = signal<'payments' | 'cashout' | 'vendorinfo'>('payments');
  readonly loading = signal(false);

  // Search & Filters
  searchQuery = '';
  statusFilter = '';
  paymentFilter = '';

  // Active / Selected invoice paper
  readonly activeInvoice = signal<any | null>(null);
  readonly isEditingBill = signal(false);
  readonly currentBillId = signal<string | null>(null);

  // Master Bill Form (Exact design from screenshot)
  formBill: any = {
    date: new Date().toISOString().slice(0, 10),
    billNumber: 'A747',
    salesperson: '',
    customerId: '',
    customerName: '',
    customerMobile: '',
    address: '',
    projectName: '',
    status: 'Draft',
    items: [
      { description: '', unit: 'sft', quantity: 1, unitPrice: 0, amount: 0, hint: '', hintCls: '' },
    ],
    otherCharges: [
      { name: 'Transport Charge', amount: 0 },
      { name: 'Fitting & Labor', amount: 0 },
    ],
    discountAmount: 0,
    paidAmount: 0,
  };

  // --- Inline Combobox State for Salesperson, Customer & Products ---
  readonly showSpDropdown = signal(false);
  readonly showCustDropdown = signal(false);
  readonly custHint = signal<{ text: string; cls: string }>({ text: '', cls: '' });
  readonly activeProductRow = signal<number | null>(null);

  // Bill Form Configuration (Matching Menu_RBAC BILL_CFG)
  billConfig = {
    allowNewSales: true,
    allowNewCust: true,
    allowNewProd: true,
    includeEmployees: true,
  };
  readonly showConfigModal = signal(false);

  // Toast Notification Message
  readonly toastMessage = signal<string | null>(null);
  private toastTimer: any;
  showToast(msg: string) {
    this.toastMessage.set(msg);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 3500);
  }

  saveBillConfig() {
    this.showConfigModal.set(false);
    this.showToast('Bill settings saved');
  }

  // Close comboboxes when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.cb-container-sp')) {
      this.showSpDropdown.set(false);
    }
    if (!target.closest('.cb-container-cust')) {
      this.showCustDropdown.set(false);
    }
    if (!target.closest('.cb-container-prod')) {
      this.activeProductRow.set(null);
    }
  }

  // Quotation Form
  readonly showQuotationModal = signal(false);
  formQuotation: any = {
    projectName: '',
    subject: 'Interior Decoration & Architectural Fit-out Quotation',
    customerId: '',
    validUntil: '',
    discountType: 'none',
    discountValue: 0,
    vatPercent: 0,
    termsAndConditions: '1. 50% Advance with confirmed work order.\n2. 40% on materials delivery.\n3. 10% after completion & handover.',
    notes: 'Price valid for 30 days from proposal date.',
    items: [
      { description: 'False Ceiling with Gypsum Board & Concealed Lighting', unit: 'sft', quantity: 350, unitPrice: 220, amount: 77000 },
    ],
  };

  ngOnInit() {
    this.loadBills();
    this.loadQuotations();
    this.loadClients();
    this.loadSuppliers();
    this.loadEmployees();
    this.loadProducts();
  }

  loadProducts() {
    this.commercialService.getProducts({ limit: 500 }).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
      },
    });
  }

  loadSuppliers() {
    this.commercialService.getVendors().subscribe({
      next: (res) => {
        this.suppliers.set(res.data || []);
      },
    });
  }

  loadBills() {
    this.loading.set(true);
    const params: any = {};
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.paymentFilter) params.paymentState = this.paymentFilter;

    this.commercialService.getBills(params).subscribe({
      next: (res) => {
        this.bills.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadQuotations() {
    this.commercialService.getQuotations().subscribe({
      next: (res) => {
        this.quotations.set(res.data || []);
      },
    });
  }

  loadClients() {
    this.commercialService.getClients().subscribe({
      next: (res) => {
        const list = res.data || [];
        this.clients.set(list);
      },
    });
  }

  loadEmployees() {
    this.employeeService.list({ limit: 100 }).subscribe({
      next: (res) => {
        const names = (res.data || []).map((e: any) => e.name).filter(Boolean);
        const set = new Set([...this.salespersons(), ...names]);
        this.salespersons.set(Array.from(set));
      },
    });
  }

  // --- Filtered Autocomplete Options ---
  readonly filteredSalespersons = computed(() => {
    const q = (this.formBill.salesperson || '').trim().toLowerCase();
    return this.salespersons().filter((sp) => !q || sp.toLowerCase().includes(q));
  });

  readonly canCreateNewSalesperson = computed(() => {
    if (!this.billConfig.allowNewSales) return false;
    const q = (this.formBill.salesperson || '').trim();
    if (!q) return false;
    return !this.salespersons().some((sp) => sp.toLowerCase() === q.toLowerCase());
  });

  readonly filteredClients = computed(() => {
    const q = (this.formBill.customerName || '').trim().toLowerCase();
    return this.clients().filter(
      (c) =>
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.companyName || c.company || '').toLowerCase().includes(q) ||
        (c.address || c.siteAddress || c.billingAddress || '').toLowerCase().includes(q)
    );
  });

  readonly canCreateNewCustomer = computed(() => {
    if (!this.billConfig.allowNewCust) return false;
    const q = (this.formBill.customerName || '').trim();
    if (!q) return false;
    return !this.clients().some((c) => (c.name || '').toLowerCase() === q.toLowerCase());
  });

  // --- Inline Creation Handlers (Matching Menu_RBAC cbPick) ---
  selectSalesperson(name: string) {
    this.formBill.salesperson = name;
    this.showSpDropdown.set(false);
  }

  createSalesperson(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!this.salespersons().includes(trimmed)) {
      this.salespersons.update((list) => [...list, trimmed]);
    }
    this.formBill.salesperson = trimmed;
    this.showSpDropdown.set(false);
    this.showToast(`Salesperson “${trimmed}” created`);
  }

  onSalespersonInput() {
    this.showSpDropdown.set(true);
  }

  onSalespersonBlur() {
    setTimeout(() => {
      this.showSpDropdown.set(false);
      const val = (this.formBill.salesperson || '').trim();
      if (val && !this.salespersons().includes(val)) {
        this.salespersons.update((list) => [...list, val]);
      }
    }, 200);
  }

  onSalespersonKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const matches = this.filteredSalespersons();
      if (matches.length > 0) {
        this.selectSalesperson(matches[0]);
      } else if (this.canCreateNewSalesperson()) {
        this.createSalesperson(this.formBill.salesperson);
      }
    } else if (e.key === 'Escape') {
      this.showSpDropdown.set(false);
    }
  }

  selectCustomer(client: any) {
    this.formBill.customerId = client._id;
    this.formBill.customerName = client.name;
    this.formBill.customerMobile = client.phone || this.formBill.customerMobile || '';
    this.formBill.address = client.address || client.siteAddress || client.billingAddress || this.formBill.address || '';
    this.custHint.set({
      text: 'Existing customer — mobile & address linked',
      cls: 'text-emerald-600',
    });
    this.showCustDropdown.set(false);
  }

  createCustomer(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.formBill.customerId = '';
    this.formBill.customerName = trimmed;
    // CRITICAL: Preserve customerMobile and address already typed on the form!
    this.custHint.set({
      text: `New customer “${trimmed}” — mobile number & address are kept on this form`,
      cls: 'text-amber-600 font-semibold',
    });
    this.showCustDropdown.set(false);
    this.showToast(`Customer “${trimmed}” created on form (mobile & address preserved)`);

    if (!this.formBill.customerMobile) {
      setTimeout(() => {
        const mobInput = document.getElementById('bf-mob') as HTMLInputElement;
        if (mobInput) mobInput.focus();
      }, 50);
    }
  }

  onCustomerInput() {
    this.showCustDropdown.set(true);
    const q = (this.formBill.customerName || '').trim().toLowerCase();
    const hit = this.clients().find((c) => (c.name || '').trim().toLowerCase() === q);
    if (hit) {
      this.formBill.customerId = hit._id;
      if (hit.phone) this.formBill.customerMobile = hit.phone;
      const addr = hit.address || hit.siteAddress || hit.billingAddress || '';
      if (addr) this.formBill.address = addr;
      this.custHint.set({
        text: 'Existing customer — mobile & address filled',
        cls: 'text-emerald-600',
      });
    } else {
      this.formBill.customerId = '';
      if (q) {
        this.custHint.set({
          text: `New customer “${this.formBill.customerName}” — enter or keep mobile number & address below`,
          cls: 'text-amber-600',
        });
      } else {
        this.custHint.set({ text: '', cls: '' });
      }
    }
  }

  onCustomerBlur() {
    setTimeout(() => {
      this.showCustDropdown.set(false);
      const val = (this.formBill.customerName || '').trim();
      if (!val) {
        this.formBill.customerId = '';
        this.custHint.set({ text: '', cls: '' });
        return;
      }
      const existing = this.clients().find(
        (c) => (c.name || '').trim().toLowerCase() === val.toLowerCase()
      );
      if (existing) {
        this.formBill.customerId = existing._id;
        if (!this.formBill.customerMobile && existing.phone) {
          this.formBill.customerMobile = existing.phone;
        }
        const addr = existing.address || existing.siteAddress || existing.billingAddress || '';
        if (!this.formBill.address && addr) {
          this.formBill.address = addr;
        }
        this.custHint.set({
          text: `Existing customer — ${existing.name}`,
          cls: 'text-blue-600',
        });
      } else {
        this.formBill.customerId = '';
        this.custHint.set({
          text: `New customer “${val}” — mobile & address will be saved with this bill`,
          cls: 'text-amber-600 font-semibold',
        });
      }
    }, 200);
  }

  onCustomerKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const matches = this.filteredClients();
      if (matches.length > 0) {
        this.selectCustomer(matches[0]);
      } else if (this.canCreateNewCustomer()) {
        this.createCustomer(this.formBill.customerName);
      }
    } else if (e.key === 'Escape') {
      this.showCustDropdown.set(false);
    }
  }

  // --- Product Autocomplete & Inline Creation for Bill Lines ---
  filteredProductsFor(query: string): any[] {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return this.products().slice(0, 30);
    }
    return this.products()
      .filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.internalRef || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      )
      .slice(0, 30);
  }

  canCreateNewProduct(query: string): boolean {
    if (!this.billConfig.allowNewProd) return false;
    const q = (query || '').trim().toLowerCase();
    if (!q) return false;
    return !this.products().some((p) => (p.name || '').trim().toLowerCase() === q);
  }

  onProductFocus(index: number) {
    this.activeProductRow.set(index);
  }

  onProductInput(index: number) {
    this.activeProductRow.set(index);
    const it = this.formBill.items[index];
    if (it) {
      const q = (it.description || '').trim().toLowerCase();
      const hit = this.products().find((p) => (p.name || '').trim().toLowerCase() === q);
      if (hit) {
        it.productId = hit._id;
        if (hit.salesPrice) it.unitPrice = hit.salesPrice;
        if (hit.unit) it.unit = hit.unit;
        it.hint = `Price from catalog: ৳ ${hit.salesPrice || 0}${hit.unit ? ' / ' + hit.unit : ''}`;
        it.hintCls = 'text-emerald-600 font-medium';
        this.calcBillItem(it);
      } else if (q) {
        it.productId = '';
        it.hint = `New product “${it.description}” — enter rate; saved to catalog`;
        it.hintCls = 'text-amber-600 font-medium';
      } else {
        it.hint = '';
        it.hintCls = '';
      }
    }
  }

  onProductBlur(index: number) {
    setTimeout(() => {
      if (this.activeProductRow() === index) {
        this.activeProductRow.set(null);
      }
    }, 200);
  }

  onProductKeydown(e: KeyboardEvent, index: number, it: any) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const matches = this.filteredProductsFor(it.description);
      if (matches.length > 0) {
        this.selectProduct(index, matches[0]);
      } else if (this.canCreateNewProduct(it.description)) {
        this.createProductForLine(index, it.description);
      }
    } else if (e.key === 'Escape') {
      this.activeProductRow.set(null);
    }
  }

  selectProduct(index: number, product: any) {
    const it = this.formBill.items[index];
    if (!it) return;
    it.description = product.name;
    it.productId = product._id;
    if (product.salesPrice !== undefined && product.salesPrice !== null) {
      it.unitPrice = product.salesPrice;
    }
    if (product.unit) {
      it.unit = product.unit;
    }
    it.hint = `Price from catalog: ৳ ${product.salesPrice || 0}${product.unit ? ' / ' + product.unit : ''}`;
    it.hintCls = 'text-emerald-600 font-medium';
    this.calcBillItem(it);
    this.activeProductRow.set(null);
  }

  createProductForLine(index: number, name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const it = this.formBill.items[index];
    if (it) {
      it.description = trimmed;
      it.hint = `New product “${trimmed}” created & saved to catalog`;
      it.hintCls = 'text-emerald-600 font-medium';
    }
    this.activeProductRow.set(null);

    const newProductPayload = {
      name: trimmed,
      salesPrice: it?.unitPrice || 0,
      cost: 0,
      unit: it?.unit || 'sft',
      productType: 'Storable Product',
      category: 'General',
    };

    this.commercialService.createProduct(newProductPayload).subscribe({
      next: (res) => {
        const created = res.data || res;
        this.products.update((list) => [...list, created]);
        if (it) {
          it.productId = created._id;
        }
        this.showToast(`Product “${trimmed}” created & added to catalog`);
      },
      error: (err) => {
        console.warn('Could not persist product to catalog', err);
        this.showToast(`Product “${trimmed}” added to invoice`);
      },
    });
  }

  // --- Navigation & View Switching ---
  openNewBill() {
    this.isEditingBill.set(false);
    this.currentBillId.set(null);
    this.loadProducts();
    const maxNum = this.bills().reduce((max, b) => {
      const n = parseInt(b.billNumber?.replace(/\D/g, '') || '0', 10);
      return n > max ? n : max;
    }, 746);
    const nextBillNo = `A${maxNum + 1}`;

    const user = this.currentUser();
    const salespersonName = user?.name || 'tusar';
    const defaultClient = this.clients()[0];

    this.formBill = {
      date: new Date().toISOString().slice(0, 10),
      billNumber: nextBillNo,
      salesperson: salespersonName,
      customerId: defaultClient?._id || '',
      customerName: defaultClient?.name || '',
      customerMobile: defaultClient?.phone || '',
      address: defaultClient?.address || '',
      projectName: '',
      status: 'Draft',
      items: [
        { description: '', unit: 'sft', quantity: 1, unitPrice: 0, amount: 0, hint: '', hintCls: '', supplierName: '', supplierInvoiceNo: '', purchaseAmount: 0, supplierDiscount: 0, netPurchase: 0 },
      ],
      otherCharges: [
        { name: 'Transport Charge', amount: 0 },
        { name: 'Fitting & Labor', amount: 0 },
      ],
      discountAmount: 0,
      paidAmount: 0,
    };

    if (defaultClient) {
      this.custHint.set({
        text: 'Existing customer — mobile & address filled',
        cls: 'text-emerald-600',
      });
    } else {
      this.custHint.set({ text: '', cls: '' });
    }

    this.mode.set('new');
  }

  backToList() {
    this.mode.set('list');
  }

  // --- Bill Lines Helpers ---
  addBillItem() {
    this.formBill.items.push({
      description: '',
      unit: 'sft',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      hint: '',
      hintCls: '',
      supplierName: '',
      supplierInvoiceNo: '',
      purchaseAmount: 0,
      supplierDiscount: 0,
      netPurchase: 0,
    });
  }

  removeBillItem(index: number) {
    if (this.formBill.items.length > 1) {
      this.formBill.items.splice(index, 1);
    }
  }

  calcBillItem(it: any) {
    it.amount = Number(((it.quantity || 0) * (it.unitPrice || 0)).toFixed(2));
  }

  addOtherCharge() {
    this.formBill.otherCharges.push({ name: '', amount: 0 });
  }

  removeOtherCharge(index: number) {
    this.formBill.otherCharges.splice(index, 1);
  }

  // --- Supplier Information Calculations ---
  calcSupplierRow(it: any) {
    const pa = Number(it.purchaseAmount) || 0;
    const sd = Number(it.supplierDiscount) || 0;
    it.netPurchase = Math.max(0, Number((pa - sd).toFixed(2)));
  }

  get totalPurchaseAmount(): number {
    return (this.formBill.items || []).reduce((acc: number, it: any) => acc + (Number(it.purchaseAmount) || 0), 0);
  }

  get totalSupplierDiscount(): number {
    return (this.formBill.items || []).reduce((acc: number, it: any) => acc + (Number(it.supplierDiscount) || 0), 0);
  }

  get netPurchaseAmount(): number {
    return Math.max(0, this.totalPurchaseAmount - this.totalSupplierDiscount);
  }

  get formBillProfit(): number {
    return Number((this.formGrandTotal - (this.formOtherChargesTotal + this.netPurchaseAmount)).toFixed(2));
  }

  isExistingSupplier(name: string): boolean {
    const q = (name || '').trim().toLowerCase();
    if (!q) return false;
    return this.suppliers().some((s) => (s.name || '').trim().toLowerCase() === q);
  }

  quickCreateSupplier(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    this.commercialService.createVendor({ name: trimmed, category: 'general_supply' }).subscribe({
      next: (res) => {
        const v = res.data || { name: trimmed };
        this.suppliers.update((list) => {
          const exists = list.some((s) => (s.name || '').trim().toLowerCase() === trimmed.toLowerCase());
          return exists ? list : [...list, v];
        });
        this.loadSuppliers();
        this.showToast(`Supplier “${trimmed}” created & registered in directory`);
      },
      error: () => {
        this.suppliers.update((list) => [...list, { name: trimmed }]);
        this.showToast(`Supplier “${trimmed}” added`);
      },
    });
  }

  get formSalesAmount(): number {
    return (this.formBill.items || []).reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
  }

  get formOtherChargesTotal(): number {
    return (this.formBill.otherCharges || []).reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
  }

  get formSubtotal(): number {
    return this.formSalesAmount + this.formOtherChargesTotal;
  }

  get formGrandTotal(): number {
    return Math.max(0, this.formSubtotal - (Number(this.formBill.discountAmount) || 0));
  }

  get formBalanceDue(): number {
    return Math.max(0, this.formGrandTotal - (Number(this.formBill.paidAmount) || 0));
  }

  submitBill(postDirectly = false) {
    if (!this.formBill.customerName) {
      alert('Please enter or select a Customer');
      return;
    }

    const payload: any = {
      billNumber: this.formBill.billNumber,
      date: this.formBill.date,
      customerId: this.formBill.customerId,
      customerName: this.formBill.customerName,
      customerMobile: this.formBill.customerMobile,
      salesperson: this.formBill.salesperson,
      projectName: this.formBill.projectName || `Project ${this.formBill.billNumber} — ${this.formBill.customerName}`,
      siteLocation: this.formBill.address,
      items: this.formBill.items.map((it: any) => ({
        description: it.description || 'Interior Fit-out Work',
        unit: it.unit || 'sft',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        amount: (it.quantity || 1) * (it.unitPrice || 0),
        supplierName: (it.supplierName || '').trim(),
        supplierInvoiceNo: (it.supplierInvoiceNo || '').trim(),
        purchaseAmount: Number(it.purchaseAmount) || 0,
        supplierDiscount: Number(it.supplierDiscount) || 0,
        netPurchase: Number(it.netPurchase) || Math.max(0, (Number(it.purchaseAmount) || 0) - (Number(it.supplierDiscount) || 0)),
      })),
      transportCharge: this.formBill.otherCharges.find((c: any) => /transport/i.test(c.name))?.amount || 0,
      fittingCharge: this.formBill.otherCharges.find((c: any) => /fitting|labor/i.test(c.name))?.amount || 0,
      salesCommission: this.formBill.otherCharges.find((c: any) => /commission/i.test(c.name))?.amount || 0,
      pattyBoxCharge: this.formBill.otherCharges.find((c: any) => /patty/i.test(c.name))?.amount || 0,
      discountType: this.formBill.discountAmount > 0 ? 'fixed' : 'none',
      discountValue: this.formBill.discountAmount || 0,
      discountAmount: this.formBill.discountAmount || 0,
      totalAmount: this.formGrandTotal,
      status: postDirectly ? 'Confirmed' : 'Draft',
      notes: `Salesperson: ${this.formBill.salesperson}`,
    };

    if (this.isEditingBill() && this.currentBillId()) {
      this.commercialService.updateBill(this.currentBillId()!, payload).subscribe({
        next: (res) => {
          const updated = res.data || res || { ...payload, _id: this.currentBillId() };
          this.showToast('Bill updated successfully!');
          this.isEditingBill.set(false);
          this.loadBills();
          this.loadClients();
          this.loadSuppliers();
          this.viewInvoice(updated);
        },
        error: (err) => alert(err?.error?.message || 'Failed to update bill'),
      });
    } else {
      this.commercialService.createBill(payload).subscribe({
        next: (res) => {
          const created = res.data || res || payload;
          this.showToast(postDirectly ? 'Bill posted and confirmed successfully!' : 'Bill saved as Draft!');
          this.loadBills();
          this.loadClients();
          this.loadSuppliers();
          this.viewInvoice(created);
        },
        error: (err) => alert(err?.error?.message || 'Failed to save bill'),
      });
    }
  }

  deleteBill(id: string) {
    if (confirm('Are you sure you want to delete this bill?')) {
      this.commercialService.deleteBill(id).subscribe({
        next: () => this.loadBills(),
        error: (err) => alert(err?.error?.message || 'Failed to delete bill'),
      });
    }
  }

  // --- KPIs from Menu_RBAC Design ---
  readonly totalSales = computed(() =>
    this.bills().reduce((acc, b) => acc + (b.totalAmount || 0), 0)
  );

  readonly totalReceived = computed(() =>
    this.bills().reduce((acc, b) => acc + (b.totalCashIn || 0), 0)
  );

  readonly totalDue = computed(() =>
    this.bills().reduce((acc, b) => acc + Math.max(0, (b.totalAmount || 0) - (b.totalCashIn || 0)), 0)
  );

  readonly paidInvoicesCount = computed(() =>
    this.bills().filter((b) => b.paymentState === 'paid' || b.status === 'Completed').length
  );

  readonly overdueInvoicesCount = computed(() =>
    this.bills().filter((b) => b.paymentState === 'not_paid' && b.status === 'Confirmed').length
  );

  // --- Quotations Management ---
  openNewQuotationModal() {
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    this.formQuotation = {
      projectName: '',
      subject: 'Interior Decoration & Architectural Fit-out Quotation',
      customerId: this.clients()[0]?._id || '',
      validUntil: nextMonth.toISOString().slice(0, 10),
      discountType: 'none',
      discountValue: 0,
      vatPercent: 0,
      termsAndConditions: '1. 50% Advance with confirmed work order.\n2. 40% on materials delivery.\n3. 10% after completion & handover.',
      notes: 'Price valid for 30 days from proposal date.',
      items: [
        { description: 'Premium HDF Kitchen Cabinet with Quartz Countertop', unit: 'rft', quantity: 24, unitPrice: 2800, amount: 67200 },
      ],
    };
    this.showQuotationModal.set(true);
  }

  addQuotationItem() {
    this.formQuotation.items.push({
      description: '',
      unit: 'sft',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    });
  }

  removeQuotationItem(index: number) {
    if (this.formQuotation.items.length > 1) {
      this.formQuotation.items.splice(index, 1);
    }
  }

  calcQuotationItem(item: any) {
    item.amount = Number(((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2));
  }

  get quotationSubtotal(): number {
    return (this.formQuotation.items || []).reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
  }

  get quotationDiscountAmount(): number {
    if (this.formQuotation.discountType === 'percent') {
      return Number(((this.quotationSubtotal * (this.formQuotation.discountValue || 0)) / 100).toFixed(2));
    }
    if (this.formQuotation.discountType === 'fixed') {
      return Number((this.formQuotation.discountValue || 0).toFixed(2));
    }
    return 0;
  }

  get quotationGrandTotal(): number {
    const afterDisc = Math.max(0, this.quotationSubtotal - this.quotationDiscountAmount);
    const vat = this.formQuotation.vatPercent ? (afterDisc * this.formQuotation.vatPercent) / 100 : 0;
    return Number((afterDisc + vat).toFixed(2));
  }

  submitQuotation() {
    if (!this.formQuotation.projectName || !this.formQuotation.customerId) {
      alert('Please enter a project name and select a client');
      return;
    }

    this.commercialService.createQuotation(this.formQuotation).subscribe({
      next: () => {
        this.showQuotationModal.set(false);
        this.loadQuotations();
      },
      error: (err) => alert(err?.error?.message || 'Failed to create quotation'),
    });
  }

  convertQuotation(q: any) {
    if (!confirm(`Convert Quotation ${q.quotationNumber} into a Confirmed Project Sales Bill?`)) {
      return;
    }

    this.commercialService.convertQuotationToBill(q._id).subscribe({
      next: () => {
        alert(`Quotation ${q.quotationNumber} successfully converted to Bill!`);
        this.loadQuotations();
        this.loadBills();
        this.activeTab.set('bills');
      },
      error: (err) => alert(err?.error?.message || 'Failed to convert quotation'),
    });
  }

  // --- Official Invoice Paper View & Print ---
  viewInvoice(b: any) {
    this.activeInvoice.set(b);
    this.mode.set('view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editBill(b: any) {
    if (!b) return;
    this.currentBillId.set(b._id || null);
    this.isEditingBill.set(true);

    const client = this.clients().find(
      (c) => (c._id && c._id === b.customerId?._id) || (c.name && c.name === b.customerName)
    );

    this.formBill = {
      _id: b._id,
      date: b.date ? new Date(b.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      billNumber: b.billNumber || '',
      salesperson: b.salesperson || b.salespersonId?.name || '',
      customerId: b.customerId?._id || b.customerId || '',
      customerName: b.customerName || b.customerId?.name || '',
      customerMobile: b.customerMobile || b.customerId?.phone || client?.phone || '',
      address: b.siteLocation || b.address || b.customerId?.address || client?.address || '',
      projectName: b.projectName || '',
      status: b.status || 'Draft',
      items: (b.items && b.items.length)
        ? b.items.map((it: any) => ({
            description: it.description || '',
            unit: it.unit || 'sft',
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 0,
            amount: it.amount || ((it.quantity || 1) * (it.unitPrice || 0)),
            hint: '',
            hintCls: '',
            supplierName: it.supplierName || '',
            supplierInvoiceNo: it.supplierInvoiceNo || '',
            purchaseAmount: it.purchaseAmount || 0,
            supplierDiscount: it.supplierDiscount || 0,
            netPurchase: it.netPurchase || 0,
          }))
        : [{ description: '', unit: 'sft', quantity: 1, unitPrice: 0, amount: 0, hint: '', hintCls: '', supplierName: '', supplierInvoiceNo: '', purchaseAmount: 0, supplierDiscount: 0, netPurchase: 0 }],
      otherCharges: [
        { name: 'Transport Charge', amount: b.transportCharge || 0 },
        { name: 'Fitting & Labor', amount: b.fittingCharge || 0 },
      ],
      discountAmount: b.discountAmount || 0,
      paidAmount: b.paidAmount || b.totalCashIn || 0,
    };

    this.mode.set('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getInvoiceTableRows(invoice: any): any[] {
    if (!invoice) return [];
    const items = (invoice.items || []).filter((it: any) => it.description || it.amount);
    const charges: any[] = [];
    if (invoice.transportCharge > 0) {
      charges.push({
        description: 'Transport & Logistics Charges',
        quantity: null,
        unitPrice: null,
        amount: invoice.transportCharge,
        isCharge: true,
      });
    }
    if (invoice.fittingCharge > 0) {
      charges.push({
        description: 'Fitting & Installation Charges',
        quantity: null,
        unitPrice: null,
        amount: invoice.fittingCharge,
        isCharge: true,
      });
    }
    const allLines = [...items, ...charges];
    const totalRowCount = Math.max(16, allLines.length);
    const rows: any[] = [];
    for (let i = 0; i < totalRowCount; i++) {
      if (i < allLines.length) {
        rows.push({
          sl: i + 1,
          ...allLines[i],
          isEmpty: false,
          isShaded: i % 2 === 1,
        });
      } else {
        rows.push({
          sl: '',
          description: '',
          quantity: null,
          unitPrice: null,
          amount: null,
          isEmpty: true,
          isShaded: i % 2 === 1,
        });
      }
    }
    return rows;
  }

  getPaymentsForActiveInvoice(): any[] {
    const inv = this.activeInvoice();
    if (!inv) return [];
    if (inv.payments && inv.payments.length > 0) {
      return inv.payments;
    }
    if (inv.totalCashIn > 0) {
      return [{
        date: inv.date,
        amount: inv.totalCashIn,
        journal: 'Cash',
        receivedBy: inv.salesperson || 'Admin',
        note: 'Customer Payment',
      }];
    }
    return [];
  }

  printInvoice() {
    window.print();
  }

  getTakaWords(amount: number): string {
    return takaInWords(amount);
  }

  getPayState(total: number, paid: number): { label: string; cls: string } {
    total = total || 0;
    paid = paid || 0;
    if (total > 0 && paid >= total) return { label: 'PAID', cls: 'paid' };
    if (paid > 0) return { label: 'PARTIAL PAYMENT', cls: 'part' };
    return { label: 'DUE', cls: 'due' };
  }

  hasSupplierInfo(invoice: any): boolean {
    if (!invoice || !invoice.items || !invoice.items.length) return false;
    return invoice.items.some((it: any) => (it.supplierName && it.supplierName.trim()) || (it.purchaseAmount && it.purchaseAmount > 0));
  }

  getSupplierTotalPurchase(invoice: any): number {
    if (!invoice || !invoice.items) return 0;
    return invoice.items.reduce((acc: number, it: any) => acc + (Number(it.purchaseAmount) || 0), 0);
  }

  getSupplierTotalDiscount(invoice: any): number {
    if (!invoice || !invoice.items) return 0;
    return invoice.items.reduce((acc: number, it: any) => acc + (Number(it.supplierDiscount) || 0), 0);
  }

  getSupplierTotalNet(invoice: any): number {
    return Math.max(0, this.getSupplierTotalPurchase(invoice) - this.getSupplierTotalDiscount(invoice));
  }
}
