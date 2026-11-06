import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { QuickToolsService, QuickToolTab } from '../../core/services/quick-tools.service';

export interface CalcHistoryItem {
  expression: string;
  result: string;
  time: string;
}

@Component({
  selector: 'wfm-quick-tools-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-tools-drawer.component.html',
})
export class QuickToolsDrawerComponent implements OnInit {
  private toolsService = inject(QuickToolsService);

  readonly isOpen = this.toolsService.isOpen;
  readonly activeTab = this.toolsService.activeTab;

  // Global feedback toast
  readonly copyFeedback = signal<string>('');

  // ==========================================
  // TAB 1: QUICK CALCULATOR STATE
  // ==========================================
  readonly calcInput = signal<string>('0');
  readonly calcEquation = signal<string>('');
  readonly isEvaluated = signal<boolean>(false);
  readonly calcHistory = signal<CalcHistoryItem[]>([]);
  private readonly CALC_HISTORY_KEY = 'attendly_calc_history';

  // ==========================================
  // TAB 2: AREA & COST ESTIMATOR STATE
  // ==========================================
  readonly estimatorUnit = signal<'ft' | 'm'>('ft');
  readonly length = signal<number>(0);
  readonly width = signal<number>(0);
  readonly ratePerUnit = signal<number>(0);
  readonly wastagePercent = signal<number>(0);

  // ==========================================
  // TAB 3: COMMERCIAL MARGIN CALCULATOR STATE
  // ==========================================
  readonly costPrice = signal<number>(0);
  readonly supplierDiscountPercent = signal<number>(0);
  readonly markupPercent = signal<number>(0);
  readonly taxPercent = signal<number>(0);

  // ==========================================
  // TAB 4: SCRATCHPAD STATE
  // ==========================================
  readonly scratchpadContent = signal<string>('');
  private readonly SCRATCHPAD_KEY = 'attendly_scratchpad_memo';

  ngOnInit() {
    const savedNotes = localStorage.getItem(this.SCRATCHPAD_KEY);
    if (savedNotes) {
      this.scratchpadContent.set(savedNotes);
    }

    try {
      const savedHist = localStorage.getItem(this.CALC_HISTORY_KEY);
      if (savedHist) {
        this.calcHistory.set(JSON.parse(savedHist));
      }
    } catch {
      // ignore
    }
  }

  setTab(tab: QuickToolTab) {
    this.toolsService.open(tab);
  }

  close() {
    this.toolsService.close();
  }

  // ==========================================
  // KEYBOARD LISTENER FOR CALCULATOR
  // ==========================================
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (!this.isOpen() || this.activeTab() !== 'calculator') return;

