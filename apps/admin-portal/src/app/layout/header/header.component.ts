import { Component, ChangeDetectionStrategy, signal, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService, AppTheme } from '../../core/services/theme.service';
import { CommandPaletteService } from '../../core/services/command-palette.service';
import { QuickToolsService } from '../../core/services/quick-tools.service';

@Component({
  selector: 'wfm-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly themeService = inject(ThemeService);
  readonly commandPalette = inject(CommandPaletteService);
  readonly quickTools = inject(QuickToolsService);

  @Output() readonly toggleSidebar = new EventEmitter<void>();

  readonly showDropdown = signal(false);
  readonly loggingOut = signal(false);

  toggleDropdown() {
    this.showDropdown.set(!this.showDropdown());
  }

  setTheme(theme: AppTheme) {
    this.themeService.setTheme(theme);
  }

  toggleDarkMode() {
    this.themeService.toggleDarkMode();
  }

  openSearch() {
    this.commandPalette.open();
  }

  openTools() {
    this.quickTools.toggle();
  }

  togglePresentationMode() {
    this.themeService.togglePresentationMode();
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
