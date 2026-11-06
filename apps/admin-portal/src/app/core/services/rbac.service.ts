import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface RbacRole {
  name: string;
  all?: boolean;
  menus: string[];
  isSystem?: boolean;
}

export interface RbacUser {
  id: string;
  name: string;
  email: string;
  role: string;
  menus?: string[] | null;
  status: 'Active' | 'Inactive';
  employeeId?: string;
  designation?: string;
}

export interface MenuGroup {
  group: string;
  items: Array<{
    id: string;
    label: string;
    route: string;
    icon?: string;
    badge?: string;
    children?: Array<{ id: string; label: string; route: string }>;
  }>;
}

const STORAGE_KEY = 'ic_erp_rbac_v1';

export const SYSTEM_MENU_GROUPS: MenuGroup[] = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
      { id: 'commercial-dashboard', label: 'Executive Analytics', route: '/commercial/dashboard' },
    ],
  },
  {
    group: 'People & HR',
    items: [
      { id: 'employees', label: 'Employees', route: '/employees' },
      { id: 'attendance', label: 'Attendance', route: '/attendance' },
      { id: 'manual-attendance', label: 'Manual Attendance', route: '/attendance/manual' },
      { id: 'leave', label: 'Leave Requests', route: '/leaves/requests' },
      { id: 'payroll', label: 'Payroll & Salary', route: '/salary/overview' },
    ],
  },
  {
    group: 'Sales & Customers',
    items: [
      { id: 'sales', label: 'Sales & Invoice', route: '/commercial/bills' },
      { id: 'customers', label: 'Customers CRM', route: '/commercial/clients' },
      { id: 'projects', label: 'Projects & Quotations', route: '/projects' },
    ],
  },
  {
    group: 'Inventory & Purchase',
    items: [
      { id: 'inventory', label: 'Inventory (Products)', route: '/commercial/inventory' },
      { id: 'purchase', label: 'Purchase (Vendor Bills)', route: '/commercial/vendor-bills' },
      { id: 'suppliers', label: 'Suppliers & Discounts', route: '/commercial/vendors' },
    ],
  },
  {
    group: 'Finance & Banking',
    items: [
      { id: 'cash-flow', label: 'Cash Flow Ledger', route: '/commercial/cash-flow' },
      { id: 'transfers', label: 'Bank/Cash Transfer', route: '/commercial/transfers' },
      { id: 'shareholders', label: 'Shareholder Wallets', route: '/commercial/shareholders' },
      { id: 'shareholder-portal', label: 'Shareholder Portal', route: '/shareholder/portal' },
    ],
  },
  {
    group: 'Insights & System',
    items: [
      { id: 'reports', label: 'Reports & Audits', route: '/reports' },
      { id: 'access', label: 'Access Control (RBAC)', route: '/access-control' },
      { id: 'settings', label: 'System Settings', route: '/settings' },
    ],
  },
];

export const ALL_MENU_KEYS: string[] = SYSTEM_MENU_GROUPS.flatMap((g) =>
  g.items.flatMap((it) => (it.children ? [it.id, ...it.children.map((c) => c.id)] : [it.id]))
);

export const DEFAULT_ROLES: RbacRole[] = [
  { name: 'Super Admin', all: true, menus: [], isSystem: true },
  {
    name: 'Manager',
    menus: [
      'dashboard',
      'commercial-dashboard',
      'employees',
      'attendance',
      'manual-attendance',
      'leave',
      'projects',
      'customers',
      'sales',
      'inventory',
      'purchase',
      'suppliers',
      'reports',
    ],
    isSystem: true,
  },
  {
    name: 'HR Manager',
    menus: ['dashboard', 'employees', 'attendance', 'manual-attendance', 'leave', 'payroll', 'reports'],
    isSystem: true,
  },
  {
    name: 'Accountant',
    menus: ['dashboard', 'customers', 'sales', 'payroll', 'reports', 'cash-flow', 'transfers', 'shareholders'],
    isSystem: true,
  },
  {
    name: 'Sales Staff',
    menus: ['dashboard', 'customers', 'sales', 'projects'],
    isSystem: true,
  },
  {
    name: 'Store Keeper',
    menus: ['dashboard', 'inventory', 'purchase', 'suppliers'],
    isSystem: true,
  },
  {
    name: 'Viewer',
    menus: ['dashboard', 'reports'],
    isSystem: true,
  },
  {
    name: 'Shareholder',
    menus: ['shareholder-portal'],
    isSystem: true,
  },
];

