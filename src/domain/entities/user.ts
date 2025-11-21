import type { Role } from './auth';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: Role;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}
