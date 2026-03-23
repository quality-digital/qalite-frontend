import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from '../locales/en.json';
import ptTranslation from '../locales/pt.json';
import {
  getDeviceLanguagePreference,
  getPreferredDocumentLocale,
  LANGUAGE_STORAGE_KEY,
  getStoredLanguagePreference,
} from '../shared/config/userPreferences';

const storedLanguage = getStoredLanguagePreference();
const deviceLanguage = getDeviceLanguagePreference();
const documentLocale = getPreferredDocumentLocale();

i18n.use(initReactI18next).init({
  resources: {
    en: {
      ...enTranslation,
    },
    pt: {
      ...ptTranslation,
    },
  },
  lng: storedLanguage ?? deviceLanguage ?? 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'pt'],
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  cleanCode: true,
  returnEmptyString: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

const syncDocumentLanguage = (language: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = documentLocale ?? language;
  document.documentElement.dir = 'ltr';
};

i18n.on('languageChanged', (language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  syncDocumentLanguage(language);
});

syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);

export default i18n;
