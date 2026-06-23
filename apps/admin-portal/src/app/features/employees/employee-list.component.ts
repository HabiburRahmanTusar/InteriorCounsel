import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'wfm-employee-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Employees</h1>
          <p class="text-sm text-slate-500">Manage workforce directory and shift schedules</p>
        </div>
        <button
          routerLink="/employees/new"
          class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl px-4 py-2.5 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add employee</span>
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Search directory</label>
          <input
            type="text"
            placeholder="Search by name, email or employee ID"
            class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
          />
        </div>
        <div class="w-full sm:w-48">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
          <div class="relative">
            <select
              class="w-full border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer pr-10"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70">
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Employee ID</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Name</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Email</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Designation</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span class="text-sm font-medium">No employees found</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginator -->
        <div class="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
          <span class="text-xs text-slate-500">Showing 0 of 0 employees</span>
          <div class="flex gap-2">
            <button class="border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors" disabled>Previous</button>
            <button class="border border-slate-200/80 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EmployeeListComponent {
  displayedColumns = ['employeeId', 'name', 'email', 'designation', 'status', 'actions'];
}