export const DEFAULT_USERS: RbacUser[] = [
  {
    id: 'U1',
    name: 'Admin',
    email: 'admin@attendly.com',
    role: 'Super Admin',
    menus: null,
    status: 'Active',
    employeeId: 'ADM001',
    designation: 'Managing Director',
  },
  {
    id: 'U0',
    name: 'Interior Counsel Admin',
    email: 'admin@interiorcounsel.com',
    role: 'Super Admin',
    menus: null,
    status: 'Active',
    employeeId: 'ADM000',
    designation: 'Managing Director',
  },
  {
    id: 'U2',
    name: 'Ruhul Amin',
    email: 'ruhul.amin@interiorcounsel.com',
    role: 'Manager',
    menus: null,
    status: 'Active',
    employeeId: 'EMP001',
    designation: 'Operations Manager',
  },
  {
    id: 'U3',
    name: 'Kamrul Hasan',
    email: 'kamrul.hasan@interiorcounsel.com',
    role: 'HR Manager',
    menus: null,
    status: 'Active',
    employeeId: 'EMP002',
    designation: 'Head of HR',
  },
  {
    id: 'U4',
    name: 'Saiful Islam',
    email: 'saiful.islam@interiorcounsel.com',
    role: 'Accountant',
    menus: null,
    status: 'Active',
    employeeId: 'EMP003',
    designation: 'Senior Accountant',
  },
  {
    id: 'U5',
    name: 'Arif Hossain',
    email: 'arif.hossain@interiorcounsel.com',
    role: 'Sales Staff',
    menus: null,
    status: 'Active',
    employeeId: 'EMP004',
    designation: 'Executive - Sales & Marketing',
  },
  {
    id: 'U6',
    name: 'Tanvir Ahmed',
    email: 'tanvir.ahmed@interiorcounsel.com',
    role: 'Store Keeper',
    menus: null,
    status: 'Active',
    employeeId: 'EMP005',
    designation: 'Inventory & Procurement Officer',
  },
];

