import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './i18n.types';

describe('I18nService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.dir = '';
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.dir = '';
  });

  function flushEffects(): void {
    TestBed.inject(ApplicationRef).tick();
  }

  it('initializes with default language (es) when no localStorage or navigator override exists', () => {
    const service = TestBed.inject(I18nService);
    flushEffects();

    expect(service.currentLang()).toBe('es');
    expect(service.isSpanish()).toBe(true);
    expect(service.isEnglish()).toBe(false);
    expect(service.currentLangMeta().shortLabel).toBe('ES');
    expect(document.documentElement.lang).toBe('es');
  });

  it('initializes from persisted language in localStorage', () => {
    localStorage.setItem('psique_app_language', 'en');

    const service = TestBed.inject(I18nService);
    flushEffects();

    expect(service.currentLang()).toBe('en');
    expect(service.isSpanish()).toBe(false);
    expect(service.isEnglish()).toBe(true);
    expect(service.currentLangMeta().shortLabel).toBe('EN');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches language and persists it to localStorage and document.documentElement', () => {
    const service = TestBed.inject(I18nService);
    flushEffects();

    service.setLanguage('en');
    flushEffects();

    expect(service.currentLang()).toBe('en');
    expect(localStorage.getItem('psique_app_language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');

    service.setLanguage('es');
    flushEffects();

    expect(service.currentLang()).toBe('es');
    expect(localStorage.getItem('psique_app_language')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('toggles between languages with toggleLanguage()', () => {
    const service = TestBed.inject(I18nService);
    flushEffects();

    expect(service.currentLang()).toBe('es');

    service.toggleLanguage();
    flushEffects();
    expect(service.currentLang()).toBe('en');

    service.toggleLanguage();
    flushEffects();
    expect(service.currentLang()).toBe('es');
  });

  it('translates keys with dot-notation in active language', () => {
    const service = TestBed.inject(I18nService);
    flushEffects();

    expect(service.t('common.save')).toBe('Guardar');
    expect(service.t('auth.login.title')).toBe('Inicia sesión');

    service.setLanguage('en');
    flushEffects();

    expect(service.t('common.save')).toBe('Save');
    expect(service.t('auth.login.title')).toBe('Sign in to PsiqueOS');
  });

  it('interpolates parameters using {{key}} and {key} syntaxes', () => {
    const service = TestBed.inject(I18nService);
    flushEffects();

    const translatedEs = service.t('sandbox.tour.stepCount', { current: 2, total: 5 });
    expect(translatedEs).toBe('Paso 2 de 5');

    service.setLanguage('en');
    flushEffects();

    const translatedEn = service.t('sandbox.tour.stepCount', { current: 3, total: 5 });
    expect(translatedEn).toBe('Step 3 of 5');
  });

  it('returns the key path if key is not found in dictionary or fallbacks', () => {
    const service = TestBed.inject(I18nService);
    flushEffects();

    expect(service.t('non.existent.key')).toBe('non.existent.key');
    expect(service.t('')).toBe('');
  });

  it('retrieves raw data structures using getRaw()', () => {
    const service = TestBed.inject(I18nService);
    flushEffects();

    const faqItems = service.getRaw<Array<{ q: string; a: string }>>('landing.faq.items');
    expect(Array.isArray(faqItems)).toBe(true);
    expect(faqItems?.length).toBeGreaterThan(0);
  });
});
