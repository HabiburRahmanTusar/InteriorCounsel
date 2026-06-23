import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'wfm-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6 max-w-4xl">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p class="text-sm text-slate-500">Configure regional preferences, office geography, and validation rules</p>
      </div>

      <!-- Settings Card -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <!-- Tab Headers -->
        <div class="flex border-b border-slate-200 bg-slate-50/50 px-6">
          <button
            (click)="activeTab.set('office')"
            [class]="activeTab() === 'office' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-950'"
            class="px-4 py-4 border-b-2 text-sm font-medium transition-all outline-none"
          >
            Office locations
          </button>
          <button
            (click)="activeTab.set('rules')"
            [class]="activeTab() === 'rules' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-950'"
            class="px-4 py-4 border-b-2 text-sm font-medium transition-all outline-none"
          >
            Attendance rules
          </button>
          <button
            (click)="activeTab.set('company')"
            [class]="activeTab() === 'company' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-950'"
            class="px-4 py-4 border-b-2 text-sm font-medium transition-all outline-none"
          >
            Company
          </button>
        </div>

        <!-- Tab Body -->
        <div class="p-6 md:p-8">
          @if (activeTab() === 'office') {
            <div class="space-y-4">
              <div class="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-3 text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div class="space-y-1">
                  <h5 class="text-sm font-semibold text-slate-900">Geofencing parameters</h5>
                  <p class="text-xs text-slate-500 leading-relaxed">
                    Manage office locations (name, GPS coordinates, radius in metres). A Leaflet map
                    picker will be integrated in Phase 2.
                  </p>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'rules') {
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Default grace period (min)</label>
                  <input
                    type="number"
                    value="15"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Default office radius (m)</label>
                  <input
                    type="number"
                    value="200"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Default timezone</label>
                  <input
                    type="text"
                    value="UTC+6"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div class="flex justify-end pt-4 border-t border-slate-100">
                <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl px-6 py-2.5 transition-colors shadow-sm shadow-indigo-100">
                  Save Changes
                </button>
              </div>
            </div>
          }

          @if (activeTab() === 'company') {
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Company name</label>
                  <input
                    type="text"
                    placeholder="Enter company brand name"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Legal name</label>
                  <input
                    type="text"
                    placeholder="Enter official registered name"
                    class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div class="flex justify-end pt-4 border-t border-slate-100">
                <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl px-6 py-2.5 transition-colors shadow-sm shadow-indigo-100">
                  Save Changes
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  readonly activeTab = signal('office');
}
