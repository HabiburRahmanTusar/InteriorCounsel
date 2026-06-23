import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
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
    // canActivate: [authGuard],
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
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'employees',
        title: 'Employees',
        loadComponent: () =>
          import('./features/employees/employee-list.component').then(
            (m) => m.EmployeeListComponent,
          ),
      },
      {
        path: 'employees/new',
        title: 'New employee',
        loadComponent: () =>
          import('./features/employees/employee-form.component').then(
            (m) => m.EmployeeFormComponent,
          ),
      },
      {
        path: 'employees/:id',
        title: 'Edit employee',
        loadComponent: () =>
          import('./features/employees/employee-form.component').then(
            (m) => m.EmployeeFormComponent,
          ),
      },
      {
        path: 'shifts',
        title: 'Shifts',
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
        title: 'Reports',
        loadComponent: () =>
          import('./features/reports/report.component').then((m) => m.ReportComponent),
      },
      {
        path: 'settings',
        title: 'Settings',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
