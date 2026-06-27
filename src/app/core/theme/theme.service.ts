import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'psychology-theme';
  private readonly themeState = signal<AppTheme>(this.readStoredTheme());

  readonly theme = this.themeState.asReadonly();
  readonly isDarkTheme = computed(() => this.themeState() === 'dark');

  constructor() {
    effect(() => {
      this.applyTheme(this.themeState());
    });
  }

  setTheme(theme: AppTheme): void {
    this.themeState.set(theme);
    localStorage.setItem(this.storageKey, theme);
  }

  toggleDarkTheme(enabled: boolean): void {
    this.setTheme(enabled ? 'dark' : 'light');
  }

  private readStoredTheme(): AppTheme {
    const storedTheme = localStorage.getItem(this.storageKey);
    return storedTheme === 'dark' ? 'dark' : 'light';
  }

  private applyTheme(theme: AppTheme): void {
    const body = this.document.body;

    body.classList.toggle('light-theme', theme === 'light');
    body.classList.toggle('dark-theme', theme === 'dark');
    body.style.colorScheme = theme;
  }
}
