import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import {
  confirmPasswordResetFunction,
  getCurrentUser,
  hasRequiredRole,
  loginWithGithub,
  loginWithGoogle,
  loginUser,
  logoutUser,
  registerUser,
  sendPasswordReset,
  subscribeToAuthChanges,
  updateUserProfile,
  verifyPasswordResetCodeFunction,
} from '../external/auth';

export const firebaseAuthRepository: AuthRepository = {
  register: registerUser,
  login: loginUser,
  loginWithGoogle,
  loginWithGithub,
  logout: logoutUser,
  sendPasswordReset,
  verifyPasswordResetCode: verifyPasswordResetCodeFunction,
  confirmPasswordReset: confirmPasswordResetFunction,
  getCurrent: getCurrentUser,
  subscribeToAuthChanges,
  hasRequiredRole,
  updateProfile: updateUserProfile,
};
