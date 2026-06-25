/**
 * MÓDULO 2: Sistema i18n Global
 *
 * Configuración de i18next con expo-localization para detección
 * automática del idioma del dispositivo. Incluye soporte para
 * Español (es) e Inglés (en).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import es from './locales/es.json';
import en from './locales/en.json';

// ─── Recursos de traducción ────────────────────────────────────────────────────
const resources = {
  es: { translation: es },
  en: { translation: en },
};

// ─── Detectar idioma del dispositivo ──────────────────────────────────────────
function detectDeviceLanguage(): string {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const lang = locales[0].languageCode;
    if (lang === 'en') return 'en';
  }
  // Por defecto, español (público objetivo venezolano)
  return 'es';
}

// ─── Inicialización de i18next ─────────────────────────────────────────────────
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: detectDeviceLanguage(),
      fallbackLng: 'es',
      interpolation: {
        escapeValue: false, // React ya escapa los valores
      },
      compatibilityJSON: 'v4',
    });
}

export default i18n;

// ─── Helper para cambiar idioma programáticamente ─────────────────────────────
export function changeLanguage(lang: 'es' | 'en') {
  i18n.changeLanguage(lang);
}
