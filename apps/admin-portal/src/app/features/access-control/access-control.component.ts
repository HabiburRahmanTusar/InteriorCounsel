import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RbacService, RbacRole, RbacUser, MenuGroup } from '../../core/services/rbac.service';
import { EmployeeService } from '../../core/services/employee.service';

@Component({
  selector: 'wfm-access-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './access-control.component.html',
})
export class AccessControlComponent implements OnInit {
  private rbacService = inject(RbacService);
  private employeeService = inject(EmployeeService);

  readonly roles = this.rbacService.roles;
  readonly users = this.rbacService.users;
  readonly menuGroups: MenuGroup[] = this.rbacService.menuGroups;

  readonly activeTab = signal<'users' | 'roles'>('users');
  readonly employeeList = signal<any[]>([]);

  // Modals
  readonly showUserModal = signal(false);
  readonly showRoleModal = signal(false);
  readonly toastMessage = signal<string | null>(null);

  // User Form Model
  userForm: {
    id: string;
    name: string;
    email: string;
    password: string;
    role: string;
    status: 'Active' | 'Inactive';
    hasCustomMenus: boolean;
    menus: string[];
  } = {
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'Viewer',
    status: 'Active',
    hasCustomMenus: false,
    menus: [],
  };

  // Role Form Model
  roleForm: {
    name: string;
    oldName?: string;
    all: boolean;
    menus: string[];
    isLocked: boolean;
  } = {
    name: '',
    all: false,
    menus: ['dashboard'],
    isLocked: false,
  };

