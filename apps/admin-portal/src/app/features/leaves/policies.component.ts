import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminPolicyService, LeavePolicy, EmployeeType } from '../../core/services/admin-policy.service';
import { LeavePolicyFormComponent } from './policy-form.component';

@Component({
  selector: 'app-leave-policies',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LeavePolicyFormComponent],
  templateUrl: './policies.component.html',
})
export class LeavePoliciesComponent implements OnInit {
  private policyService = inject(AdminPolicyService);
  
  policies = signal<LeavePolicy[]>([]);
  loading = signal(false);
  syncing = signal(false);
  yearFilter = signal(new Date().getFullYear());

  isModalOpen = signal(false);
  selectedPolicyId = signal<string | null>(null);
  isViewOnly = signal(false);

  ngOnInit() {
    this.loadPolicies();
  }

  loadPolicies() {
    this.loading.set(true);
    this.policyService.getPolicies({ year: this.yearFilter() }).subscribe({
      next: (data) => {
        this.policies.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getEmployeeTypeNames(employeeTypes: EmployeeType[] | string[]): string {
    if (!employeeTypes || employeeTypes.length === 0) return 'None';
    if (typeof employeeTypes[0] === 'string') return `${employeeTypes.length} types selected`;
    return (employeeTypes as EmployeeType[]).map(et => et.label).join(', ');
  }

  activatePolicy(id: string | undefined) {
    if (!id) return;
    if (confirm('Are you sure you want to activate this policy? This will make it immutable and start applying it to users.')) {
      this.policyService.activatePolicy(id).subscribe(() => this.loadPolicies());
    }
  }

  archivePolicy(id: string | undefined) {
    if (!id) return;
    if (confirm('Are you sure you want to archive this policy?')) {
      this.policyService.archivePolicy(id).subscribe(() => this.loadPolicies());
    }
  }

  deletePolicy(id: string | undefined) {
    if (!id) return;
    if (confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
      this.policyService.deletePolicy(id).subscribe({
        next: () => this.loadPolicies(),
        error: (err) => alert('Error deleting policy: ' + (err.error?.message || 'Unknown error'))
      });
    }
  }

  syncBalances() {
    if (confirm(`Are you sure you want to re-sync all balances for ${this.yearFilter()}? This may take a moment.`)) {
      this.syncing.set(true);
      this.policyService.syncBalancesBulk(this.yearFilter()).subscribe({
        next: (res) => {
          alert(`Successfully synced balances for ${res.count} employees.`);
          this.syncing.set(false);
        },
        error: (err) => {
          alert('Error syncing balances: ' + (err.error?.message || 'Unknown error'));
          this.syncing.set(false);
        }
      });
    }
  }

  openCreateModal() {
    this.selectedPolicyId.set('new');
    this.isViewOnly.set(false);
    this.isModalOpen.set(true);
  }

  openEditModal(id: string | undefined) {
    if (!id) return;
    this.selectedPolicyId.set(id);
    this.isViewOnly.set(false);
    this.isModalOpen.set(true);
  }

  openViewModal(id: string | undefined) {
    if (!id) return;
    this.selectedPolicyId.set(id);
    this.isViewOnly.set(true);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPolicyId.set(null);
  }

  onModalSaved() {
    this.closeModal();
    this.loadPolicies();
  }
}
