import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { RbacService } from '../../core/services/rbac.service';

@Component({
  selector: 'wfm-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private rbac = inject(RbacService);
  private router = inject(Router);

  readonly currentRole = this.auth.currentRole;
  readonly activeUser = this.rbac.activeUser;
  readonly activeRole = this.rbac.activeRole;
  readonly loggingOut = signal(false);

  hasMenu(key: string): boolean {
    return this.rbac.hasMenu(key);
  }

  // Group visibility calculations
  readonly hasOverviewGroup = computed(
    () => this.hasMenu('dashboard') || this.hasMenu('commercial-dashboard')
  );

  readonly hasPeopleGroup = computed(
    () =>
      this.hasMenu('employees') ||
      this.hasMenu('attendance') ||
      this.hasMenu('manual-attendance') ||
      this.hasMenu('leave') ||
      this.hasMenu('payroll')
  );

  readonly hasSalesGroup = computed(
    () => this.hasMenu('sales') || this.hasMenu('customers') || this.hasMenu('projects')
  );

  readonly hasInventoryGroup = computed(
    () => this.hasMenu('inventory') || this.hasMenu('purchase') || this.hasMenu('suppliers')
  );

  readonly hasFinanceGroup = computed(
    () => this.hasMenu('cash-flow') || this.hasMenu('transfers') || this.hasMenu('shareholders')
  );

  readonly hasSystemGroup = computed(
    () => this.hasMenu('reports') || this.hasMenu('access') || this.hasMenu('settings')
  );

  logout() {
    this.loggingOut.set(true);
    this.auth
      .logout()
      .pipe(
        finalize(() => {
          this.loggingOut.set(false);
          this.router.navigate(['/login']);
        }),
      )
      .subscribe();
  }
}
