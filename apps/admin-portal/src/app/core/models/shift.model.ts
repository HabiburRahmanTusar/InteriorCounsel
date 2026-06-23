export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  gracePeriod: number; // minutes
  timezone: string;
  createdAt: string;
  updatedAt: string;
}
