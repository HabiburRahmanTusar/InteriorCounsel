import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService } from '../../../core/services/commercial.service';

@Component({
  selector: 'wfm-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent implements OnInit {
  private commercialService = inject(CommercialService);

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
}
