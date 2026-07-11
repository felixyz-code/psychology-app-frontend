import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    document.body.style.colorScheme = '';
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    document.body.className = '';
    document.body.style.colorScheme = '';
  });

  it('initializes from the persisted dark theme and applies the document contract', () => {
    localStorage.setItem('psychology-theme', 'dark');

    const service = TestBed.inject(ThemeService);
    flushEffects();

    expect(service.theme()).toBe('dark');
    expect(service.isDarkTheme()).toBe(true);
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    expect(document.body.classList.contains('light-theme')).toBe(false);
    expect(document.body.style.colorScheme).toBe('dark');
  });

  it('falls back to light when the persisted value is invalid', () => {
    localStorage.setItem('psychology-theme', 'sepia');

    const service = TestBed.inject(ThemeService);
    flushEffects();

    expect(service.theme()).toBe('light');
    expect(document.body.classList.contains('light-theme')).toBe(true);
    expect(document.body.style.colorScheme).toBe('light');
  });

  it('updates state, persistence, and document classes when the theme changes', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('dark');
    flushEffects();

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('psychology-theme')).toBe('dark');
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    expect(document.body.classList.contains('light-theme')).toBe(false);
    expect(document.body.style.colorScheme).toBe('dark');
  });

  it('toggles dark theme through the public boolean API', () => {
    const service = TestBed.inject(ThemeService);

    service.toggleDarkTheme(true);
    flushEffects();
    expect(service.theme()).toBe('dark');

    service.toggleDarkTheme(false);
    flushEffects();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('psychology-theme')).toBe('light');
    expect(document.body.classList.contains('light-theme')).toBe(true);
    expect(document.body.style.colorScheme).toBe('light');
  });
});

function flushEffects(): void {
  TestBed.inject(ApplicationRef).tick();
}
