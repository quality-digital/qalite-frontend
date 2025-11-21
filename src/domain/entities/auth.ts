export type Role = 'admin' | 'user';

export const DEFAULT_ROLE: Role = 'user';
export const AVAILABLE_ROLES: Role[] = ['admin', 'user'];

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId?: string | null;
  accessToken?: string;
  photoURL?: string;
  isEmailVerified: boolean;
}
