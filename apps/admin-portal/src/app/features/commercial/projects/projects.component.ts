import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommercialService } from '../../../core/services/commercial.service';
import { ExportService } from '../../../core/services/export.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { takaInWords } from '../billing/billing.component';

export interface Project {
  _id?: string;
  projectId: string;
  name: string;
  customer: string;
  customerId?: string;
  type: string;
  manager: string;
  designer: string;
  loc: string;
  budget: number;
  spent: number;
  received: number;
  progress: number;
  status: string;
  priority: string;
  start?: string;
  expected?: string;
  notes?: string;
}

export const WORK_LOCATIONS = [
  'Mohakhali',
  'Gulshan',
  'Banani',
  'Uttara',
  'Dhanmondi',
  'Bashundhara',
  'Motijheel',
  'Mirpur',
];

export const PROJ_TYPES = [
  'Residential',
  'Commercial',
  'Office',
  'Restaurant',
  'Showroom',
  'Hotel',
  'Retail',
  'Corporate',
];

export const PROJ_STATUS = [
  'Planning',
  'Quotation',
  'Approved',
  'In Progress',
  'On Hold',
  'Completed',
  'Cancelled',
];

const INITIAL_PROJECTS: Project[] = [
  {
    projectId: 'IC-P-001',
    name: 'Gulshan Residence Interior',
    customer: 'Green Valley Interior Ltd.',
    type: 'Residential',
    manager: 'Ruhul Amin',
    designer: 'Fatema Akter',
    loc: 'Gulshan',
    budget: 1850000,
    spent: 1210000,
    received: 1350000,
    progress: 65,
    status: 'In Progress',
    priority: 'High',
    start: '2026-02-10',
    expected: '2026-05-30',
  },
  {
    projectId: 'IC-P-002',
    name: 'Banani Executive Corporate Office',
    customer: 'Skyline Developments',
    type: 'Office',
    manager: 'Mehedi Hasan',
    designer: 'Sultana Rehana',
    loc: 'Banani',
    budget: 3200000,
    spent: 980000,
    received: 1600000,
    progress: 40,
    status: 'In Progress',
    priority: 'High',
    start: '2026-03-01',
    expected: '2026-07-15',
  },
  {
    projectId: 'IC-P-003',
    name: 'Dhanmondi Duplex Renovation',
    customer: 'Urban Nest Builders Ltd.',
    type: 'Residential',
    manager: 'Arif Hossain',
    designer: 'Fatema Akter',
    loc: 'Dhanmondi',
    budget: 1450000,
    spent: 1420000,
    received: 1450000,
    progress: 100,
    status: 'Completed',
    priority: 'Medium',
    start: '2025-11-15',
    expected: '2026-02-28',
  },
  {
    projectId: 'IC-P-004',
    name: 'Uttara Fashion Boutique Showroom',
    customer: 'Pearl Design Studio',
    type: 'Showroom',
    manager: 'Ruhul Amin',
    designer: 'Sultana Rehana',
    loc: 'Uttara',
    budget: 950000,
    spent: 150000,
    received: 300000,
    progress: 20,
    status: 'Quotation',
    priority: 'Medium',
    start: '2026-04-01',
    expected: '2026-06-15',
  },
  {
    projectId: 'IC-P-005',
    name: 'Mohakhali Tech Hub Workspace',
    customer: 'Metro Properties Ltd.',
    type: 'Commercial',
    manager: 'Mehedi Hasan',
    designer: 'Fatema Akter',
    loc: 'Mohakhali',
    budget: 2750000,
    spent: 2450000,
    received: 2750000,
    progress: 100,
    status: 'Completed',
    priority: 'Low',
    start: '2025-10-01',
    expected: '2026-01-20',
  },
];

