import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en.json';
import translationTR from './locales/tr.json';

function mergeRootKeys(json) {
  const { translation, ...rest } = json;
  return { ...translation, ...rest };
}

const resources = {
  en: { translation: mergeRootKeys(translationEN) },
  tr: { translation: mergeRootKeys(translationTR) }
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
