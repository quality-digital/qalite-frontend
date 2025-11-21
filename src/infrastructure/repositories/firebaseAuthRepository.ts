import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import {
  getCurrentUser,
  hasRequiredRole,
  loginUser,
  logoutUser,
  onAuthStateChanged,
  registerUser,
  sendPasswordReset,
  updateUserProfile,
} from '../external/auth';

export const firebaseAuthRepository: AuthRepository = {
  register: registerUser,
  login: loginUser,
  logout: logoutUser,
  sendPasswordReset,
  getCurrent: getCurrentUser,
  onAuthStateChanged,
  hasRequiredRole,
  updateProfile: updateUserProfile,
};
