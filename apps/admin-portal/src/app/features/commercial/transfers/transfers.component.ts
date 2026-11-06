import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommercialService } from '../../../core/services/commercial.service';

@Component({
  selector: 'wfm-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transfers.component.html',
})
export class TransfersComponent implements OnInit {
  private commercialService = inject(CommercialService);

  readonly transfers = signal<any[]>([]);
  readonly loading = signal(false);
  readonly showModal = signal(false);

  searchQuery = '';

  readonly accounts = [
    'Cash on Hand',
    'Mercantile Bank (A/C: 11029384)',
    'City Bank (A/C: 22091823)',
    'Brac Bank (A/C: 33019284)',
    'Dutch-Bangla Bank (A/C: 44029182)',
    'Petty Cash Float',
  ];

  formTransfer: any = {
    date: new Date().toISOString().slice(0, 10),
    transferFrom: 'Cash on Hand',
    transferTo: 'Mercantile Bank (A/C: 11029384)',
    amount: 0,
    memo: '',
    chequeNo: '',
    chequeDate: '',
    status: 'Confirmed',
  };

  ngOnInit() {
    this.loadTransfers();
  }

  loadTransfers() {
    this.loading.set(true);
    const params: any = {};
    if (this.searchQuery) params.search = this.searchQuery;

    this.commercialService.getTransfers(params).subscribe({
      next: (res) => {
        this.transfers.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  readonly filteredTransfers = computed(() => {
    if (!this.searchQuery) return this.transfers();
    const q = this.searchQuery.toLowerCase();
    return this.transfers().filter(
      (t) =>
        t.transferNumber?.toLowerCase().includes(q) ||
        t.transferFrom?.toLowerCase().includes(q) ||
        t.transferTo?.toLowerCase().includes(q) ||
        t.memo?.toLowerCase().includes(q)
    );
  });

  readonly totalTransferred = computed(() =>
    this.transfers().reduce((acc, t) => acc + (t.amount || 0), 0)
  );

  get isChequeApplicable(): boolean {
    return this.formTransfer.transferFrom && !this.formTransfer.transferFrom.includes('Cash');
  }

  openNewModal() {
    this.formTransfer = {
      date: new Date().toISOString().slice(0, 10),
      transferFrom: 'Cash on Hand',
      transferTo: 'Mercantile Bank (A/C: 11029384)',
      amount: 0,
      memo: '',
      chequeNo: '',
      chequeDate: '',
      status: 'Confirmed',
    };
    this.showModal.set(true);
  }

  saveTransfer() {
    if (!this.formTransfer.transferFrom || !this.formTransfer.transferTo) {
      alert('Please select both Transfer From and Transfer To accounts');
      return;
    }
    if (this.formTransfer.transferFrom === this.formTransfer.transferTo) {
      alert('Transfer From and Transfer To must be different accounts');
      return;
    }
    if (!this.formTransfer.amount || this.formTransfer.amount <= 0) {
      alert('Please enter a valid transfer amount');
      return;
    }

    this.commercialService.createTransfer(this.formTransfer).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadTransfers();
      },
      error: (err) => alert(err?.error?.message || 'Failed to record bank transfer'),
    });
  }

  deleteTransfer(id: string) {
    if (confirm('Are you sure you want to delete this transfer record?')) {
      this.commercialService.deleteTransfer(id).subscribe({
        next: () => this.loadTransfers(),
        error: (err) => alert(err?.error?.message || 'Failed to delete transfer record'),
      });
    }
  }
}
