import { Injectable, signal } from '@angular/core';

export type QuickToolTab = 'calculator' | 'estimator' | 'margins' | 'scratchpad';

@Injectable({
  providedIn: 'root',
})
export class QuickToolsService {
  readonly isOpen = signal<boolean>(false);
  readonly activeTab = signal<QuickToolTab>('calculator');

  open(tab: QuickToolTab = 'calculator') {
    this.activeTab.set(tab);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  toggle(tab?: QuickToolTab) {
    if (this.isOpen() && (!tab || tab === this.activeTab())) {
      this.isOpen.set(false);
    } else {
      if (tab) this.activeTab.set(tab);
      this.isOpen.set(true);
    }
  }
}
