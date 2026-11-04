import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AuthService } from './core/services/auth.service';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    title: 'Forgot password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        title: 'Dashboard',
        canActivate: [roleGuard('admin', 'hr', 'manager')],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'leaves',
        canActivate: [roleGuard('admin', 'hr', 'manager')],
        children: [
          {
            path: 'policies',
            title: 'Leave Policies',
            canActivate: [roleGuard('admin', 'hr')],
            loadComponent: () =>
              import('./features/leaves/policies.component').then((m) => m.LeavePoliciesComponent),
          },
          {
            path: 'requests',
            title: 'Leave Requests',
            loadComponent: () =>
              import('./features/leaves/requests.component').then((m) => m.LeaveRequestsComponent),
          },
          {
            path: 'balances',
            title: 'Leave Balances',
            canActivate: [roleGuard('admin', 'hr')],
            loadComponent: () =>
              import('./features/leaves/balances.component').then((m) => m.LeaveBalancesComponent),
          },
          {
            path: 'workflows',
            title: 'Approval Workflows',
            canActivate: [roleGuard('admin', 'hr')],
            loadComponent: () =>
              import('./features/leaves/settings/workflow-settings.component').then((m) => m.WorkflowSettingsComponent),
          },
        ],
      },
      {
        path: 'employees',
        title: 'Employees',
        canActivate: [roleGuard('admin', 'hr', 'manager')],
        loadComponent: () =>
          import('./features/employees/employee-list.component').then(
            (m) => m.EmployeeListComponent,
          ),
      },
      {
        path: 'employees/new',
        title: 'New employee',
        canActivate: [roleGuard('admin', 'hr')],
        loadComponent: () =>
          import('./features/employees/employee-form.component').then(
            (m) => m.EmployeeFormComponent,
          ),
      },
      {
        path: 'employees/:id',
        title: 'Edit employee',
        canActivate: [roleGuard('admin', 'hr')],
        loadComponent: () =>
          import('./features/employees/employee-form.component').then(
            (m) => m.EmployeeFormComponent,
          ),
      },
      {
        path: 'shifts',
        title: 'Shifts',
        canActivate: [roleGuard('admin', 'hr', 'manager')],
        loadComponent: () =>
          import('./features/shifts/shift-list.component').then((m) => m.ShiftListComponent),
      },
      {
        path: 'attendance',
        title: 'Attendance',
        loadComponent: () =>
          import('./features/attendance/attendance-view.component').then(
            (m) => m.AttendanceViewComponent,
          ),
      },
      {
        path: 'attendance/manual',
        title: 'Manual Attendance',
        loadComponent: () =>
          import('./features/attendance/manual-attendance/manual-attendance.component').then(
            (m) => m.ManualAttendanceComponent,
          ),
      },
      {
        path: 'manual-attendance',
        redirectTo: 'attendance/manual',
        pathMatch: 'full',
      },
      {
        path: 'reports',
        title: 'Attendance Report',
        canActivate: [roleGuard('admin', 'hr', 'manager')],
        loadComponent: () =>
          import('./features/reports/report.component').then((m) => m.ReportComponent),
      },
      {
        path: 'reports/leaves',
        title: 'Leave Report',
        canActivate: [roleGuard('admin', 'hr', 'manager')],
        loadComponent: () =>
          import('./features/reports/leave-report.component').then((m) => m.LeaveReportComponent), // Trigger dev server rebuild
      },
      {
        path: 'settings',
        title: 'Settings',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'financial-summary',
        title: 'Financial Summary',
        canActivate: [roleGuard('admin', 'hr', 'manager', 'employee')],
        loadComponent: () =>
          import('./features/financial/financial.component').then((m) => m.FinancialComponent), // Force dev server resolution update
      },
      {
        path: 'commercial',
        canActivate: [roleGuard('admin', 'hr', 'manager')],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'dashboard',
          },
          {
            path: 'dashboard',
            title: 'Commercial Dashboard',
            loadComponent: () =>
              import('./features/commercial/dashboard/commercial-dashboard.component').then(
                (m) => m.CommercialDashboardComponent,
              ),
          },
          {
            path: 'bills',
            title: 'Project Billing',
            loadComponent: () =>
              import('./features/commercial/billing/billing.component').then((m) => m.BillingComponent),
          },
          {
            path: 'vendor-bills',
            title: 'Vendor Procurement',
            loadComponent: () =>
              import('./features/commercial/vendor-bills/vendor-bills.component').then(
                (m) => m.VendorBillsComponent,
              ),
          },
          {
            path: 'cash-flow',
            title: 'Cash Flow Ledger',
            loadComponent: () =>
              import('./features/commercial/cash-flow/cash-flow.component').then((m) => m.CashFlowComponent),
          },
          {
            path: 'shareholders',
            title: 'Shareholder Wallets',
            canActivate: [roleGuard('admin')],
            loadComponent: () =>
              import('./features/commercial/shareholders/shareholders.component').then(
                (m) => m.ShareholdersComponent,
              ),
          },
          {
            path: 'clients',
            title: 'Clients Directory',
            loadComponent: () =>
              import('./features/commercial/clients/clients.component').then((m) => m.ClientsComponent),
          },
          {
            path: 'vendors',
            title: 'Vendors Directory',
            loadComponent: () =>
              import('./features/commercial/vendors/vendors.component').then((m) => m.VendorsComponent),
          },
          {
            path: 'inventory',
            title: 'Inventory & Materials',
            loadComponent: () =>
              import('./features/commercial/inventory/inventory.component').then((m) => m.InventoryComponent),
          },
          {
            path: 'transfers',
            title: 'Bank & Cash Transfers',
            loadComponent: () =>
              import('./features/commercial/transfers/transfers.component').then((m) => m.TransfersComponent),
          },
        ],
      },
      {
        path: 'projects',
        title: 'Projects & Quotations',
        loadComponent: () =>
          import('./features/commercial/projects/projects.component').then(
            (m) => m.ProjectsComponent,
          ),
      },
      {
        path: 'access-control',
        title: 'Access Control (RBAC)',
        loadComponent: () =>
          import('./features/access-control/access-control.component').then(
            (m) => m.AccessControlComponent,
          ),
      },
      { path: 'access', redirectTo: 'access-control', pathMatch: 'full' },
      { path: 'billing', redirectTo: 'commercial/bills', pathMatch: 'full' },
      { path: 'sales', redirectTo: 'commercial/bills', pathMatch: 'full' },
      { path: 'customers', redirectTo: 'commercial/clients', pathMatch: 'full' },
      { path: 'inventory', redirectTo: 'commercial/inventory', pathMatch: 'full' },
      { path: 'purchase', redirectTo: 'commercial/vendor-bills', pathMatch: 'full' },
      { path: 'suppliers', redirectTo: 'commercial/vendors', pathMatch: 'full' },
      { path: 'vendor-bills', redirectTo: 'commercial/vendor-bills', pathMatch: 'full' },
      { path: 'cash-flow', redirectTo: 'commercial/cash-flow', pathMatch: 'full' },
      { path: 'cashflow', redirectTo: 'commercial/cash-flow', pathMatch: 'full' },
      { path: 'transfers', redirectTo: 'commercial/transfers', pathMatch: 'full' },
      { path: 'shareholders', redirectTo: 'commercial/shareholders', pathMatch: 'full' },
      {
        path: 'salary',
        canActivate: [roleGuard('admin', 'hr')],
        children: [
          {
            path: 'overview',
            title: 'Salary Overview',
            loadComponent: () =>
              import('./features/salary/overview.component').then((m) => m.SalaryOverviewComponent),
          },
          {
            path: 'reports',
            title: 'Salary Reports',
            loadComponent: () =>
              import('./features/salary/reports.component').then((m) => m.SalaryReportsComponent),
          },
          {
            path: 'deductions',
            title: 'Deduction History',
            loadComponent: () =>
              import('./features/salary/deductions.component').then(
                (m) => m.DeductionHistoryComponent,
              ),
          },
        ],
      },
      {
        path: 'calendar',
        canActivate: [roleGuard('admin', 'hr')],
        children: [
          {
            path: 'weekends',
            title: 'Weekend Settings',
            loadComponent: () =>
              import('./features/calendar/weekends.component').then(
                (m) => m.WeekendSettingsComponent,
              ),
          },
        ],
      },
      {
        path: 'my-leaves',
        title: 'My Leaves',
        loadComponent: () =>
          import('./features/leaves/my-leaves.component').then((m) => m.MyLeavesComponent),
      },
      {
        path: 'profile',
        title: 'My Profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'change-password',
        title: 'Change Password',
        loadComponent: () =>
          import('./features/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
