import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService } from '../../../core/theme/theme.service';
import { LanguageSwitcherComponent } from '../../../core/i18n/components/language-switcher.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-privacy-policy-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    LanguageSwitcherComponent,
    TranslatePipe,
  ],
  templateUrl: './privacy-policy.page.html',
  styleUrl: './privacy-policy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyPage implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  readonly i18n = inject(I18nService);

  readonly isDarkTheme = this.themeService.isDarkTheme;

  ngOnInit(): void {
    this.titleService.setTitle(this.i18n.t('legal.privacy.metaTitle'));
    this.metaService.updateTag({
      name: 'description',
      content:
        'Aviso de Privacidad Integral de PsiqueOS conforme a la LFPDPPP y NOM-004-SSA3-2012 para el tratamiento y resguardo de datos sensibles de salud mental.',
    });
  }

  printDocument(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
