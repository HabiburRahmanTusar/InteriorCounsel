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

  readonly salesOpen = signal(true);
  readonly inventoryOpen = signal(true);
  readonly financeOpen = signal(true);
  readonly hrOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly reportsOpen = signal(false);

  toggleSales() {
    this.salesOpen.update((v) => !v);
  }

  toggleInventory() {
    this.inventoryOpen.update((v) => !v);
  }

  toggleFinance() {
    this.financeOpen.update((v) => !v);
  }

  toggleHr() {
    this.hrOpen.update((v) => !v);
  }

  toggleSettings() {
    this.settingsOpen.update((v) => !v);
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
