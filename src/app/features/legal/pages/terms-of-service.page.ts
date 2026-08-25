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
  selector: 'app-terms-of-service-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    LanguageSwitcherComponent,
    TranslatePipe,
  ],
  templateUrl: './terms-of-service.page.html',
  styleUrl: './terms-of-service.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfServicePage implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  readonly i18n = inject(I18nService);

  readonly isDarkTheme = this.themeService.isDarkTheme;

  ngOnInit(): void {
    this.titleService.setTitle(this.i18n.t('legal.terms.metaTitle'));
    this.metaService.updateTag({
      name: 'description',
      content:
        'Términos y Condiciones del Servicio SaaS PsiqueOS para profesionales de la salud mental, psicólogos, psiquiatras y clínicas.',
    });
  }

  printDocument(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
