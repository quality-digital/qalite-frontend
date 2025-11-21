import type { AuthUser, Role } from '../entities/auth';

export interface AuthRepository {
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role?: Role;
  }) => Promise<AuthUser>;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  getCurrent: () => Promise<AuthUser | null>;
  onAuthStateChanged: (listener: (user: AuthUser | null) => void) => () => void;
  hasRequiredRole: (user: AuthUser | null, allowedRoles: Role[]) => boolean;
  updateProfile: (payload: {
    firstName: string;
    lastName: string;
    photoFile?: File | null;
  }) => Promise<AuthUser>;
}
