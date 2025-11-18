import type { Role } from './Role';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: Role;
  organizationId?: string | null;
  accessToken?: string;
  photoURL?: string;
  isEmailVerified: boolean;
}
