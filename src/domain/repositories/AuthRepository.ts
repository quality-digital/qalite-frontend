import type { AuthUser, Role, UpdateProfilePayload } from '../entities/auth';

export interface AuthRepository {
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role?: Role;
  }) => Promise<AuthUser>;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  loginWithGoogle: () => Promise<AuthUser>;
  loginWithGithub: () => Promise<AuthUser>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  verifyPasswordResetCode: (code: string) => Promise<string>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  getCurrent: () => Promise<AuthUser | null>;
  subscribeToAuthChanges: (onChange: (user: AuthUser | null) => void) => () => void;
  hasRequiredRole: (user: AuthUser | null, allowedRoles: Role[]) => boolean;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
}
