import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { I18nService } from './i18n.service';
import { TranslatePipe } from './translate.pipe';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let i18nService: I18nService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [I18nService, TranslatePipe],
    });
    i18nService = TestBed.inject(I18nService);
    pipe = TestBed.inject(TranslatePipe);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('translates given key into the current language', () => {
    expect(pipe.transform('common.cancel')).toBe('Cancelar');

    i18nService.setLanguage('en');
    TestBed.inject(ApplicationRef).tick();

    expect(pipe.transform('common.cancel')).toBe('Cancel');
  });

  it('interpolates parameters provided to the pipe', () => {
    expect(pipe.transform('sandbox.tour.stepCount', { current: 1, total: 5 })).toBe(
      'Paso 1 de 5',
    );

    i18nService.setLanguage('en');
    TestBed.inject(ApplicationRef).tick();

    expect(pipe.transform('sandbox.tour.stepCount', { current: 1, total: 5 })).toBe(
      'Step 1 of 5',
    );
  });

  it('returns empty string if key is empty or null', () => {
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(null as unknown as string)).toBe('');
  });
});
