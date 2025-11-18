import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { AuthUser } from '../../domain/entities/AuthUser';
import type { Role } from '../../domain/entities/Role';
import type { UpdateProfilePayload } from '../../domain/repositories/AuthRepository';
import { mapFirebaseError } from '../../application/errors/mapFirebaseError';
import { authService } from '../../services';
import { useToast } from './ToastContext';

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
      setUser(currentUser);
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(
    (email: string, password: string) =>
      runAuthAction(() => authService.login({ email, password }), {
        onSuccess: (logged) => setUser(logged),
        successMessage: (logged) =>
          `Bem-vindo de volta, ${logged.displayName.split(' ')[0] || 'usuário'}!`,
      }),
    [runAuthAction],
  );

  const register = useCallback(
    (input: { email: string; password: string; displayName: string }) =>
      runAuthAction(() => authService.register(input), {
        onSuccess: (registered) => setUser(registered),
        successMessage: 'Conta criada com sucesso! Personalize sua experiência a seguir.',
      }),
    [runAuthAction],
  );

  const logout = useCallback(
    () =>
      runAuthAction(() => authService.logout(), {
        onSuccess: () => setUser(null),
        successMessage: 'Você saiu com segurança.',
      }),
    [runAuthAction],
  );

  const resetPassword = useCallback(
    (email: string) =>
      runAuthAction(() => authService.sendPasswordReset(email), {
        successMessage: 'Enviamos um e-mail com instruções para redefinir sua senha.',
      }),
    [runAuthAction],
  );

  const hasRole = useCallback((roles: Role[]) => authService.hasRequiredRole(user, roles), [user]);

  const updateProfile = useCallback(
    (payload: UpdateProfilePayload) =>
      runAuthAction(() => authService.updateProfile(payload), {
        onSuccess: (updated) => setUser(updated),
        successMessage: 'Perfil atualizado com sucesso.',
      }),
    [runAuthAction],
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
