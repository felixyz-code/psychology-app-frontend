import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { I18nService } from '../i18n.service';
import { SupportedLanguage } from '../i18n.types';
import { TranslatePipe } from '../translate.pipe';

export type LanguageSwitcherVariant = 'segmented' | 'menu' | 'compact';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, TranslatePipe],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);

  readonly variant = input<LanguageSwitcherVariant>('segmented');
  readonly customClass = input<string>('');

  readonly currentLang = this.i18n.currentLang;
  readonly currentMeta = this.i18n.currentLangMeta;
  readonly supportedLanguages = this.i18n.supportedLanguages;
  readonly metadata = this.i18n.metadata;

  switchLanguage(lang: SupportedLanguage): void {
    this.i18n.setLanguage(lang);
  }
}