    // Do not capture if user is focusing a normal input or textarea
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }

    const key = event.key;
    if (key >= '0' && key <= '9') {
      event.preventDefault();
      this.inputDigit(key);
    } else if (key === '.') {
      event.preventDefault();
      this.inputDecimal();
    } else if (key === '+' || key === '-') {
      event.preventDefault();
      this.inputOperator(key);
    } else if (key === '*') {
      event.preventDefault();
      this.inputOperator('×');
    } else if (key === '/') {
      event.preventDefault();
      this.inputOperator('÷');
    } else if (key === 'Enter' || key === '=') {
      event.preventDefault();
      this.calculate();
    } else if (key === 'Backspace') {
      event.preventDefault();
      this.backspace();
    } else if (key.toLowerCase() === 'c') {
      event.preventDefault();
      this.clearAll();
    }
  }

  // ==========================================
  // CALCULATOR ACTIONS
  // ==========================================
  inputDigit(digit: string) {
    if (this.isEvaluated()) {
      this.calcInput.set(digit);
      this.calcEquation.set('');
      this.isEvaluated.set(false);
      return;
    }

    if (this.calcInput() === '0') {
      this.calcInput.set(digit);
    } else {
      this.calcInput.update((curr) => curr + digit);
    }
  }

  inputDecimal() {
    if (this.isEvaluated()) {
      this.calcInput.set('0.');
      this.calcEquation.set('');
      this.isEvaluated.set(false);
      return;
    }

    if (!this.calcInput().includes('.')) {
      this.calcInput.update((curr) => curr + '.');
    }
  }

  inputOperator(op: string) {
    if (this.isEvaluated()) {
      this.isEvaluated.set(false);
    }

    // Append current input and operator to equation
    const curr = this.calcInput();
    this.calcEquation.set(`${this.calcEquation()} ${curr} ${op}`.trim());
    this.calcInput.set('0');
  }

  calculate() {
    if (!this.calcEquation()) return;

    const fullExpr = `${this.calcEquation()} ${this.calcInput()}`.trim();
    try {
      // Normalize expression
      const sanitized = fullExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/[^0-9+\-*/. ()]/g, '');

      // Evaluate safely
      // eslint-disable-next-line no-new-func
      const resultVal = Function(`'use strict'; return (${sanitized})`)();

      if (typeof resultVal === 'number' && !isNaN(resultVal) && isFinite(resultVal)) {
        // Round to max 6 decimals if fractional
        const rounded = Math.round(resultVal * 1e6) / 1e6;
        const resultStr = String(rounded);

        const newHistory = [
          {
            expression: fullExpr,
            result: resultStr,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...this.calcHistory().slice(0, 9),
        ];
        this.calcHistory.set(newHistory);
        localStorage.setItem(this.CALC_HISTORY_KEY, JSON.stringify(newHistory));

        this.calcInput.set(resultStr);
        this.calcEquation.set('');
        this.isEvaluated.set(true);
      } else {
        this.calcInput.set('Error');
        this.isEvaluated.set(true);
      }
    } catch {
      this.calcInput.set('Error');
      this.isEvaluated.set(true);
    }
  }

  clearEntry() {
    this.calcInput.set('0');
  }

  clearAll() {
    this.calcInput.set('0');
    this.calcEquation.set('');
    this.isEvaluated.set(false);
  }

  backspace() {
    if (this.isEvaluated()) {
      this.clearAll();
      return;
    }
    const curr = this.calcInput();
    if (curr.length > 1) {
      this.calcInput.set(curr.slice(0, -1));
    } else {
      this.calcInput.set('0');
    }
  }

  toggleSign() {
    const val = parseFloat(this.calcInput());
    if (!isNaN(val)) {
      this.calcInput.set(String(-val));
    }
  }

  percent() {
    const val = parseFloat(this.calcInput());
    if (!isNaN(val)) {
      this.calcInput.set(String(val / 100));
    }
  }

  square() {
    const val = parseFloat(this.calcInput());
    if (!isNaN(val)) {
      const res = Math.round(Math.pow(val, 2) * 1e6) / 1e6;
      this.calcInput.set(String(res));
      this.isEvaluated.set(true);
    }
  }

  squareRoot() {
    const val = parseFloat(this.calcInput());
    if (!isNaN(val) && val >= 0) {
      const res = Math.round(Math.sqrt(val) * 1e6) / 1e6;
      this.calcInput.set(String(res));
      this.isEvaluated.set(true);
    }
  }

  reuseHistory(item: CalcHistoryItem) {
    this.calcInput.set(item.result);
    this.isEvaluated.set(true);
  }

  clearHistory() {
    this.calcHistory.set([]);
    localStorage.removeItem(this.CALC_HISTORY_KEY);
  }

  sendCalcToScratchpad() {
    const text = `Calc: ${this.calcInput()}\n`;
    this.updateScratchpad(this.scratchpadContent() + text);
    this.copyFeedback.set('Saved to Scratchpad!');
    setTimeout(() => this.copyFeedback.set(''), 2000);
  }

  // ==========================================
  // AREA ESTIMATOR CALCULATIONS
  // ==========================================
  readonly baseArea = computed(() => {
    return Math.max(0, this.length() * this.width());
  });

  readonly areaInOtherUnit = computed(() => {
    if (this.estimatorUnit() === 'ft') {
      return this.baseArea() / 10.7639;
    } else {
      return this.baseArea() * 10.7639;
    }
  });

  readonly areaWithWastage = computed(() => {
    const buffer = 1 + this.wastagePercent() / 100;
    return this.baseArea() * buffer;
  });

  readonly perimeterRunningLength = computed(() => {
    return Math.max(0, 2 * (this.length() + this.width()));
  });

  readonly totalEstimatedCost = computed(() => {
    return this.areaWithWastage() * this.ratePerUnit();
  });

  // ==========================================
  // MARGIN CALCULATIONS
  // ==========================================
  readonly netSupplierCost = computed(() => {
    const discount = (this.costPrice() * this.supplierDiscountPercent()) / 100;
    return Math.max(0, this.costPrice() - discount);
  });

  readonly sellingPrice = computed(() => {
    const markup = (this.netSupplierCost() * this.markupPercent()) / 100;
    return this.netSupplierCost() + markup;
  });

  readonly grossProfit = computed(() => {
    return this.sellingPrice() - this.netSupplierCost();
  });

  readonly taxAmount = computed(() => {
    return (this.sellingPrice() * this.taxPercent()) / 100;
  });

  readonly finalClientBill = computed(() => {
    return this.sellingPrice() + this.taxAmount();
  });

  // ==========================================
  // SCRATCHPAD & CLIPBOARD METHODS
  // ==========================================
  updateScratchpad(text: string) {
    this.scratchpadContent.set(text);
    localStorage.setItem(this.SCRATCHPAD_KEY, text);
  }

  clearScratchpad() {
    this.scratchpadContent.set('');
    localStorage.removeItem(this.SCRATCHPAD_KEY);
  }

  copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.copyFeedback.set(label);
      setTimeout(() => this.copyFeedback.set(''), 2000);
    });
  }

  copyEstimatorSummary() {
    const u = this.estimatorUnit();
    const otherU = u === 'ft' ? 'm²' : 'sq. ft';
    const text = `📐 Area Estimate:
Dimensions: ${this.length()} x ${this.width()} ${u}
Base Area: ${this.baseArea().toFixed(2)} ${u === 'ft' ? 'sq. ft' : 'm²'} (${this.areaInOtherUnit().toFixed(2)} ${otherU})
Running Perimeter: ${this.perimeterRunningLength().toFixed(2)} ${u}
Wastage: +${this.wastagePercent()}% (${this.areaWithWastage().toFixed(2)} ${u === 'ft' ? 'sq. ft' : 'm²'})
Rate: $${this.ratePerUnit()}/${u === 'ft' ? 'sqft' : 'sqm'}
Total Estimated Cost: $${this.totalEstimatedCost().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    this.copyToClipboard(text, 'Estimator Summary Copied!');
  }

  copyMarginSummary() {
    const text = `💰 Commercial Margin Breakdown:
Original Vendor Price: $${this.costPrice().toFixed(2)}
Supplier Discount: ${this.supplierDiscountPercent()}% (Net Cost: $${this.netSupplierCost().toFixed(2)})
Markup / Profit: ${this.markupPercent()}% (Gross Profit: $${this.grossProfit().toFixed(2)})
Client Selling Price: $${this.sellingPrice().toFixed(2)}
Tax / VAT (${this.taxPercent()}%): $${this.taxAmount().toFixed(2)}
Grand Total to Client: $${this.finalClientBill().toFixed(2)}`;
    this.copyToClipboard(text, 'Margin Summary Copied!');
  }
}
