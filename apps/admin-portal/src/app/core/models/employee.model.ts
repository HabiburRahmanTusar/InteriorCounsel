export type UserStatus = 'active' | 'inactive';

import { UserRole } from './auth.model';

export interface EmployeeEducation {
  degree: string;
  institution: string;
  passingYear: string;
  result: string;
}

export interface EmployeeEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface EmployeeDocument {
  documentType: string;
  documentName: string;
  documentUrl?: string;
  uploadedAt?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  salary?: number;
  role: UserRole;
  shiftId?: string;
  employeeType?: string | any;
  status: UserStatus;
  joiningDate?: string;
  resignationDate?: string;
  reportsTo?: string | any;
  supervisor?: string;
  grade?: string;
  workLocation?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  nid?: string;
  passport?: string;
  fatherName?: string;
  fatherMobile?: string;
  motherName?: string;
  motherMobile?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseMobile?: string;
  childrenNames?: string[];
  religion?: string;
  nationality?: string;
  section?: string;
  jobType?: string;
  probationPeriod?: string;
  confirmationDate?: string;
  contractNo?: string;
  recruitmentSource?: string;
  previousExperience?: string;
  presentAddress?: string;
  permanentAddress?: string;
  city?: string;
  district?: string;
  division?: string;
  postalCode?: string;
  education?: EmployeeEducation[];
  emergencyContact?: EmployeeEmergencyContact;
  documents?: EmployeeDocument[];
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