@Component({
  selector: 'wfm-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projects.component.html',
})
export class ProjectsComponent implements OnInit {
  private commercialService = inject(CommercialService);
  private exportService = inject(ExportService);
  private employeeService = inject(EmployeeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly locations = WORK_LOCATIONS;
  readonly types = PROJ_TYPES;
  readonly statuses = PROJ_STATUS;

  readonly projects = signal<Project[]>(INITIAL_PROJECTS);
  readonly clients = signal<any[]>([]);
  readonly managers = signal<string[]>([]);
  readonly designers = signal<string[]>([]);
  readonly quotations = signal<any[]>([]);
  readonly bills = signal<any[]>([]);

  // View state: 'list' | 'profile'
  readonly mode = signal<'list' | 'profile'>('list');
  readonly selectedProject = signal<Project | null>(null);
  readonly activeProfileTab = signal<'Overview' | 'Sales' | 'Timeline' | 'Tasks' | 'Materials' | 'Team'>('Overview');

  // Search & Filter
  searchQuery = '';
  statusFilter = '';
  typeFilter = '';

  // Project Modal State
  readonly showProjectModal = signal(false);
  isEditingProject = false;
  projectForm: Project = {
    projectId: '',
    name: '',
    customer: '',
    type: 'Residential',
    manager: '',
    designer: '',
    loc: 'Mohakhali',
    budget: 0,
    spent: 0,
    received: 0,
    progress: 0,
    status: 'Planning',
    priority: 'Medium',
    start: new Date().toISOString().slice(0, 10),
    expected: '',
    notes: '',
  };

  // Quotation Modal & View State
  readonly showQuotationModal = signal(false);
  readonly showQuotationPaper = signal(false);
  readonly activeQuotation = signal<any | null>(null);
  readonly toastMessage = signal<string | null>(null);

  quotationForm: any = {
    quotationNumber: '',
    date: new Date().toISOString().slice(0, 10),
    validUntil: '',
    subject: 'Interior Decoration & Architectural Fit-out Quotation',
    customerId: '',
    customerName: '',
    projectId: '',
    projectName: '',
    discountType: 'none',
    discountValue: 0,
    vatPercent: 0,
    termsAndConditions: '1. 50% Advance with confirmed work order.\n2. 40% on materials delivery.\n3. 10% after completion & handover.',
    notes: 'Price valid for 30 days from proposal date.',
    items: [
      { description: 'False Ceiling with Gypsum Board & Concealed Lighting', unit: 'sft', quantity: 350, unitPrice: 220, amount: 77000 },
      { description: 'Premium HDF Board Wall Paneling with Duco Finish', unit: 'sft', quantity: 240, unitPrice: 380, amount: 91200 },
    ],
  };

  ngOnInit() {
    this.loadProjects();
    this.loadClients();
    this.loadEmployees();
    this.loadQuotations();
    this.loadBills();
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  loadProjects() {
    this.commercialService.getProjects().subscribe({
      next: (res) => {
        if (res && res.data && res.data.length) {
          this.projects.set(res.data);
        } else {
          // If no direct projects, derive real projects from actual bills
          this.commercialService.getBills().subscribe({
            next: (bRes) => {
              const bills = bRes?.data || [];
              if (bills.length > 0) {
                const derivedProjects: Project[] = bills.map((b: any, idx: number) => ({
                  _id: b._id,
                  projectId: `IC-P-${String(idx + 1).padStart(3, '0')}`,
                  name: b.projectName || `Project ${b.billNumber} — ${b.customerId?.name || 'Customer'}`,
                  customer: b.customerId?.name || 'Valued Client',
                  customerId: b.customerId?._id || b.customerId,
                  type: 'Interior Fit-out',
                  manager: b.salespersonId?.name || 'System Admin',
                  designer: 'Interior Counsel Design Team',
                  loc: b.siteLocation || 'Dhaka',
                  budget: b.totalAmount || 0,
                  spent: b.vendorTotalPurchase || b.directCosts || 0,
                  received: b.totalCashIn || 0,
                  progress: b.paymentState === 'paid' ? 100 : b.paymentState === 'partial' ? 65 : 25,
                  status: b.status === 'Completed' ? 'Completed' : 'In Progress',
                  priority: 'High',
                  start: b.date ? new Date(b.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                  expected: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
                  notes: b.notes || '',
                }));
                this.projects.set(derivedProjects);
                this.saveProjectsLocal();
              } else {
                const saved = localStorage.getItem('ic_erp_projects');
                if (saved) {
                  try {
                    this.projects.set(JSON.parse(saved));
                  } catch {}
                }
              }
            },
            error: () => {
              const saved = localStorage.getItem('ic_erp_projects');
              if (saved) {
                try {
                  this.projects.set(JSON.parse(saved));
                } catch {}
              }
            }
          });
        }
      },
      error: () => {
        const saved = localStorage.getItem('ic_erp_projects');
        if (saved) {
          try {
            this.projects.set(JSON.parse(saved));
          } catch {}
        }
      },
    });
  }

  saveProjectsLocal() {
    try {
      localStorage.setItem('ic_erp_projects', JSON.stringify(this.projects()));
    } catch {}
  }

  loadClients() {
    this.commercialService.getClients().subscribe({
      next: (res) => this.clients.set(res.data || []),
    });
  }

  loadEmployees() {
    this.employeeService.list({ limit: 100 }).subscribe({
      next: (res) => {
        const all = res.data || [];
        const mgs = all
          .filter((e: any) => /project|manage|operat/i.test(e.department || e.designation || ''))
          .map((e: any) => e.name);
        const dgs = all
          .filter((e: any) => /design|arch/i.test(e.department || e.designation || ''))
          .map((e: any) => e.name);

        this.managers.set(mgs.length ? mgs : ['Ruhul Amin', 'Mehedi Hasan', 'Arif Hossain']);
        this.designers.set(dgs.length ? dgs : ['Fatema Akter', 'Sultana Rehana', 'Nasrin Jahan']);
      },
    });
  }

  loadQuotations() {
    this.commercialService.getQuotations().subscribe({
      next: (res) => this.quotations.set(res.data || []),
    });
  }

  loadBills() {
    this.commercialService.getBills().subscribe({
      next: (res) => this.bills.set(res.data || []),
    });
  }

  // --- Filtered Projects ---
  readonly filteredProjects = computed(() => {
    let list = this.projects();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.customer.toLowerCase().includes(q) ||
          p.projectId.toLowerCase().includes(q) ||
          p.loc.toLowerCase().includes(q)
      );
    }
    if (this.statusFilter && this.statusFilter !== 'All Status') {
      list = list.filter((p) => p.status === this.statusFilter);
    }
    if (this.typeFilter && this.typeFilter !== 'All Types') {
      list = list.filter((p) => p.type === this.typeFilter);
    }
    return list;
  });

  // KPIs
  readonly totalProjectsCount = computed(() => this.projects().length);
  readonly inProgressCount = computed(
    () => this.projects().filter((p) => p.status === 'In Progress').length
  );
  readonly completedCount = computed(
    () => this.projects().filter((p) => p.status === 'Completed').length
  );
  readonly totalBudgetSum = computed(() =>
    this.projects().reduce((acc, p) => acc + (p.budget || 0), 0)
  );

  // --- Project CRUD ---
  openNewProjectModal() {
    this.isEditingProject = false;
    const count = this.projects().length + 1;
    this.projectForm = {
      projectId: `IC-P-${String(count).padStart(3, '0')}`,
      name: '',
      customer: this.clients()[0]?.name || '',
      type: 'Residential',
      manager: this.managers()[0] || 'Ruhul Amin',
      designer: this.designers()[0] || 'Fatema Akter',
      loc: 'Mohakhali',
      budget: 0,
      spent: 0,
      received: 0,
      progress: 0,
      status: 'Planning',
      priority: 'Medium',
      start: new Date().toISOString().slice(0, 10),
      expected: '',
      notes: '',
    };
    this.showProjectModal.set(true);
  }

  editProject(p: Project) {
    this.isEditingProject = true;
    this.projectForm = { ...p };
    this.showProjectModal.set(true);
  }

  saveProject() {
    if (!this.projectForm.name.trim() || !this.projectForm.customer.trim()) {
      alert('Please fill in Project Name and Customer');
      return;
    }

    if (this.isEditingProject) {
      this.projects.update((list) =>
        list.map((p) => (p.projectId === this.projectForm.projectId ? { ...this.projectForm } : p))
      );
      if (this.selectedProject()?.projectId === this.projectForm.projectId) {
        this.selectedProject.set({ ...this.projectForm });
      }
      this.saveProjectsLocal();

      if (this.projectForm._id) {
        this.commercialService.updateProject(this.projectForm._id, this.projectForm).subscribe();
      }
      this.showToast(`Project “${this.projectForm.name}” updated`);
    } else {
      const created = { ...this.projectForm };
      this.projects.update((list) => [created, ...list]);
      this.saveProjectsLocal();

      this.commercialService.createProject(created).subscribe({
        next: (res) => {
          if (res?.data?._id) created._id = res.data._id;
          this.saveProjectsLocal();
        },
      });
      this.showToast(`Project “${created.name}” created`);
    }

    this.showProjectModal.set(false);
  }

  deleteProject(p: Project) {
    if (confirm(`Are you sure you want to delete project “${p.name}”?`)) {
      this.projects.update((list) => list.filter((x) => x.projectId !== p.projectId));
      this.saveProjectsLocal();
      if (p._id) {
        this.commercialService.deleteProject(p._id).subscribe();
      }
      if (this.selectedProject()?.projectId === p.projectId) {
        this.mode.set('list');
        this.selectedProject.set(null);
      }
      this.showToast(`Project “${p.name}” deleted`);
    }
  }

  // --- Project Profile Navigation ---
  viewProjectProfile(p: Project, defaultTab: 'Overview' | 'Sales' = 'Overview') {
    this.selectedProject.set(p);
    this.activeProfileTab.set(defaultTab);
    this.mode.set('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToList() {
    this.mode.set('list');
    this.selectedProject.set(null);
  }

  // --- Quotations for Active Project ---
  readonly projectQuotations = computed(() => {
    const p = this.selectedProject();
    if (!p) return [];
    return this.quotations().filter(
      (q) =>
        (q.projectId && q.projectId === p._id) ||
        (q.projectName && q.projectName.toLowerCase() === p.name.toLowerCase()) ||
        (q.customerId?.name && q.customerId.name.toLowerCase() === p.customer.toLowerCase())
    );
  });

  readonly projectInvoices = computed(() => {
    const p = this.selectedProject();
    if (!p) return [];
    return this.bills().filter(
      (b) =>
        (b.projectName && b.projectName.toLowerCase().includes(p.name.toLowerCase())) ||
        (b.customerName && b.customerName.toLowerCase() === p.customer.toLowerCase())
    );
  });

  readonly projectQuotedTotal = computed(() =>
    this.projectQuotations().reduce((acc, q) => acc + (q.totalAmount || 0), 0)
  );

  // --- Quotation Builder inside Project ---
  openNewQuotationModal(p?: Project) {
    const project = p || this.selectedProject();
    const count = this.quotations().length + 1;
    const year = new Date().getFullYear();
    const nextQtNo = `QT-${year}-${String(count).padStart(4, '0')}`;
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const client = this.clients().find(
      (c) => c.name?.toLowerCase() === (project?.customer || '').toLowerCase()
    ) || this.clients()[0];

    this.quotationForm = {
      quotationNumber: nextQtNo,
      date: new Date().toISOString().slice(0, 10),
      validUntil: nextMonth,
      subject: `Interior Decoration & Architectural Fit-out Proposal for ${project?.name || 'Project'}`,
      customerId: client?._id || '',
      customerName: project?.customer || client?.name || '',
      projectId: project?._id || '',
      projectName: project?.name || '',
      discountType: 'none',
      discountValue: 0,
      vatPercent: 0,
      termsAndConditions: '1. 50% Advance with confirmed work order.\n2. 40% on materials delivery.\n3. 10% after completion & handover.',
      notes: 'Price valid for 30 days from proposal date.',
      items: [
        { description: 'False Ceiling with Gypsum Board & Concealed Lighting', unit: 'sft', quantity: 350, unitPrice: 220, amount: 77000 },
        { description: 'Premium HDF Board Wall Paneling with Duco Finish', unit: 'sft', quantity: 240, unitPrice: 380, amount: 91200 },
      ],
    };

    this.showQuotationModal.set(true);
  }

  addQuotationLine() {
    this.quotationForm.items.push({
      description: '',
      unit: 'sft',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    });
  }

  removeQuotationLine(index: number) {
    if (this.quotationForm.items.length > 1) {
      this.quotationForm.items.splice(index, 1);
    }
  }

  calcQuotationLine(item: any) {
    item.amount = Number(((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2));
  }

  get quotationSubtotal(): number {
    return (this.quotationForm.items || []).reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
  }

  get quotationDiscount(): number {
    if (this.quotationForm.discountType === 'percent') {
      return Number(((this.quotationSubtotal * (this.quotationForm.discountValue || 0)) / 100).toFixed(2));
    }
    if (this.quotationForm.discountType === 'fixed') {
      return Number((this.quotationForm.discountValue || 0).toFixed(2));
    }
    return 0;
  }

  get quotationGrandTotal(): number {
    const afterDisc = Math.max(0, this.quotationSubtotal - this.quotationDiscount);
    const vat = this.quotationForm.vatPercent ? (afterDisc * this.quotationForm.vatPercent) / 100 : 0;
    return Number((afterDisc + vat).toFixed(2));
  }

  saveQuotation(status: 'Draft' | 'Sent') {
    if (!this.quotationForm.projectName || !this.quotationForm.customerId) {
      alert('Please select a customer and ensure project name is set');
      return;
    }

    const payload = {
      ...this.quotationForm,
      totalAmount: this.quotationGrandTotal,
      status,
    };

    this.commercialService.createQuotation(payload).subscribe({
      next: (res) => {
        const created = res.data || res || payload;
        this.quotations.update((list) => [created, ...list]);
        this.showQuotationModal.set(false);

        // Update project status if currently in Planning
        const p = this.selectedProject();
        if (p && p.status === 'Planning') {
          p.status = 'Quotation';
          this.saveProjectDirectly(p);
        }

        this.showToast(`Quotation ${payload.quotationNumber} saved as ${status}`);
      },
      error: () => {
        this.quotations.update((list) => [payload, ...list]);
        this.showQuotationModal.set(false);
        this.showToast(`Quotation ${payload.quotationNumber} saved locally`);
      },
    });
  }

  saveProjectDirectly(p: Project) {
    this.projects.update((list) => list.map((x) => (x.projectId === p.projectId ? { ...p } : x)));
    this.selectedProject.set({ ...p });
    this.saveProjectsLocal();
    if (p._id) {
      this.commercialService.updateProject(p._id, p).subscribe();
    }
  }

  approveQuotation(q: any) {
    q.status = 'Approved';
    const p = this.selectedProject();
    if (p) {
      p.budget = q.totalAmount || p.budget;
      if (p.status === 'Planning' || p.status === 'Quotation') {
        p.status = 'Approved';
      }
      this.saveProjectDirectly(p);
    }
    this.commercialService.updateQuotation(q._id || q.id, { status: 'Approved' }).subscribe();
    this.showToast(`Quotation ${q.quotationNumber} approved — Project budget updated`);
  }

  viewQuotationPaper(q: any) {
    this.activeQuotation.set(q);
    this.showQuotationPaper.set(true);
  }

  printQuotation() {
    window.print();
  }

  getTakaWords(val: number): string {
    return takaInWords(val);
  }

  convertQuotation(q: any) {
    if (!confirm(`Convert Quotation ${q.quotationNumber} into a Confirmed Project Sales Bill?`)) {
      return;
    }

    this.commercialService.convertQuotationToBill(q._id || q.id).subscribe({
      next: () => {
        alert(`Quotation ${q.quotationNumber} converted to Sales Bill!`);
        q.status = 'Converted to Bill';
        this.loadQuotations();
        this.loadBills();
      },
      error: (err) => alert(err?.error?.message || 'Failed to convert quotation'),
    });
  }

  deleteQuotation(q: any) {
    if (confirm(`Delete draft quotation ${q.quotationNumber}?`)) {
      this.quotations.update((list) => list.filter((x) => x._id !== q._id && x.quotationNumber !== q.quotationNumber));
      if (q._id) {
        this.commercialService.deleteQuotation(q._id).subscribe();
      }
      this.showToast(`Quotation ${q.quotationNumber} deleted`);
    }
  }

  exportExcel() {
    const list = this.filteredProjects ? this.filteredProjects() : this.projects();
    if (!list || list.length === 0) {
      this.toastMessage.set('No projects to export');
      return;
    }
    const rows = list.map((p) => [
      p.projectId || '—',
      p.name || '—',
      p.customer || '—',
      p.type || 'Residential',
      p.loc || 'Dhaka',
      p.manager || '—',
      p.budget || 0,
      p.received || 0,
      p.spent || 0,
      (p.progress || 0) + '%',
      p.status || 'In Progress',
    ]);
    this.exportService.exportToExcel({
      filename: 'InteriorCounsel_Projects_Portfolio',
      title: 'Interior Counsel — Projects & Sites Portfolio',
      subtitle: 'Total Projects: ' + rows.length,
      headers: ['Project Code', 'Project Name', 'Client / Customer', 'Type', 'Location', 'Project Manager', 'Budget (BDT)', 'Received (BDT)', 'Spent (BDT)', 'Progress', 'Status'],
      rows,
    });
    this.toastMessage.set('Projects exported to Excel');
  }

  exportPdf() {
    const list = this.filteredProjects ? this.filteredProjects() : this.projects();
    if (!list || list.length === 0) {
      this.toastMessage.set('No projects to export');
      return;
    }
    const rows = list.map((p) => [
      p.projectId || '—',
      p.name || '—',
      p.customer || '—',
      p.loc || '—',
      (p.budget || 0).toLocaleString(),
      (p.received || 0).toLocaleString(),
      (p.progress || 0) + '%',
      p.status || 'In Progress',
    ]);
    this.exportService.exportToPdf({
      filename: 'InteriorCounsel_Projects_Portfolio',
      title: 'Interior Counsel — Projects Portfolio',
      subtitle: 'Total Active Projects: ' + rows.length,
      headers: ['Code', 'Project Name', 'Client', 'Location', 'Budget (Tk)', 'Received (Tk)', 'Progress', 'Status'],
      rows,
      orientation: 'landscape',
    });
    this.toastMessage.set('Projects exported to PDF');
  }

}
