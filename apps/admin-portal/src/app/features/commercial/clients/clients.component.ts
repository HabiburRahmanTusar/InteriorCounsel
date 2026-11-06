import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService } from '../../../core/services/commercial.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'wfm-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent implements OnInit {
  private commercialService = inject(CommercialService);
  private exportService = inject(ExportService);

  readonly clients = signal<any[]>([]);
  readonly loading = signal(false);
  readonly showModal = signal(false);

  newClient: any = {
    name: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    notes: '',
  };

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.loading.set(true);
    this.commercialService.getClients().subscribe({
      next: (res) => {
        this.clients.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreateModal() {
    this.newClient = {
      name: '',
      phone: '',
      email: '',
      company: '',
      address: '',
      notes: '',
    };
    this.showModal.set(true);
  }

  saveClient() {
    if (!this.newClient.name || !this.newClient.name.trim()) {
      alert('Client Name is required');
      return;
    }

    const payload = {
      ...this.newClient,
      name: this.newClient.name.trim(),
      phone: (this.newClient.phone || '').trim() || '01XXXXXXXXX',
      companyName: this.newClient.company || this.newClient.companyName || '',
    };

    this.commercialService.createClient(payload).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadClients();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save client'),
    });
  }

  exportExcel() {
    const list = this.clients();
    if (!list || list.length === 0) {
      alert('No clients to export');
      return;
    }
    const rows = list.map((c) => [
      c.name || '—',
      c.phone || '—',
      c.email || '—',
      c.companyName || c.company || 'Individual',
      c.address || '—',
      c.totalBilled || 0,
      c.totalPaid || 0,
      c.outstandingDue || (c.totalBilled - (c.totalPaid || 0)) || 0,
    ]);
    this.exportService.exportToExcel({
      filename: 'InteriorCounsel_Clients_Directory',
      title: 'Customers & Clients Register',
      subtitle: `Total Clients: ${rows.length}`,
      headers: ['Client Name', 'Phone', 'Email', 'Company', 'Address', 'Total Billed (BDT)', 'Total Paid (BDT)', 'Outstanding Due (BDT)'],
      rows,
    });
  }

  exportPdf() {
    const list = this.clients();
    if (!list || list.length === 0) {
      alert('No clients to export');
      return;
    }
    const rows = list.map((c) => [
      c.name || '—',
      c.phone || '—',
      c.companyName || c.company || 'Individual',
      (c.totalBilled || 0).toLocaleString(),
      (c.totalPaid || 0).toLocaleString(),
      ((c.totalBilled || 0) - (c.totalPaid || 0)).toLocaleString(),
    ]);
    this.exportService.exportToPdf({
      filename: 'InteriorCounsel_Clients_Directory',
      title: 'Interior Counsel — Customers CRM Directory',
      subtitle: `Total Active Clients: ${rows.length}`,
      headers: ['Client Name', 'Phone', 'Company', 'Billed (Tk)', 'Paid (Tk)', 'Due (Tk)'],
      rows,
      orientation: 'landscape',
    });
  }
}
