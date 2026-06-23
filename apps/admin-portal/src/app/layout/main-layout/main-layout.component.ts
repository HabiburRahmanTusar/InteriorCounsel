import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'wfm-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    SidebarComponent,
  ],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50">
      <!-- Sidebar -->
      <aside class="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col">
        <wfm-sidebar class="h-full"></wfm-sidebar>
      </aside>

      <!-- Main container -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <wfm-header></wfm-header>

        <!-- Main content area -->
        <main class="flex-1 overflow-y-auto p-6 md:p-8">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class MainLayoutComponent {}
