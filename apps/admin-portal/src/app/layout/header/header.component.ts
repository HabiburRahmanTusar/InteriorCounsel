import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'wfm-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-30">
      <div class="flex items-center gap-4">
        <span class="text-slate-900 font-semibold text-lg tracking-tight">Workforce Management</span>
      </div>

      <!-- Dropdown -->
      <div class="relative">
        <button
          (click)="toggleDropdown()"
          class="flex items-center gap-2 hover:bg-slate-100/80 px-3 py-1.5 rounded-xl transition-all select-none"
        >
          <!-- User avatar / icon placeholder -->
          <div class="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
            {{ userInitial() }}
          </div>
          <span class="text-slate-700 font-medium text-sm hidden sm:inline">{{ userName() }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 transition-transform duration-200" [class.rotate-180]="showDropdown()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        @if (showDropdown()) {
          <!-- Click outer mask to close dropdown -->
          <div class="fixed inset-0 z-40" (click)="showDropdown.set(false)"></div>

          <div class="absolute right-0 mt-2 w-48 bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-lg shadow-slate-100 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              (click)="logout()"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        }
      </div>
    </header>
  `,
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly showDropdown = signal(false);

  toggleDropdown() {
    this.showDropdown.set(!this.showDropdown());
  }

  userName() {
    return this.auth.currentUser()?.name ?? 'Account';
  }

  userInitial() {
    const name = this.userName();
    return name ? name.charAt(0).toUpperCase() : 'A';
  }

  logout() {
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }
}
