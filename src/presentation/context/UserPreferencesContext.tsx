import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  normalizeLanguagePreference,
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

const arePreferencesEqual = (first: UserPreferences, second: UserPreferences): boolean =>
  first.theme === second.theme && first.language === second.language;

const getFallbackPreferences = (languageFallback?: string | null): UserPreferences => {
  const themeFallback = getStoredThemePreference() ?? DEFAULT_USER_PREFERENCES.theme;
  const normalizedLanguage = normalizeLanguagePreference(languageFallback);
  const language =
    normalizedLanguage ??
    getStoredLanguagePreference() ??
    getDeviceLanguagePreference() ??
    DEFAULT_USER_PREFERENCES.language;

  return {
    theme: themeFallback,
    language,
  };
};

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateProfile, isLoading } = useAuth();
  const { i18n, t } = useTranslation();
  const { preference: themePreference, setPreference } = useTheme();
  const resolvedAppLanguage = i18n.resolvedLanguage ?? i18n.language;
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    normalizeUserPreferences(user?.preferences, getFallbackPreferences(resolvedAppLanguage)),
  );
  const [isReady, setIsReady] = useState(false);

  const applyPreferences = useCallback(
    async (next: UserPreferences) => {
      if (themePreference !== next.theme) {
        setPreference(next.theme);
      }

      persistPreferencesLocally(next);

      const currentLanguage = normalizeLanguagePreference(resolvedAppLanguage);
      if (currentLanguage !== next.language) {
        await i18n.changeLanguage(next.language);
      }
    },
    [resolvedAppLanguage, i18n, setPreference, themePreference],
  );

  useEffect(() => {
    const resolved = normalizeUserPreferences(
      user?.preferences,
      getFallbackPreferences(resolvedAppLanguage),
    );

    setPreferences((previous) => (arePreferencesEqual(previous, resolved) ? previous : resolved));
    void applyPreferences(resolved).finally(() => setIsReady(true));
  }, [applyPreferences, resolvedAppLanguage, user?.preferences]);

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
