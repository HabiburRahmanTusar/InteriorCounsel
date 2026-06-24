import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'wfm-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="h-full flex flex-col justify-between p-4 bg-white">
      <div class="flex flex-col gap-6">
        <!-- Brand/Logo area -->
        <div class="flex items-center gap-2 px-2 py-3 border-b border-slate-100">
          <div
            class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base"
          >
            A
          </div>
          <span class="text-slate-950 font-bold text-base tracking-wide">Attendly</span>
        </div>

        <!-- Navigation list -->
        <nav class="flex flex-col gap-1.5">
          @if (currentRole() !== 'employee') {
            <a
              routerLink="/dashboard"
              routerLinkActive="bg-indigo-50 text-indigo-600 font-semibold"
              [routerLinkActiveOptions]="{ exact: true }"
              class="flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
                />
              </svg>
              <span>Dashboard</span>
            </a>

            <a
              routerLink="/employees"
              routerLinkActive="bg-indigo-50 text-indigo-600 font-semibold"
              class="flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span>Employees</span>
            </a>

            <a
              routerLink="/shifts"
              routerLinkActive="bg-indigo-50 text-indigo-600 font-semibold"
              class="flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Shifts</span>
            </a>
          }

          <a
            routerLink="/attendance"
            routerLinkActive="bg-indigo-50 text-indigo-600 font-semibold"
            class="flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950 px-4 py-3 rounded-xl text-sm font-medium transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <span>Attendance</span>
          </a>

          @if (currentRole() !== 'employee') {
            <a
              routerLink="/reports"
              routerLinkActive="bg-indigo-50 text-indigo-600 font-semibold"
              class="flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Reports</span>
            </a>

            <a
              routerLink="/settings"
              routerLinkActive="bg-indigo-50 text-indigo-600 font-semibold"
              class="flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Settings</span>
            </a>
          } @else {
            <a
              routerLink="/profile"
              routerLinkActive="bg-indigo-50 text-indigo-600 font-semibold"
              class="flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>My Profile</span>
            </a>

            <a
              routerLink="/change-password"
              routerLinkActive="bg-indigo-50 text-indigo-600 font-semibold"
              class="flex items-center gap-3 text-slate-600 hover:bg-slate-50 hover:text-slate-950 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 7a2 2 0 012 2m-5 8a3 3 0 11-6 0 3 3 0 016 0zM19 19l-4-4m0-7A7 7 0 113 8a7 7 0 0114 0z"
                />
              </svg>
              <span>Change Password</span>
            </a>

            <button
              (click)="logout()"
              [disabled]="loggingOut()"
              class="w-full flex items-center gap-3 text-slate-600 hover:bg-rose-50 hover:text-rose-600 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>{{ loggingOut() ? 'Signing out...' : 'Sign out' }}</span>
            </button>
          }
        </nav>
      </div>

      <!-- Footer/Info inside sidebar -->
      <div class="px-3 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
        <p class="text-xs text-slate-500 font-semibold capitalize">
          Logged in as {{ currentRole() }}
        </p>
      </div>
    </div>
  `,
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly currentRole = this.auth.currentRole;
  readonly loggingOut = signal(false);

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
