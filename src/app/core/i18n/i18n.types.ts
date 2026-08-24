export type SupportedLanguage = 'es' | 'en';

export interface LanguageMetadata {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  shortLabel: string;
  direction: 'ltr' | 'rtl';
}

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['es', 'en'] as const;

export const LANGUAGE_METADATA: Record<SupportedLanguage, LanguageMetadata> = {
  es: {
    code: 'es',
    name: 'Español',
    nativeName: 'Español (México / LATAM)',
    flag: '🇲🇽',
    shortLabel: 'ES',
    direction: 'ltr',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English (US)',
    flag: '🇺🇸',
    shortLabel: 'EN',
    direction: 'ltr',
  },
};
