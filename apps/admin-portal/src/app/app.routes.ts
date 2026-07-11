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
        canActivate: [roleGuard('admin', 'hr')],
        children: [
          {
            path: 'requests',
            title: 'Leave Requests',
            loadComponent: () =>
              import('./features/leaves/requests.component').then((m) => m.LeaveRequestsComponent),
          },
          {
            path: 'balances',
            title: 'Leave Balances',
            loadComponent: () =>
              import('./features/leaves/balances.component').then((m) => m.LeaveBalancesComponent),
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
        canActivate: [roleGuard('employee')],
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
