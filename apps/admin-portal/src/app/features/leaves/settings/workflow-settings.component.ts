import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, of } from 'rxjs';
import { catchError, finalize, tap, takeUntil } from 'rxjs/operators';
import { ApprovalWorkflowService, ApprovalWorkflow, ApprovalStage } from '../../../core/services/approval-workflow.service';

@Component({
  selector: 'wfm-workflow-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-settings.component.html',
})
export class WorkflowSettingsComponent implements OnInit, OnDestroy {
  private workflowService = inject(ApprovalWorkflowService);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly workflows = signal<ApprovalWorkflow[]>([]);
  readonly roles = signal<string[]>([]);

  // Modal or Edit state
  showEditModal = signal(false);
  editWorkflow = signal<Partial<ApprovalWorkflow>>({
    applicantRole: 'employee',
    stages: [],
    isActive: true,
  });

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading.set(true);
    this.workflowService.getWorkflows().pipe(
      tap((data: ApprovalWorkflow[]) => this.workflows.set(data)),
      catchError(err => {
        this.toastr.error('Failed to load approval workflows');
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    this.workflowService.getRoles().pipe(
      tap((data: string[]) => this.roles.set(data)),
      catchError(err => {
        this.toastr.error('Failed to load system roles');
        return of([]);
      }),
      finalize(() => this.loading.set(false)),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  openCreateModal() {
    this.editWorkflow.set({
      applicantRole: '',
      stages: [
        { sequence: 1, role: 'manager', label: 'Direct Manager Approval' }
      ],
      isActive: true,
    });
    this.showEditModal.set(true);
  }

  openEditModal(wf: ApprovalWorkflow) {
    // Clone workflow stages deep
    const clonedStages = wf.stages.map((s: ApprovalStage) => ({ ...s }));
    this.editWorkflow.set({
      _id: wf._id,
      applicantRole: wf.applicantRole,
      stages: clonedStages,
      isActive: wf.isActive,
    });
    this.showEditModal.set(true);
  }

  closeModal() {
    this.showEditModal.set(false);
  }

  addStage() {
    const current = this.editWorkflow();
    const stages = current.stages || [];
    const nextSeq = stages.length + 1;

    stages.push({
      sequence: nextSeq,
      role: 'hr',
      label: `Stage ${nextSeq} Approval`
    });

    this.editWorkflow.set({ ...current, stages });
  }

  removeStage(idx: number) {
    const current = this.editWorkflow();
    const stages = current.stages || [];
    stages.splice(idx, 1);

    // Recalculate sequences
    stages.forEach((s: ApprovalStage, i: number) => {
      s.sequence = i + 1;
    });

    this.editWorkflow.set({ ...current, stages });
  }

  saveWorkflow() {
    const wf = this.editWorkflow();
    if (!wf.applicantRole) {
      this.toastr.warning('Please select an applicant role');
      return;
    }
    if (!wf.stages || wf.stages.length === 0) {
      this.toastr.warning('At least one approval stage is required');
      return;
    }

    // Verify all stages have role selected
    for (const stage of wf.stages) {
      if (!stage.role) {
        this.toastr.warning('All stages must specify an approver role');
        return;
      }
    }

    this.saving.set(true);
    this.workflowService.updateWorkflow(wf).pipe(
      tap(() => {
        this.toastr.success('Approval workflow saved successfully');
        this.closeModal();
        this.loadData();
      }),
      catchError((err) => {
        this.toastr.error(err.error?.message || 'Failed to save workflow settings');
        return of(null);
      }),
      finalize(() => this.saving.set(false)),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  deleteWorkflow(wf: ApprovalWorkflow) {
    if (!wf._id) return;
    if (confirm(`Are you sure you want to delete the workflow for role: ${wf.applicantRole}?`)) {
      this.workflowService.deleteWorkflow(wf._id).pipe(
        tap(() => {
          this.toastr.success('Approval workflow deleted');
          this.loadData();
        }),
        catchError(err => {
          this.toastr.error('Failed to delete workflow');
          return of(null);
        }),
        takeUntil(this.destroy$)
      ).subscribe();
    }
  }

  capitalize(val: string): string {
    if (!val) return '';
    return val.charAt(0).toUpperCase() + val.slice(1);
  }
}
