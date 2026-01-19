import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import type { ThemePreference } from '../../domain/entities/auth';
import {
  getDeviceLanguagePreference,
  getStoredLanguagePreference,
  getStoredThemePreference,
  persistPreferencesLocally,
} from '../../shared/config/userPreferences';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const resolveTheme = (preference: ThemePreference): Theme => {
  if (preference !== 'system') {
    return preference;
  }

  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialPreference = (): ThemePreference => getStoredThemePreference() ?? 'system';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(getInitialPreference()));

  useLayoutEffect(() => {
    setTheme(resolveTheme(preference));

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolveTheme(preference));
    }

    persistPreferencesLocally({
      theme: preference,
      language: getStoredLanguagePreference() ?? getDeviceLanguagePreference() ?? 'en',
    });

    if (typeof window === 'undefined' || preference !== 'system') {
      return;
    }

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) {
      return;
    }

    const listener = () => {
      const nextTheme = resolveTheme('system');
      setTheme(nextTheme);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
    };

    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, [preference]);

  const handleSetPreference = useCallback((nextPreference: ThemePreference) => {
    setPreference(nextPreference);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, setPreference: handleSetPreference }),
    [handleSetPreference, preference, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};
