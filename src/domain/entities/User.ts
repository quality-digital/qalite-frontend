import type { Role } from './Role';

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
