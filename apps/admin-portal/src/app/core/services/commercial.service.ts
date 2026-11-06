import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BillItem {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isSelected?: boolean;
}

export interface Bill {
  _id: string;
  billNumber: string;
  date: string;
  customerId: any;
  salespersonId: any;
  projectName: string;
  siteLocation?: string;
  items: BillItem[];
  subtotal: number;
  discountType: 'percent' | 'fixed' | 'none';
  discountValue: number;
  discountAmount: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  transportCharge: number;
  fittingCharge: number;
  salesCommission: number;
  pattyBoxCharge: number;
  salesReturn?: number;
  directCosts: number;
  vendorTotalPurchase: number;
  billProfit: number;
  totalCashIn: number;
  customerDue: number;
  paymentState: 'not_paid' | 'partial' | 'paid';
  status: 'Draft' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface VendorBill {
  _id: string;
  billNumber: string;
  billRef?: string;
  stockPurposeNumber?: string;
  date: string;
  vendorId: any;
  mainBillId?: any;
  category: string;
  items: BillItem[];
  totalAmount: number;
  paidAmount: number;
  vendorDue: number;
  paymentState: 'not_paid' | 'partial' | 'paid';
  status: 'Draft' | 'Confirmed' | 'Paid' | 'Cancelled';
  notes?: string;
}

export interface CashInRecord {
  _id: string;
  receiptNumber: string;
  date: string;
  type: 'customer_payment' | 'investment' | 'patty_return' | 'others';
  customerId?: any;
  billId?: any;
  amount: number;
  paymentMethod: string;
  receivedBy?: any;
  receivedByName?: string;
  notes?: string;
}

export interface CashOutRecord {
  _id: string;
  voucherNumber: string;
  date: string;
  type: string;
  amount: number;
  paymentMethod: string;
  vendorId?: any;
  vendorBillId?: any;
  billId?: any;
  employeeId?: any;
  shareholderId?: any;
  recipientName?: string;
  paidBy?: any;
  notes?: string;
}

export interface ShareholderWallet {
  _id: string;
  shareholderId: any;
  sharePercentage: number;
  totalDistributed: number;
  totalWithdrawn: number;
  currentBalance: number;
  transactions: Array<{
    date: string;
    type: 'distribution' | 'withdrawal';
    amount: number;
    month?: string;
    reference?: string;
    notes?: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class CommercialService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  // ---------------- Bills ----------------
  getBills(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/billing`, { params });
  }

  getBill(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/billing/${id}`);
  }

  getBillLinesForVendor(billId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/billing/${billId}/lines-for-vendor`);
  }

  createBill(data: Partial<Bill>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/billing`, data);
  }

  updateBill(id: string, data: Partial<Bill>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/billing/${id}`, data);
  }

  deleteBill(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/billing/${id}`);
  }

  // ---------------- Vendor Bills ----------------
  getVendorBills(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/vendor-bills`, { params });
  }

  getVendorBill(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/vendor-bills/${id}`);
  }

  createVendorBill(data: Partial<VendorBill>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vendor-bills`, data);
  }

  updateVendorBill(id: string, data: Partial<VendorBill>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/vendor-bills/${id}`, data);
  }

  deleteVendorBill(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/vendor-bills/${id}`);
  }

  // ---------------- Clients & Vendors ----------------
  getClients(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/clients`, { params });
  }

  createClient(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/clients`, data);
  }

  getVendors(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/vendors`, { params });
  }

  createVendor(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vendors`, data);
  }

  // ---------------- Cash Flow ----------------
  getCashIn(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cash-flow/in`, { params });
  }

  recordCashIn(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cash-flow/in`, data);
  }

  getCashOut(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cash-flow/out`, { params });
  }

  recordCashOut(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cash-flow/out`, data);
  }

  // ---------------- Shareholder Wallets & Profit ----------------
  getShareholders(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/shareholders`);
  }

  getWallet(shareholderId?: string): Observable<any> {
    const url = shareholderId
      ? `${this.baseUrl}/shareholders/wallet/${shareholderId}`
      : `${this.baseUrl}/shareholders/wallet`;
    return this.http.get<any>(url);
  }

  registerShareholder(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/shareholders`, data);
  }

  removeShareholder(shareholderId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/shareholders/${shareholderId}`);
  }

  updateSharePercentage(shareholderId: string, sharePercentage: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/shareholders/percentage/${shareholderId}`, { sharePercentage });
  }

  getMonthlyProfit(month?: string): Observable<any> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<any>(`${this.baseUrl}/shareholders/monthly-profit`, { params });
  }

  distributeProfit(month: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/shareholders/distribute-profit`, { month });
  }

  getShareholderPortalSummary(shareholderId?: string): Observable<any> {
    let params = new HttpParams();
    if (shareholderId) params = params.set('shareholderId', shareholderId);
    return this.http.get<any>(`${this.baseUrl}/shareholders/portal-summary`, { params });
  }

  requestShareholderWithdrawal(payload: {
    shareholderId?: string;
    amount: number;
    paymentMethod: string;
    bankName?: string;
    chequeNumber?: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/shareholders/request-withdrawal`, payload);
  }

  // ---------------- Quotations ----------------
  getQuotations(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/quotations`, { params });
  }

  getQuotation(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/quotations/${id}`);
  }

  createQuotation(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/quotations`, data);
  }

  updateQuotation(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/quotations/${id}`, data);
  }

  deleteQuotation(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/quotations/${id}`);
  }

  convertQuotationToBill(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/quotations/${id}/convert-to-bill`, {});
  }

  // ---------------- Supplier Discounts ----------------
  applySupplierDiscount(vendorId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vendors/${vendorId}/discounts`, data);
  }

  reverseSupplierDiscount(vendorId: string, discountId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/vendors/${vendorId}/discounts/${discountId}`);
  }

  // ---------------- Products & Inventory ----------------
  getProducts(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/products`, { params });
  }

  getProduct(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/products/${id}`);
  }

  createProduct(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/products`, data);
  }

  updateProduct(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/products/${id}`, data);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/products/${id}`);
  }

  // ---------------- Bank / Cash Transfers ----------------
  getTransfers(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/transfers`, { params });
  }

  getTransfer(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/transfers/${id}`);
  }

  createTransfer(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/transfers`, data);
  }

  deleteTransfer(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/transfers/${id}`);
  }

  // ---------------- Financial Dashboard ----------------
  getFinancialSummary(period: string = 'this_month'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get<any>(`${this.baseUrl}/financial-analytics/summary`, { params });
  }

  // ---------------- Projects ----------------
  getProjects(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects`, { params });
  }

  getProject(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${id}`);
  }

  createProject(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/projects`, data);
  }

  updateProject(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/projects/${id}`, data);
  }

  deleteProject(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/projects/${id}`);
  }
}

