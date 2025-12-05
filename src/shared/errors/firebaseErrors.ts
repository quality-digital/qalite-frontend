import { FirebaseError } from 'firebase/app';
import { t as translation } from 'i18next';

export type EnvironmentStatusErrorCode = 'PENDING_SCENARIOS' | 'INVALID_ENVIRONMENT';

export class EnvironmentStatusError extends Error {
  constructor(
    public readonly code: EnvironmentStatusErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EnvironmentStatusError';
  }
}

const firebaseErrorMessages: Record<string, string> = {
  'auth/invalid-email': translation('firebaseErrors.auth/invalid-email'),
  'auth/invalid-credential': translation('firebaseErrors.auth/invalid-credential'),
  'auth/invalid-login-credentials': translation('firebaseErrors.auth/invalid-login-credentials'),
  'auth/user-disabled': translation('firebaseErrors.auth/user-disabled'),
  'auth/user-not-found': translation('firebaseErrors.auth/user-not-found'),
  'auth/wrong-password': translation('firebaseErrors.auth/wrong-password'),
  'auth/missing-email': translation('firebaseErrors.auth/missing-email'),
  'auth/missing-password': translation('firebaseErrors.auth/missing-password'),
  'auth/email-already-in-use': translation('firebaseErrors.auth/email-already-in-use'),
  'auth/weak-password': translation('firebaseErrors.auth/weak-password'),
  'auth/operation-not-allowed': translation('firebaseErrors.auth/operation-not-allowed'),
  'auth/account-exists-with-different-credential': translation(
    'firebaseErrors.auth/account-exists-with-different-credential',
  ),
  'auth/too-many-requests': translation('firebaseErrors.auth/too-many-requests'),
  'auth/network-request-failed': translation('firebaseErrors.auth/network-request-failed'),
  'auth/requires-recent-login': translation('firebaseErrors.auth/requires-recent-login'),

  'storage/unauthorized': translation('firebaseErrors.storage/unauthorized'),
  'storage/retry-limit-exceeded': translation('firebaseErrors.storage/retry-limit-exceeded'),
  'storage/canceled': translation('firebaseErrors.storage/canceled'),

  'firestore/unavailable': translation('firebaseErrors.firestore/unavailable'),
};

export const mapFirebaseError = (
  error: unknown,
  fallbackMessage = translation('firebaseErrors.fallbackMessage'),
) => {
  if (error instanceof FirebaseError) {
    return firebaseErrorMessages[error.code] ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
