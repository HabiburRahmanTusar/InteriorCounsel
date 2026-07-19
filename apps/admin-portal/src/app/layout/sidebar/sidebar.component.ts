import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'wfm-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly currentRole = this.auth.currentRole;
  readonly loggingOut = signal(false);
  readonly settingsOpen = signal(false);
  readonly calendarOpen = signal(false);
  readonly leavesOpen = signal(false);
  readonly salaryOpen = signal(false);
  readonly reportsOpen = signal(false);


  toggleSettings() {
    this.settingsOpen.update((v) => !v);
  }

  toggleSalary() {
    this.salaryOpen.update((v) => !v);
  }

  toggleCalendar() {
    this.calendarOpen.update((v) => !v);
  }

  toggleLeaves() {
    this.leavesOpen.update((v) => !v);
  }

  toggleReports() {
    this.reportsOpen.update((v) => !v);
  }

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
