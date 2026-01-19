import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { UserPreferences } from '../../domain/entities/auth';
import { DEFAULT_USER_PREFERENCES } from '../../domain/entities/auth';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from './ThemeContext';
import {
  getStoredLanguagePreference,
  getStoredThemePreference,
  getDeviceLanguagePreference,
  normalizeUserPreferences,
  persistPreferencesLocally,
} from '../../shared/config/userPreferences';
import { PageLoader } from '../components/PageLoader';

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  isSaving: boolean;
  updatePreferences: (next: UserPreferences) => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined);

const getFallbackPreferences = (languageFallback: string): UserPreferences => {
  const themeFallback = getStoredThemePreference() ?? DEFAULT_USER_PREFERENCES.theme;
  const language =
    getStoredLanguagePreference() ??
    getDeviceLanguagePreference() ??
    (languageFallback === 'pt' ? 'pt' : 'en');

  return {
    theme: themeFallback,
    language,
  };
};

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateProfile, isLoading } = useAuth();
  const { i18n, t } = useTranslation();
  const { setPreference } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    normalizeUserPreferences(user?.preferences, getFallbackPreferences(i18n.language)),
  );
  const [isReady, setIsReady] = useState(false);

  const applyPreferences = useCallback(
    async (next: UserPreferences) => {
      setPreference(next.theme);
      persistPreferencesLocally(next);

      if (i18n.language !== next.language) {
        await i18n.changeLanguage(next.language);
      }
    },
    [i18n, setPreference],
  );

  useLayoutEffect(() => {
    const resolved = normalizeUserPreferences(
      user?.preferences,
      getFallbackPreferences(i18n.language),
    );
    setPreferences(resolved);
    void applyPreferences(resolved).finally(() => setIsReady(true));
  }, [applyPreferences, i18n.language, user?.preferences]);

  const updatePreferences = useCallback(
    async (next: UserPreferences) => {
      const previous = preferences;
      setPreferences(next);
      await applyPreferences(next);

      if (!user) {
        return;
      }

      try {
        await updateProfile({ preferences: next });
      } catch (error) {
        setPreferences(previous);
        await applyPreferences(previous);
        throw error;
      }
    },
    [applyPreferences, preferences, updateProfile, user],
  );

  const value = useMemo(
    () => ({
      preferences,
      isSaving: isLoading,
      updatePreferences,
    }),
    [isLoading, preferences, updatePreferences],
  );

  if (!isReady) {
    return <PageLoader message={t('preferences.loading')} />;
  }

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = (): UserPreferencesContextValue => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
};
