export type UserRole = 'admin' | 'hr' | 'manager' | 'employee';

export interface AuthUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  id?: string;
  employeeId?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}
