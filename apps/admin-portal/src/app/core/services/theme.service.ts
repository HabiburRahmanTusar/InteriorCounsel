import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppTheme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly STORAGE_KEY = 'attendly_theme_preference';

  readonly theme = signal<AppTheme>('system');
  readonly isDark = signal<boolean>(false);
  readonly presentationMode = signal<boolean>(false);

  private mediaQueryListener?: (e: MediaQueryListEvent) => void;

  constructor() {
    if (this.isBrowser) {
      this.initTheme();
    }
  }

  private initTheme() {
    const savedTheme = (localStorage.getItem(this.STORAGE_KEY) as AppTheme) || 'system';
    this.theme.set(savedTheme);
    this.applyTheme(savedTheme);

    // Watch for OS theme changes if on 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQueryListener = (e: MediaQueryListEvent) => {
      if (this.theme() === 'system') {
        this.applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', this.mediaQueryListener);
  }

  setTheme(newTheme: AppTheme) {
    this.theme.set(newTheme);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, newTheme);
      this.applyTheme(newTheme);
    }
  }

  toggleDarkMode() {
    const nextTheme = this.isDark() ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  togglePresentationMode() {
    const nextVal = !this.presentationMode();
    this.presentationMode.set(nextVal);
    if (this.isBrowser) {
      if (nextVal) {
        document.body.classList.add('presentation-mode');
      } else {
        document.body.classList.remove('presentation-mode');
      }
    }
  }

  private applyTheme(targetTheme: AppTheme) {
    if (!this.isBrowser) return;

    let shouldBeDark = false;
    if (targetTheme === 'dark') {
      shouldBeDark = true;
    } else if (targetTheme === 'system') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    this.isDark.set(shouldBeDark);

    const root = document.documentElement;
    if (shouldBeDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }
}

