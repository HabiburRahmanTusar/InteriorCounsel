import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  AdminPolicyService,
  LeaveType,
  EmployeeType,
  LeavePolicy,
} from '../../core/services/admin-policy.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-policy-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './policy-form.component.html',
})
export class LeavePolicyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private policyService = inject(AdminPolicyService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  policyForm!: FormGroup;
  leaveTypes = signal<LeaveType[]>([]);
  employeeTypes = signal<EmployeeType[]>([]);

  isEditMode = signal(false);
  policyId = signal<string | null>(null);
  loading = signal(true);
  saving = signal(false);

  ngOnInit() {
    this.initForm();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id && id !== 'new') {
        this.isEditMode.set(true);
        this.policyId.set(id);
      }
      this.loadData();
    });
  }

  initForm() {
    this.policyForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020)]],
      isDefault: [false],
      employeeTypes: [[], Validators.required],
      leaveAllocations: this.fb.array([]),
    });
  }

  get leaveAllocations() {
    return this.policyForm.get('leaveAllocations') as FormArray;
  }

  addAllocation(leaveType: string = '', days: number = 0) {
    this.leaveAllocations.push(
      this.fb.group({
        leaveType: [leaveType, Validators.required],
        days: [days, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeAllocation(index: number) {
    this.leaveAllocations.removeAt(index);
  }

  toggleEmployeeType(id: string) {
    const current = this.policyForm.value.employeeTypes as string[];
    const index = current.indexOf(id);
    if (index === -1) {
      this.policyForm.patchValue({ employeeTypes: [...current, id] });
    } else {
      this.policyForm.patchValue({ employeeTypes: current.filter((t) => t !== id) });
    }
    this.policyForm.get('employeeTypes')?.markAsTouched();
  }

  loadData() {
    const requests: any = {
      lt: this.policyService.getLeaveTypes(),
      et: this.policyService.getEmployeeTypes(),
    };

    if (this.isEditMode() && this.policyId()) {
      requests.policy = this.policyService.getPolicyById(this.policyId()!);
    }

    forkJoin(requests).subscribe({
      next: (res: any) => {
        this.leaveTypes.set(res.lt);
        this.employeeTypes.set(res.et);

        if (res.policy) {
          this.populateForm(res.policy);
        } else {
          // Initialize with empty allocations for all active leave types
          res.lt.forEach((lt: LeaveType) => {
            if (lt.isActive !== false) {
              this.addAllocation(lt._id, 0);
            }
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  populateForm(policy: LeavePolicy) {
    this.policyForm.patchValue({
      name: policy.name,
      description: policy.description,
      year: policy.year,
      isDefault: policy.isDefault,
      employeeTypes: policy.employeeTypes.map((et: any) => et._id || et),
    });

    policy.leaveAllocations.forEach((alloc) => {
      this.addAllocation(
        typeof alloc.leaveType === 'string' ? alloc.leaveType : alloc.leaveType._id,
        alloc.days,
      );
    });
  }

  getLeaveTypeDetails(id: string): LeaveType | undefined {
    return this.leaveTypes().find((lt) => lt._id === id);
  }

  onSubmit() {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const formValue = this.policyForm.value;

    const request = this.isEditMode()
      ? this.policyService.updatePolicy(this.policyId()!, formValue)
      : this.policyService.createPolicy(formValue);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/leaves/policies']);
      },
      error: (err) => {
        alert('Error saving policy: ' + (err.error?.message || 'Unknown error'));
        this.saving.set(false);
      },
    });
  }
}
