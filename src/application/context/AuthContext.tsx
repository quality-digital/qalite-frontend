import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import type { AuthUser } from '../../domain/entities/AuthUser';
import type { Role } from '../../domain/entities/Role';
import type { UpdateProfilePayload } from '../../domain/repositories/AuthRepository';
import { authService } from '../services/AuthService';
import { mapFirebaseError } from '../errors/mapFirebaseError';
import { useToast } from '../../presentation/context/ToastContext';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleFirebaseError = useCallback(
    (err: unknown) => {
      const message = mapFirebaseError(err);
      setError(message);
      showToast({ type: 'error', message });
      return message;
    },
    [showToast]
  );

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const logged = await authService.login({ email, password });
      setUser(logged);
      showToast({
        type: 'success',
        message: `Bem-vindo de volta, ${logged.displayName.split(' ')[0] || 'usuário'}!`
      });
    } catch (err) {
      const message = handleFirebaseError(err);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseError, showToast]);

  const register = useCallback(async (input: {
    email: string;
    password: string;
    displayName: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const registered = await authService.register(input);
      setUser(registered);
      showToast({
        type: 'success',
        message: 'Conta criada com sucesso! Personalize sua experiência a seguir.'
      });
    } catch (err) {
      const message = handleFirebaseError(err);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseError, showToast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      showToast({ type: 'success', message: 'Você saiu da sua conta com segurança.' });
    } catch (err) {
      const message = handleFirebaseError(err);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseError, showToast]);

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.sendPasswordReset(email);
      showToast({
        type: 'success',
        message: 'Enviamos um e-mail com instruções para redefinir sua senha.'
      });
    } catch (err) {
      const message = handleFirebaseError(err);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseError, showToast]);

  const hasRole = useCallback(
    (roles: Role[]) => authService.hasRequiredRole(user, roles),
    [user]
  );

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await authService.updateProfile(payload);
      setUser(updated);
      showToast({
        type: 'success',
        message: 'Perfil atualizado com sucesso!'
      });
    } catch (err) {
      const message = handleFirebaseError(err);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [handleFirebaseError, showToast]);

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
      updateProfile
    }),
    [user, isLoading, isInitializing, error, login, register, logout, resetPassword, hasRole, updateProfile]
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
