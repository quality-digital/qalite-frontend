import type { AuthUser, Role } from '../../domain/entities/auth';

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
  photoFile?: File | null;
}