@Injectable({ providedIn: 'root' })
export class RbacService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/rbac`;

  readonly roles = signal<RbacRole[]>(DEFAULT_ROLES);
  readonly users = signal<RbacUser[]>(DEFAULT_USERS);
  readonly menuGroups = SYSTEM_MENU_GROUPS;

  constructor() {
    this.loadState();
  }

  loadState() {
    let saved: any = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {}

    if (saved && Array.isArray(saved.roles) && Array.isArray(saved.users)) {
      this.roles.set(saved.roles);
      this.users.set(saved.users);
    } else {
      this.saveLocal();
    }

    // Attempt API sync
    this.http.get<any>(`${this.baseUrl}/roles`).pipe(
      catchError(() => of(null)),
      tap((res) => {
        if (res && res.data && res.data.length) {
          const remoteRoles = res.data.map((r: any) => ({
            name: r.name,
            all: !!r.all,
            menus: r.menus || [],
            isSystem: !!r.isSystem,
          }));
          this.roles.set(remoteRoles);
          this.saveLocal();
        }
      })
    ).subscribe();

    this.http.get<any>(`${this.baseUrl}/users`).pipe(
      catchError(() => of(null)),
      tap((res) => {
        if (res && res.data && res.data.length) {
          const remoteUsers = res.data.map((u: any) => ({
            id: u._id || u.id,
            name: u.name,
            email: u.email,
            role: u.role || 'Viewer',
            menus: u.customMenus && u.customMenus.length ? u.customMenus : null,
            status: (u.status === 'active' || u.status === 'Active') ? 'Active' : 'Inactive',
            employeeId: u.employeeId,
            designation: u.designation,
          }));
          this.users.set(remoteUsers);
          this.saveLocal();
        }
      })
    ).subscribe();
  }

  private saveLocal() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          roles: this.roles(),
          users: this.users(),
        })
      );
    } catch {}
  }

  // Active Effective User
  readonly activeUser = computed<RbacUser>(() => {
    const authUser = this.auth.currentUser();
    const allUsers = this.users();

    if (authUser?.email) {
      const match = allUsers.find(
        (u) => u.email.toLowerCase() === authUser.email.toLowerCase()
      );
      if (match) return match;
    }

    // Default to Super Admin / First active user
    return allUsers[0] || DEFAULT_USERS[0];
  });

  // Role details of the active user
  readonly activeRole = computed<RbacRole>(() => {
    const user = this.activeUser();
    return this.roles().find((r) => r.name === user.role) || {
      name: user.role,
      all: user.role === 'admin' || user.role === 'Super Admin',
      menus: [],
    };
  });

  // Effective set of allowed menu keys for the current user
  readonly allowedMenus = computed<Set<string> | null>(() => {
    const user = this.activeUser();
    const role = this.activeRole();

    // Super Admin or role.all has access to everything
    if (role.all || user.role === 'Super Admin' || user.role === 'admin') {
      return null; // null represents ALL
    }

    // Custom menu override on user
    if (user.menus && user.menus.length > 0) {
      return new Set(user.menus);
    }

    // Fallback to role menus
    return new Set(role.menus || []);
  });

  hasMenu(menuKey: string): boolean {
    const allowed = this.allowedMenus();
    if (allowed === null) return true; // all access
    return allowed.has(menuKey);
  }

  canAccessRoute(routePath: string): boolean {
    const allowed = this.allowedMenus();
    if (allowed === null) return true;

    // Route to menu key mapping
    const clean = routePath.split('?')[0].replace(/^\//, '');
    if (!clean || clean === 'dashboard') return allowed.has('dashboard');
    if (clean.startsWith('commercial/dashboard')) return allowed.has('commercial-dashboard') || allowed.has('dashboard');
    if (clean.startsWith('commercial/bills') || clean === 'sales' || clean === 'billing') return allowed.has('sales');
    if (clean.startsWith('commercial/clients') || clean === 'customers') return allowed.has('customers');
    if (clean.startsWith('projects')) return allowed.has('projects');
    if (clean.startsWith('commercial/inventory') || clean === 'inventory') return allowed.has('inventory');
    if (clean.startsWith('commercial/vendor-bills') || clean === 'purchase') return allowed.has('purchase');
    if (clean.startsWith('commercial/vendors') || clean === 'suppliers') return allowed.has('suppliers');
    if (clean.startsWith('commercial/cash-flow') || clean === 'cash-flow') return allowed.has('cash-flow');
    if (clean.startsWith('commercial/transfers') || clean === 'transfers') return allowed.has('transfers');
    if (clean.startsWith('commercial/shareholders') || clean === 'shareholders') return allowed.has('shareholders');
    if (clean.startsWith('employees')) return allowed.has('employees');
    if (clean.startsWith('attendance/manual') || clean === 'manual-attendance') return allowed.has('manual-attendance');
    if (clean.startsWith('attendance')) return allowed.has('attendance');
    if (clean.startsWith('leaves')) return allowed.has('leave');
    if (clean.startsWith('salary')) return allowed.has('payroll');
    if (clean.startsWith('reports')) return allowed.has('reports');
    if (clean.startsWith('access-control') || clean === 'access') return allowed.has('access');
    if (clean.startsWith('settings')) return allowed.has('settings');

    return true;
  }

  // ---------------- Role Management ----------------
  saveRole(roleData: RbacRole): Observable<any> {
    const list = this.roles();
    const existingIndex = list.findIndex((r) => r.name === roleData.name);
    let updated: RbacRole[];

    if (existingIndex > -1) {
      updated = [...list];
      updated[existingIndex] = { ...roleData };
    } else {
      updated = [...list, { ...roleData }];
    }

    this.roles.set(updated);
    this.saveLocal();

    return this.http.post<any>(`${this.baseUrl}/roles`, roleData).pipe(
      catchError(() => of({ status: 'ok', data: roleData }))
    );
  }

  deleteRole(roleName: string): Observable<any> {
    if (roleName === 'Super Admin') {
      return of({ status: 'error', message: 'Cannot delete Super Admin' });
    }

    const updated = this.roles().filter((r) => r.name !== roleName);
    this.roles.set(updated);
    this.saveLocal();

    return this.http.delete<any>(`${this.baseUrl}/roles/${encodeURIComponent(roleName)}`).pipe(
      catchError(() => of({ status: 'ok' }))
    );
  }

  // ---------------- User Management ----------------
  saveUser(userData: Partial<RbacUser> & { password?: string }): Observable<any> {
    const list = this.users();
    let updated: RbacUser[];
    const id = userData.id || `U${Date.now()}`;

    const existingIndex = list.findIndex((u) => u.id === id || (userData.email && u.email === userData.email));
    const userToSave: RbacUser = {
      id,
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'Viewer',
      menus: userData.menus !== undefined ? userData.menus : null,
      status: userData.status || 'Active',
      employeeId: userData.employeeId,
      designation: userData.designation,
    };

    if (existingIndex > -1) {
      updated = [...list];
      updated[existingIndex] = { ...list[existingIndex], ...userToSave };
    } else {
      updated = [...list, userToSave];
    }

    this.users.set(updated);
    this.saveLocal();

    return this.http.post<any>(`${this.baseUrl}/users`, { ...userData, id: userToSave.id }).pipe(
      catchError(() => of({ status: 'ok', data: userToSave }))
    );
  }

  deleteUser(userId: string): Observable<any> {
    const updated = this.users().filter((u) => u.id !== userId);
    this.users.set(updated);
    this.saveLocal();

    return this.http.delete<any>(`${this.baseUrl}/users/${userId}`).pipe(
      catchError(() => of({ status: 'ok' }))
    );
  }
}

