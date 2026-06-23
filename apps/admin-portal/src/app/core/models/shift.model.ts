export interface Shift {
  id: string;
  _id?: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  gracePeriod: number; // minutes
  createdAt: string;
  updatedAt: string;
}
