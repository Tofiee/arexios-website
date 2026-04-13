import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en.json';
import translationTR from './locales/tr.json';

const resources = {
  en: { translation: translationEN.translation },
  tr: { translation: translationTR.translation }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'tr', // default language
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
