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
  selector: 'app-compliance-normative-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    LanguageSwitcherComponent,
    TranslatePipe,
  ],
  templateUrl: './compliance-normative.page.html',
  styleUrl: './compliance-normative.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceNormativePage implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  readonly i18n = inject(I18nService);

  readonly isDarkTheme = this.themeService.isDarkTheme;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    this.titleService.setTitle(this.i18n.t('legal.compliance.metaTitle'));
    this.metaService.updateTag({
      name: 'description',
      content:
        'Declaración técnica y regulatoria de cumplimiento NOM-004-SSA3-2012 y NOM-024-SSA3-2012 para el expediente clínico electrónico en PsiqueOS.',
    });
  }

  printDocument(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
