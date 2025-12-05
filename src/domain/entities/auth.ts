import type { BrowserstackCredentials } from './browserstack';

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
  browserstackCredentials?: BrowserstackCredentials | null;
  isEmailVerified: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  role?: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type AuthStateListener = (user: AuthUser | null) => void;

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  browserstackCredentials?: BrowserstackCredentials | null;
}
