import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'wfm-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly showDropdown = signal(false);
  readonly loggingOut = signal(false);

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
    this.loggingOut.set(true);
    this.auth
      .logout()
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loggingOut.set(false)),
      )
      .subscribe({
        next: () => this.router.navigate(['/login']),
      });
  }
}
