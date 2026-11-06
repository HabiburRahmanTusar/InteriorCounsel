import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CommandPaletteComponent } from '../command-palette/command-palette.component';
import { QuickToolsDrawerComponent } from '../quick-tools/quick-tools-drawer.component';
import { ThemeService } from '../../core/services/theme.service';
import { QuickToolsService } from '../../core/services/quick-tools.service';
import { CommandPaletteService } from '../../core/services/command-palette.service';

@Component({
  selector: 'wfm-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    SidebarComponent,
    CommandPaletteComponent,
    QuickToolsDrawerComponent,
  ],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  readonly mobileSidebarOpen = signal(false);
  readonly themeService = inject(ThemeService);
  readonly quickToolsService = inject(QuickToolsService);
  readonly commandPaletteService = inject(CommandPaletteService);

  readonly speedDialOpen = signal(false);

  toggleSidebar() {
    this.mobileSidebarOpen.set(!this.mobileSidebarOpen());
  }

  toggleSpeedDial() {
    this.speedDialOpen.set(!this.speedDialOpen());
  }
}
