import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  HostListener,
  ElementRef,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CommandPaletteService, CommandItem } from '../../core/services/command-palette.service';
import { ThemeService } from '../../core/services/theme.service';
import { QuickToolsService } from '../../core/services/quick-tools.service';

@Component({
  selector: 'wfm-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './command-palette.component.html',
})
export class CommandPaletteComponent {
  private paletteService = inject(CommandPaletteService);
  private themeService = inject(ThemeService);
  private quickToolsService = inject(QuickToolsService);
  private router = inject(Router);

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly isOpen = this.paletteService.isOpen;
  readonly searchQuery = signal('');
  readonly selectedIndex = signal(0);

  // Focus input when opened
  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.searchQuery.set('');
        this.selectedIndex.set(0);
        setTimeout(() => {
          this.searchInputRef?.nativeElement.focus();
        }, 50);
      }
    });
  }

  // Global keyboard shortcut listener for Ctrl+K, Cmd+K, and Ctrl+J
  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcut(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.paletteService.toggle();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
      event.preventDefault();
      this.quickToolsService.toggle();
    } else if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }

  readonly commands: CommandItem[] = [
    // Theme & Mode Actions
    {
      id: 'theme-toggle',
      title: 'Toggle Dark / Light Mode',
      description: 'Switch between dark and light appearance',
      category: 'Theme',
      icon: 'moon',
      shortcut: 'Alt + T',
      action: () => this.themeService.toggleDarkMode(),
    },
    {
      id: 'theme-system',
      title: 'Use System Theme Preference',
      description: 'Automatically match your OS dark/light setting',
      category: 'Theme',
      icon: 'sparkles',
      action: () => this.themeService.setTheme('system'),
    },
    {
      id: 'presentation-mode',
      title: 'Toggle Client Presentation Mode',
      description: 'Mask sensitive salary & cost figures for client display',
      category: 'Theme',
      icon: 'eye-off',
      action: () => this.themeService.togglePresentationMode(),
    },

    // Tools & Quick Utilities
    {
      id: 'tool-calculator',
      title: 'Standard Quick Calculator',
      description: 'Quick math calculations with tape history & keyboard support',
      category: 'Interior & Tools',
      icon: 'calculator',
      shortcut: 'Ctrl + J',
      action: () => this.quickToolsService.open('calculator'),
    },
    {
      id: 'tool-estimator',
      title: 'Interior Area & Sq. Ft Estimator',
      description: 'Calculate square footage, area conversion & material costs',
      category: 'Interior & Tools',
      icon: 'calculator',
      shortcut: 'Ctrl + J',
      action: () => this.quickToolsService.open('estimator'),
    },
    {
      id: 'tool-margins',
      title: 'Margin & Markup Commercial Calculator',
      description: 'Calculate supplier discounts, client markup & GST/Tax',
      category: 'Interior & Tools',
      icon: 'currency',
      action: () => this.quickToolsService.open('margins'),
    },
    {
      id: 'tool-scratchpad',
      title: 'Quick Scratchpad & Site Notes',
      description: 'Private auto-saving scratchpad for measurements & memos',
      category: 'Interior & Tools',
      icon: 'pencil',
      action: () => this.quickToolsService.open('scratchpad'),
    },

    // Navigation - Commercial & Projects
    {
      id: 'nav-commercial-dash',
      title: 'Executive Analytics & Commercial Dashboard',
      description: 'Revenue, project profitability, and commercial metrics',
      category: 'Navigation',
      icon: 'chart-bar',
      action: () => this.navigate('/commercial/dashboard'),
    },
    {
      id: 'nav-dashboard',
      title: 'HR & Workforce Dashboard',
      description: 'Attendance statistics, employee presence & leaves',
      category: 'Navigation',
      icon: 'view-grid',
      action: () => this.navigate('/dashboard'),
    },
    {
      id: 'nav-projects',
      title: 'Projects & Interior Sites',
      description: 'Active design projects, stages and timelines',
      category: 'Navigation',
      icon: 'briefcase',
      action: () => this.navigate('/commercial/projects'),
    },
    {
      id: 'nav-billing',
      title: 'Quotations & Client Billing',
      description: 'Generate estimates, bills, and track receivables',
      category: 'Navigation',
      icon: 'document-text',
      action: () => this.navigate('/commercial/billing'),
    },
    {
      id: 'nav-vendor-bills',
      title: 'Vendor & Supplier Bills',
      description: 'Track material purchases, payables, and discounts',
      category: 'Navigation',
      icon: 'receipt-tax',
      action: () => this.navigate('/commercial/vendor-bills'),
    },
    {
      id: 'nav-inventory',
      title: 'Inventory & Materials Catalog',
      description: 'Stock levels, furniture items, and interior materials',
      category: 'Navigation',
      icon: 'archive',
      action: () => this.navigate('/commercial/inventory'),
    },
    {
      id: 'nav-clients',
      title: 'Client Directory',
      description: 'Manage clients, contact persons, and ledgers',
      category: 'Navigation',
      icon: 'user-group',
      action: () => this.navigate('/commercial/clients'),
    },
    {
      id: 'nav-vendors',
      title: 'Suppliers & Vendors Directory',
      description: 'Supplier contacts, trade terms, and catalogs',
      category: 'Navigation',
      icon: 'truck',
      action: () => this.navigate('/commercial/vendors'),
    },

    // Navigation - Workforce
    {
      id: 'nav-employees',
      title: 'Employee Directory',
      description: 'Staff list, contracts, departments & designations',
      category: 'Navigation',
      icon: 'users',
      action: () => this.navigate('/employees'),
    },
    {
      id: 'nav-attendance-view',
      title: 'Live Attendance & Geo-Map',
      description: 'Real-time check-ins and field location radar',
      category: 'Navigation',
      icon: 'location-marker',
      action: () => this.navigate('/attendance/view'),
    },
    {
      id: 'nav-leaves-requests',
      title: 'Leave Requests & Approvals',
      description: 'Pending leave applications and approvals',
      category: 'Navigation',
      icon: 'calendar',
      action: () => this.navigate('/leaves/requests'),
    },
    {
      id: 'nav-salary-overview',
      title: 'Salary & Payroll Overview',
      description: 'Monthly payroll processing, deductions & payslips',
      category: 'Navigation',
      icon: 'cash',
      action: () => this.navigate('/salary/overview'),
    },
    {
      id: 'nav-access-control',
      title: 'Access Control & Permissions (RBAC)',
      description: 'Role-based access rules and feature permissions',
      category: 'Navigation',
      icon: 'shield-check',
      action: () => this.navigate('/access-control'),
    },
    {
      id: 'nav-settings',
      title: 'System Settings',
      description: 'Company profile, working hours and general options',
      category: 'Navigation',
      icon: 'cog',
      action: () => this.navigate('/settings'),
    },
  ];

  readonly filteredCommands = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.commands;
    return this.commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
    );
  });

  close() {
    this.paletteService.close();
  }

  navigate(path: string) {
    this.close();
    this.router.navigateByUrl(path);
  }

  execute(command: CommandItem) {
    this.close();
    command.action();
  }

  onKeyDown(event: KeyboardEvent) {
    const count = this.filteredCommands().length;
    if (count === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = this.filteredCommands()[this.selectedIndex()];
      if (selected) {
        this.execute(selected);
      }
    }
  }
}
