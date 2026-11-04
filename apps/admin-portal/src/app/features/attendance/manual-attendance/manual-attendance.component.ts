import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AttendanceService } from '../../../core/services/attendance.service';
import { EmployeeService } from '../../../core/services/employee.service';

export interface ManualEntry {
  id?: string;
  empId: string;
  name: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave';
  note?: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_KEY = 'ic_erp_manual_attendance';

@Component({
  selector: 'wfm-manual-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manual-attendance.component.html',
})
export class ManualAttendanceComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private employeeService = inject(EmployeeService);

  readonly employees = signal<any[]>([]);
  readonly manualEntries = signal<ManualEntry[]>([]);
  readonly filterEmployee = signal<string>('');
  readonly toastMessage = signal<string | null>(null);

  // Form State
  todayIso = new Date().toISOString().slice(0, 10);
  selectedEmpId = '';
  selectedDate = new Date().toISOString().slice(0, 10);
  checkInTime = '';
  checkOutTime = '';
  selectedStatus: 'Auto' | 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' = 'Auto';
  note = '';

  // Dynamic record hint
  recordHint = signal<string>('');

  ngOnInit() {
    this.loadEmployees();
    this.loadSavedEntries();
    this.loadRemoteEntries();
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }

  loadEmployees() {
    this.employeeService.list({ limit: 150 }).subscribe({
      next: (res) => {
        this.employees.set(res.data || []);
      },
    });
  }

