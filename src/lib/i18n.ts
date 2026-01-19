import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from '../locales/en.json';
import ptTranslation from '../locales/pt.json';
import {
  getDeviceLanguagePreference,
  LANGUAGE_STORAGE_KEY,
  getStoredLanguagePreference,
} from '../shared/config/userPreferences';

const storedLanguage = getStoredLanguagePreference();
const deviceLanguage = getDeviceLanguagePreference();

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
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
});

export default i18n;
