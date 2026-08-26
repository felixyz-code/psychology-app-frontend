import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-auth-brand-panel',
  standalone: true,
  imports: [MatIconModule, TranslatePipe, RouterLink],
  templateUrl: './auth-brand-panel.component.html',
  styleUrl: './auth-brand-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthBrandPanelComponent {
  private readonly i18n = inject(I18nService);

  readonly features = computed(() => [
    {
      icon: 'description',
      title: this.i18n.t('auth.brand.features.nom004.title'),
      description: this.i18n.t('auth.brand.features.nom004.description'),
    },
    {
      icon: 'videocam',
      title: this.i18n.t('auth.brand.features.teleconsultation.title'),
      description: this.i18n.t('auth.brand.features.teleconsultation.description'),
    },
    {
      icon: 'psychology',
      title: this.i18n.t('auth.brand.features.psychometrics.title'),
      description: this.i18n.t('auth.brand.features.psychometrics.description'),
    },
  ]);

  readonly badges = computed(() => [
    { icon: 'lock', label: this.i18n.t('auth.brand.badges.encrypted') },
    { icon: 'verified_user', label: this.i18n.t('auth.brand.badges.mexicanNorms') },
    { icon: 'shield', label: this.i18n.t('landing.hero.trustBadges.multiTenant') },
    { icon: 'cloud_done', label: this.i18n.t('landing.hero.trustBadges.sla') },
  ]);
}
