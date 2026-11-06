import { Injectable, signal } from '@angular/core';

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: 'Navigation' | 'Actions' | 'Interior & Tools' | 'Theme';
  icon?: string;
  shortcut?: string;
  action: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class CommandPaletteService {
  readonly isOpen = signal<boolean>(false);

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  toggle() {
    this.isOpen.set(!this.isOpen());
  }
}

