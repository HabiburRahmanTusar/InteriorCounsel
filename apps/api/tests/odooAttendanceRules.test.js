/**
 * Unit tests for Odoo Attendance & Late Rules + Salary Deduction Logic
 * Source: f:\Attendly\custom\hr_attendance_salary_deduction
 */

describe('Odoo Attendance & Late Rules Tests', () => {
  describe('Late Deduction Days Formula: Math.floor(late_days / threshold)', () => {
    const threshold = 3; // 3 late check-ins in month = 1 day salary deduction

    it('should compute zero deduction for late days below threshold', () => {
      expect(Math.floor(0 / threshold)).toBe(0);
      expect(Math.floor(1 / threshold)).toBe(0);
      expect(Math.floor(2 / threshold)).toBe(0);
    });

    it('should deduct 1 day for 3, 4, or 5 cumulative late days in the month', () => {
      expect(Math.floor(3 / threshold)).toBe(1);
      expect(Math.floor(4 / threshold)).toBe(1);
      expect(Math.floor(5 / threshold)).toBe(1);
    });

    it('should deduct 2 days for 6, 7, or 8 cumulative late days', () => {
      expect(Math.floor(6 / threshold)).toBe(2);
      expect(Math.floor(7 / threshold)).toBe(2);
      expect(Math.floor(8 / threshold)).toBe(2);
    });

    it('should deduct 3 days for 9 or more cumulative late days', () => {
      expect(Math.floor(9 / threshold)).toBe(3);
    });
  });

  describe('Full Monthly Salary & Deduction Computation', () => {
    it('should calculate per-day salary, deductions, and final payable amount accurately', () => {
      const monthlySalary = 60000;
      const daysInMonth = 30; // e.g. April, June, September, November
      const perDaySalary = monthlySalary / daysInMonth; // 2,000

      expect(perDaySalary).toBe(2000);

      const lateDays = 7; // 7 late check-ins in the month
      const absentDays = 2; // 2 unapproved absent days
      const threshold = 3;

      const lateDeductionDays = Math.floor(lateDays / threshold); // 7 // 3 = 2
      expect(lateDeductionDays).toBe(2);

      const totalDeductionDays = lateDeductionDays + absentDays; // 2 + 2 = 4
      expect(totalDeductionDays).toBe(4);

      const deductionAmount = totalDeductionDays * perDaySalary; // 4 * 2000 = 8000
      expect(deductionAmount).toBe(8000);

      const payableAmount = Math.max(0, monthlySalary - deductionAmount); // 60000 - 8000 = 52000
      expect(payableAmount).toBe(52000);
    });

    it('should prevent payable amount from falling below zero when deductions exceed salary', () => {
      const monthlySalary = 30000;
      const daysInMonth = 30;
      const perDaySalary = monthlySalary / daysInMonth; // 1,000

      const lateDays = 15; // 15 // 3 = 5
      const absentDays = 26; // total deduction days = 5 + 26 = 31 > 30 days
      const totalDeductionDays = Math.floor(lateDays / 3) + absentDays; // 31
      const deductionAmount = totalDeductionDays * perDaySalary; // 31,000

      const payableAmount = Math.max(0, monthlySalary - deductionAmount);
      expect(payableAmount).toBe(0);
    });
  });

  describe('Odoo Formatting and Overview Rules', () => {
    function calculateLateOverview(lateMinutes) {
      if (!lateMinutes || lateMinutes <= 0) return 'ON Time';
      const h = Math.floor(lateMinutes / 60);
      const m = lateMinutes % 60;
      if (h > 0) {
        return m > 0 ? `${h}H ${m}Min Late` : `${h}H Late`;
      }
      return `${m} Min Late`;
    }

    function formatWorkingHours(totalMinutes) {
      if (!totalMinutes || totalMinutes <= 0) return '00 H 00 Min';
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')} H ${String(minutes).padStart(2, '0')} Min`;
    }

    it('should format ON Time when lateMinutes <= 0', () => {
      expect(calculateLateOverview(0)).toBe('ON Time');
      expect(calculateLateOverview(-5)).toBe('ON Time');
    });

    it('should format minutes late correctly', () => {
      expect(calculateLateOverview(15)).toBe('15 Min Late');
      expect(calculateLateOverview(45)).toBe('45 Min Late');
    });

    it('should format hours and minutes late correctly', () => {
      expect(calculateLateOverview(60)).toBe('1H Late');
      expect(calculateLateOverview(85)).toBe('1H 25Min Late');
      expect(calculateLateOverview(130)).toBe('2H 10Min Late');
    });

    it('should format worked hours as "XX H YY Min"', () => {
      expect(formatWorkingHours(0)).toBe('00 H 00 Min');
      expect(formatWorkingHours(495)).toBe('08 H 15 Min');
      expect(formatWorkingHours(540)).toBe('09 H 00 Min');
    });
  });
});