  loadSavedEntries() {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) {
        this.manualEntries.set(saved);
      }
    } catch {}
  }

  saveLocal() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.manualEntries()));
    } catch {}
  }

  loadRemoteEntries() {
    this.attendanceService.getManualList().subscribe({
      next: (res) => {
        if (res && res.data && res.data.length) {
          const list = res.data.map((r: any) => ({
            id: r._id,
            empId: r.employeeId?.employeeId || r.employeeId?._id || '',
            name: r.employeeId?.name || 'Employee',
            date: r.attendanceDate ? new Date(r.attendanceDate).toISOString().slice(0, 10) : '',
            checkIn: r.checkInTime ? `${r.checkInTime} ${r.checkInPeriod || ''}`.trim() : (r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'),
            checkOut: r.checkOutTime ? `${r.checkOutTime} ${r.checkOutPeriod || ''}`.trim() : (r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'),
            hours: r.workingHoursDisplay || `${Math.floor((r.workingMinutes || 0) / 60)}h ${(r.workingMinutes || 0) % 60}m`,
            status: r.status === 'leave' ? 'On Leave' : (r.status === 'absent' ? 'Absent' : (r.late ? 'Late' : 'Present')),
            note: r.note || '',
            updatedAt: r.updatedAt,
          }));

          // Merge with local entries
          const merged = [...list];
          for (const local of this.manualEntries()) {
            if (!merged.some((m) => m.empId === local.empId && m.date === local.date)) {
              merged.push(local);
            }
          }
          this.manualEntries.set(merged);
          this.saveLocal();
        }
      },
      error: () => {},
    });
  }

  onSelectionChange() {
    if (!this.selectedEmpId || !this.selectedDate) {
      this.recordHint.set('');
      return;
    }

    const existing = this.manualEntries().find(
      (m) => m.empId === this.selectedEmpId && m.date === this.selectedDate
    );

    if (existing) {
      this.recordHint.set(
        `Existing record: ${existing.status} • In ${existing.checkIn} • Out ${existing.checkOut}. Saving will update it.`
      );
      // Pre-fill
      if (existing.checkIn && existing.checkIn !== '-') {
        this.checkInTime = this.to24(existing.checkIn);
      }
      if (existing.checkOut && existing.checkOut !== '-') {
        this.checkOutTime = this.to24(existing.checkOut);
      }
      this.selectedStatus = existing.status;
      this.note = existing.note || '';
    } else {
      this.recordHint.set('No attendance on this date yet — saving will create it.');
    }
  }

  to24(timeStr: string): string {
    const m = /^(\d+):(\d+)\s*(AM|PM)?$/i.exec(timeStr.trim());
    if (!m) return timeStr;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ap = m[3] ? m[3].toUpperCase() : '';
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }

  to12(time24: string): { time: string; period: string } {
    if (!time24) return { time: '-', period: '' };
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return { time: `${String(h).padStart(2, '0')}:${m}`, period };
  }

  saveAttendance() {
    if (!this.selectedEmpId || !this.selectedDate) {
      alert('Please select an Employee and a Date');
      return;
    }

    if (this.selectedDate > this.todayIso) {
      alert('Attendance cannot be recorded for a future date');
      return;
    }

    const emp = this.employees().find(
      (e) => e._id === this.selectedEmpId || e.employeeId === this.selectedEmpId
    );
    const empName = emp?.name || 'Employee';
    const empCode = emp?.employeeId || this.selectedEmpId;

    let computedStatus: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' = 'Present';
    let checkInDisplay = '-';
    let checkOutDisplay = '-';
    let hoursDisplay = '0h 00m';

    if (this.selectedStatus === 'Absent') {
      computedStatus = 'Absent';
    } else if (this.selectedStatus === 'On Leave') {
      computedStatus = 'On Leave';
    } else {
      if (!this.checkInTime || !this.checkOutTime) {
        alert('Please enter both Check In and Check Out time');
        return;
      }

      const in12 = this.to12(this.checkInTime);
      const out12 = this.to12(this.checkOutTime);
      checkInDisplay = `${in12.time} ${in12.period}`;
      checkOutDisplay = `${out12.time} ${out12.period}`;

      const [inH, inM] = this.checkInTime.split(':').map(Number);
      const [outH, outM] = this.checkOutTime.split(':').map(Number);
      const inMinutes = inH * 60 + inM;
      const outMinutes = outH * 60 + outM;

      if (outMinutes <= inMinutes) {
        alert('Check Out time must be after Check In time');
        return;
      }

      const totalDiff = outMinutes - inMinutes;
      const h = Math.floor(totalDiff / 60);
      const m = totalDiff % 60;
      hoursDisplay = `${h}h ${String(m).padStart(2, '0')}m`;

      if (this.selectedStatus !== 'Auto') {
        computedStatus = this.selectedStatus;
      } else {
        // Shift late threshold (typically > 09:30 AM is late)
        computedStatus = inMinutes > (9 * 60 + 30) ? 'Late' : 'Present';
      }
    }

    const payload = {
      employeeId: emp?._id || this.selectedEmpId,
      date: this.selectedDate,
      status: computedStatus === 'On Leave' ? 'leave' : (computedStatus === 'Absent' ? 'absent' : 'present'),
      checkInTime: this.checkInTime ? this.to12(this.checkInTime).time : undefined,
      checkInPeriod: this.checkInTime ? this.to12(this.checkInTime).period : undefined,
      checkOutTime: this.checkOutTime ? this.to12(this.checkOutTime).time : undefined,
      checkOutPeriod: this.checkOutTime ? this.to12(this.checkOutTime).period : undefined,
      note: this.note.trim() || undefined,
    };

    const newLocalEntry: ManualEntry = {
      empId: empCode,
      name: empName,
      date: this.selectedDate,
      checkIn: checkInDisplay,
      checkOut: checkOutDisplay,
      hours: hoursDisplay,
      status: computedStatus,
      note: this.note.trim(),
    };

    // Update Local signal state
    this.manualEntries.update((list) => {
      const idx = list.findIndex((m) => m.empId === empCode && m.date === this.selectedDate);
      if (idx > -1) {
        const copy = [...list];
        copy[idx] = { ...copy[idx], ...newLocalEntry };
        return copy;
      }
      return [newLocalEntry, ...list];
    });
    this.saveLocal();

    // Call API backend
    this.attendanceService.recordManual(payload).subscribe({
      next: (res) => {
        if (res && res.data && res.data._id) {
          newLocalEntry.id = res.data._id;
          this.saveLocal();
        }
        this.showToast(`Attendance recorded for ${empName} on ${this.selectedDate}`);
        this.clearForm();
      },
      error: () => {
        this.showToast(`Attendance saved locally for ${empName}`);
        this.clearForm();
      },
    });
  }

  clearForm() {
    this.checkInTime = '';
    this.checkOutTime = '';
    this.selectedStatus = 'Auto';
    this.note = '';
    this.recordHint.set('');
  }

  editEntry(entry: ManualEntry) {
    const emp = this.employees().find(
      (e) => e.employeeId === entry.empId || e.name === entry.name
    );
    this.selectedEmpId = emp ? emp._id : entry.empId;
    this.selectedDate = entry.date;
    this.checkInTime = entry.checkIn && entry.checkIn !== '-' ? this.to24(entry.checkIn) : '';
    this.checkOutTime = entry.checkOut && entry.checkOut !== '-' ? this.to24(entry.checkOut) : '';
    this.selectedStatus = entry.status;
    this.note = entry.note || '';
    this.onSelectionChange();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteEntry(entry: ManualEntry) {
    if (confirm(`Remove manual attendance record for ${entry.name} on ${entry.date}?`)) {
      this.manualEntries.update((list) =>
        list.filter((m) => !(m.empId === entry.empId && m.date === entry.date))
      );
      this.saveLocal();

      if (entry.id) {
        this.attendanceService.deleteManual(entry.id).subscribe({
          next: () => this.showToast('Attendance record deleted'),
          error: () => this.showToast('Record removed'),
        });
      } else {
        this.showToast('Record removed');
      }
    }
  }

  readonly filteredEntries = computed(() => {
    const filter = this.filterEmployee();
    const list = this.manualEntries();
    if (!filter) return list;
    return list.filter(
      (m) =>
        m.empId.toLowerCase().includes(filter.toLowerCase()) ||
        m.name.toLowerCase().includes(filter.toLowerCase())
    );
  });
}

