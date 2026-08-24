import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_METADATA,
  LanguageMetadata,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from './i18n.types';
import { es, TranslationDictionary } from './locales/es';
import { en } from './locales/en';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  readonly storageKey = 'psique_app_language';

  private readonly dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
    es,
    en,
  };

  private readonly langState = signal<SupportedLanguage>(this.detectInitialLanguage());

  readonly currentLang = this.langState.asReadonly();
  readonly supportedLanguages = SUPPORTED_LANGUAGES;
  readonly metadata = LANGUAGE_METADATA;

  readonly currentLangMeta = computed<LanguageMetadata>(
    () => this.metadata[this.langState()] ?? this.metadata[DEFAULT_LANGUAGE],
  );

  readonly dictionary = computed<TranslationDictionary>(
    () => this.dictionaries[this.langState()] ?? this.dictionaries[DEFAULT_LANGUAGE],
  );

  readonly isSpanish = computed(() => this.langState() === 'es');
  readonly isEnglish = computed(() => this.langState() === 'en');

  constructor() {
    effect(() => {
      const lang = this.langState();
      this.persistLanguage(lang);
      this.applyDocumentLanguage(lang);
    });
  }

  setLanguage(lang: SupportedLanguage): void {
    if (this.isValidLanguage(lang)) {
      this.langState.set(lang);
    }
  }

  toggleLanguage(): void {
    const nextLang: SupportedLanguage = this.langState() === 'es' ? 'en' : 'es';
    this.setLanguage(nextLang);
  }

  /**
   * Translates a dot-notated key with optional parameter interpolation.
   * e.g. t('auth.login.title') or t('sandbox.tour.stepCount', { current: 1, total: 5 })
   */
  t(path: string, params?: Record<string, string | number>): string {
    if (!path) {
      return '';
    }

    const currentDict = this.dictionaries[this.langState()] ?? this.dictionaries[DEFAULT_LANGUAGE];
    let value = this.resolvePath(currentDict, path);

    // Fallback to canonical Spanish dictionary if key is missing in active locale
    if (value === undefined || value === null) {
      value = this.resolvePath(this.dictionaries[DEFAULT_LANGUAGE], path);
    }

    if (typeof value !== 'string') {
      return path;
    }

    if (!params || Object.keys(params).length === 0) {
      return value;
    }

    return this.interpolate(value, params);
  }

  /**
   * Retrieves raw data (e.g. arrays or objects) from the active dictionary.
   */
  getRaw<T = unknown>(path: string): T | undefined {
    const currentDict = this.dictionaries[this.langState()] ?? this.dictionaries[DEFAULT_LANGUAGE];
    const value = this.resolvePath(currentDict, path);
    if (value !== undefined) {
      return value as T;
    }
    return this.resolvePath(this.dictionaries[DEFAULT_LANGUAGE], path) as T | undefined;
  }

  private detectInitialLanguage(): SupportedLanguage {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored && this.isValidLanguage(stored)) {
        return stored as SupportedLanguage;
      }
    } catch {
      // Ignore localStorage errors in restricted environments
    }

    return DEFAULT_LANGUAGE;
  }

  private isValidLanguage(value: unknown): value is SupportedLanguage {
    return typeof value === 'string' && (value === 'es' || value === 'en');
  }

  private persistLanguage(lang: SupportedLanguage): void {
    try {
      localStorage.setItem(this.storageKey, lang);
    } catch {
      // Ignore localStorage exceptions
    }
  }

  private applyDocumentLanguage(lang: SupportedLanguage): void {
    try {
      if (this.document?.documentElement) {
        this.document.documentElement.lang = lang;
        this.document.documentElement.dir = this.metadata[lang]?.direction || 'ltr';
      }
    } catch {
      // Ignore DOM exceptions in headless testing
    }
  }

  private resolvePath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    const segments = path.split('.');
    let current: any = obj;

    for (const segment of segments) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return undefined;
      }
      current = current[segment];
    }

    return current;
  }

  private interpolate(text: string, params: Record<string, string | number>): string {
    let result = text;

    for (const [key, val] of Object.entries(params)) {
      const strVal = String(val);
      // Support both {{key}} and {key} interpolation patterns
      result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), strVal);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), strVal);
    }

    return result;
  }
}