  ngOnInit() {
    this.employeeService.list({ limit: 100 }).subscribe({
      next: (res) => {
        this.employeeList.set(res.data || []);
      },
      error: () => {},
    });
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  // --- Users Tab Logic ---
  openAddUserModal() {
    this.userForm = {
      id: '',
      name: '',
      email: '',
      password: '',
      role: 'Viewer',
      status: 'Active',
      hasCustomMenus: false,
      menus: [],
    };
    this.showUserModal.set(true);
  }

  openEditUserModal(u: RbacUser) {
    const roleObj = this.roles().find((r) => r.name === u.role);
    const initialMenus = u.menus && u.menus.length ? [...u.menus] : (roleObj?.menus ? [...roleObj.menus] : []);

    this.userForm = {
      id: u.id,
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      status: u.status,
      hasCustomMenus: !!(u.menus && u.menus.length),
      menus: initialMenus,
    };
    this.showUserModal.set(true);
  }

  onUserRoleChange() {
    if (!this.userForm.hasCustomMenus) {
      const roleObj = this.roles().find((r) => r.name === this.userForm.role);
      this.userForm.menus = roleObj ? [...roleObj.menus] : [];
    }
  }

  toggleUserCustomMenus() {
    if (this.userForm.hasCustomMenus) {
      const roleObj = this.roles().find((r) => r.name === this.userForm.role);
      this.userForm.menus = roleObj ? [...roleObj.menus] : [];
    }
  }

  isMenuCheckedForUser(menuId: string): boolean {
    return this.userForm.menus.includes(menuId);
  }

  toggleMenuForUser(menuId: string, group?: MenuGroup) {
    if (!this.userForm.hasCustomMenus) return;

    const idx = this.userForm.menus.indexOf(menuId);
    if (idx > -1) {
      this.userForm.menus.splice(idx, 1);
    } else {
      this.userForm.menus.push(menuId);
    }

    // Cascade if item has children or is parent
    if (group) {
      const item = group.items.find((it) => it.id === menuId);
      if (item && item.children) {
        if (this.userForm.menus.includes(menuId)) {
          item.children.forEach((c) => {
            if (!this.userForm.menus.includes(c.id)) this.userForm.menus.push(c.id);
          });
        } else {
          item.children.forEach((c) => {
            const cIdx = this.userForm.menus.indexOf(c.id);
            if (cIdx > -1) this.userForm.menus.splice(cIdx, 1);
          });
        }
      }
    }
  }

  saveUser() {
    if (!this.userForm.name.trim() || !this.userForm.email.trim()) {
      alert('Name and email are required');
      return;
    }

    const payload: Partial<RbacUser> & { password?: string } = {
      id: this.userForm.id || undefined,
      name: this.userForm.name.trim(),
      email: this.userForm.email.trim().toLowerCase(),
      role: this.userForm.role,
      status: this.userForm.status,
      menus: this.userForm.hasCustomMenus ? this.userForm.menus : null,
      password: this.userForm.password.trim() || undefined,
    };

    this.rbacService.saveUser(payload).subscribe({
      next: () => {
        this.showUserModal.set(false);
        this.showToast(this.userForm.id ? 'User updated successfully' : 'User added successfully');
      },
      error: () => alert('Failed to save user'),
    });
  }

  deleteUser(u: RbacUser) {
    if (confirm(`Are you sure you want to remove user "${u.name}"?`)) {
      this.rbacService.deleteUser(u.id).subscribe({
        next: () => this.showToast(`User "${u.name}" removed`),
        error: () => alert('Failed to remove user'),
      });
    }
  }

  // --- Roles Tab Logic ---
  openAddRoleModal() {
    this.roleForm = {
      name: '',
      all: false,
      menus: ['dashboard'],
      isLocked: false,
    };
    this.showRoleModal.set(true);
  }

  openEditRoleModal(r: RbacRole) {
    this.roleForm = {
      name: r.name,
      oldName: r.name,
      all: !!r.all,
      menus: r.all ? [] : [...r.menus],
      isLocked: r.name === 'Super Admin' || !!r.all,
    };
    this.showRoleModal.set(true);
  }

  isMenuCheckedForRole(menuId: string): boolean {
    if (this.roleForm.all) return true;
    return this.roleForm.menus.includes(menuId);
  }

  toggleMenuForRole(menuId: string, group?: MenuGroup) {
    if (this.roleForm.isLocked) return;

    const idx = this.roleForm.menus.indexOf(menuId);
    if (idx > -1) {
      this.roleForm.menus.splice(idx, 1);
    } else {
      this.roleForm.menus.push(menuId);
    }

    if (group) {
      const item = group.items.find((it) => it.id === menuId);
      if (item && item.children) {
        if (this.roleForm.menus.includes(menuId)) {
          item.children.forEach((c) => {
            if (!this.roleForm.menus.includes(c.id)) this.roleForm.menus.push(c.id);
          });
        } else {
          item.children.forEach((c) => {
            const cIdx = this.roleForm.menus.indexOf(c.id);
            if (cIdx > -1) this.roleForm.menus.splice(cIdx, 1);
          });
        }
      }
    }
  }

  saveRole() {
    if (!this.roleForm.name.trim()) {
      alert('Role name is required');
      return;
    }

    const payload: RbacRole = {
      name: this.roleForm.name.trim(),
      all: this.roleForm.all,
      menus: this.roleForm.all ? [] : this.roleForm.menus,
    };

    this.rbacService.saveRole(payload).subscribe({
      next: () => {
        this.showRoleModal.set(false);
        this.showToast(`Role "${payload.name}" saved successfully`);
      },
      error: () => alert('Failed to save role'),
    });
  }

  deleteRole(r: RbacRole) {
    if (r.name === 'Super Admin') {
      alert('Super Admin cannot be deleted');
      return;
    }

    if (confirm(`Are you sure you want to delete role "${r.name}"? Users with this role will lose their assigned menus.`)) {
      this.rbacService.deleteRole(r.name).subscribe({
        next: () => this.showToast(`Role "${r.name}" deleted`),
        error: () => alert('Failed to delete role'),
      });
    }
  }

  getUsersCountForRole(roleName: string): number {
    return this.users().filter((u) => u.role === roleName).length;
  }
}

