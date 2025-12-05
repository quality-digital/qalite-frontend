import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { authService } from '../../application/use-cases/AuthUseCase';
import type { AuthUser, Role, UpdateProfilePayload } from '../../domain/entities/auth';
import { DEFAULT_ROLE } from '../../domain/entities/auth';
import { mapFirebaseError } from '../../shared/errors/firebaseErrors';
import { useToast } from './ToastContext';
import { useTranslation } from 'react-i18next';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
}

type SuccessMessage<T> = string | null | ((result: T) => string | null);

interface AuthActionOptions<T> {
  onSuccess?: (result: T) => void;
  successMessage?: SuccessMessage<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t: translation } = useTranslation();

  const runAuthAction = useCallback(
    async <T,>(action: () => Promise<T>, options: AuthActionOptions<T> = {}): Promise<T> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await action();
        options.onSuccess?.(result);

        const successMessage =
          typeof options.successMessage === 'function'
            ? options.successMessage(result)
            : options.successMessage;

        if (successMessage) {
          showToast({ type: 'success', message: successMessage });
        }

        return result;
      } catch (err) {
        const message = mapFirebaseError(err);
        setError(message);
        showToast({ type: 'error', message });
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      if (currentUser && !currentUser.isEmailVerified) {
        setUser(null);
        setIsInitializing(false);
        return;
      }

      setUser(currentUser);
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const signOutSilently = useCallback(async () => {
    try {
      await authService.logout();
    } catch (logoutError) {
      console.error(logoutError);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const authenticatedUser = await runAuthAction(() => authService.login({ email, password }));

      if (!authenticatedUser.isEmailVerified) {
        const message = translation('registerPage.emailNotVerified');
        setError(message);
        showToast({ type: 'error', message });
        await signOutSilently();
        throw new Error(message);
      }

      setUser(authenticatedUser);

      const firstName = authenticatedUser.displayName.split(' ')[0] || translation('roleUser');

      showToast({
        type: 'success',
        message: translation('registerPage.welcomeBack', { name: firstName }),
      });

      return authenticatedUser;
    },
    [runAuthAction, showToast, signOutSilently, translation],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      const registeredUser = await runAuthAction(() =>
        authService.register({
          ...input,
          role: DEFAULT_ROLE,
        }),
      );

      if (registeredUser.isEmailVerified) {
        setUser(registeredUser);
      } else {
        await signOutSilently();
        setUser(null);
      }

      showToast({
        type: 'success',
        message: translation('registerPage.registerSuccesfull'),
      });

      return registeredUser;
    },
    [runAuthAction, showToast, signOutSilently, translation],
  );

  const logout = useCallback(
    () =>
      runAuthAction(() => authService.logout(), {
        onSuccess: () => setUser(null),
        successMessage: translation('registerPage.logoutSuccess'),
      }),
    [runAuthAction, translation],
  );

  const resetPassword = useCallback(
    (email: string) =>
      runAuthAction(() => authService.sendPasswordReset(email), {
        successMessage: translation('registerPage.resetPasswordSuccess'),
      }),
    [runAuthAction, translation],
  );

  const hasRole = useCallback((roles: Role[]) => authService.hasRequiredRole(user, roles), [user]);

  const updateProfile = useCallback(
    (payload: UpdateProfilePayload) =>
      runAuthAction(() => authService.updateProfile(payload), {
        onSuccess: (updated) => setUser(updated),
        successMessage: translation('registerPage.updateProfileSuccess'),
      }),
    [runAuthAction, translation],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isInitializing,
      error,
      login,
      register,
      logout,
      resetPassword,
      hasRole,
      updateProfile,
    }),
    [
      user,
      isLoading,
      isInitializing,
      error,
      login,
      register,
      logout,
      resetPassword,
      hasRole,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
};
