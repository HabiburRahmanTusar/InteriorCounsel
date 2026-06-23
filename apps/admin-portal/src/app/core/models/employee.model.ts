export type UserStatus = 'active' | 'inactive';

import { UserRole } from './auth.model';

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  salary?: number;
  role: UserRole;
  shiftId?: string;
  officeLocationId?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
