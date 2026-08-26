import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService } from '../../core/theme/theme.service';

export type BillingCycle = 'monthly' | 'annual';
export type PreviewTab = 'soap' | 'teleconsultation' | 'psychometrics' | 'paef';

export interface PlanFeatureItem {
  name: string;
  includedInFreelance: boolean;
  includedInConsultorio: boolean;
  includedInClinica: boolean;
  category: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  tagline: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotal: number;
  popular?: boolean;
  ctaText: string;
  ctaRoute: string;
  patientLimit: string;
  userLimit: string;
  features: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export interface ClinicalFeature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  badge: string;
  highlights: string[];
  category: 'clinical' | 'telehealth' | 'admin' | 'security';
}

import { LanguageSwitcherComponent } from '../../core/i18n/components/language-switcher.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    LanguageSwitcherComponent,
    TranslatePipe,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  readonly i18n = inject(I18nService);

  readonly isDarkTheme = this.themeService.isDarkTheme;

  // Interactive UI State Signals
  readonly billingCycle = signal<BillingCycle>('monthly');
  readonly selectedPreviewTab = signal<PreviewTab>('soap');
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly expandedFaqIndices = signal<number[]>([0]); // First FAQ open by default
  readonly activeFeatureCategory = signal<string>('all');

  ngOnInit(): void {
    this.titleService.setTitle('PsiqueOS | Sistema Operativo Clínico para Profesionales de la Salud Mental');
    this.metaService.updateTag({
      name: 'description',
      content:
        'PsiqueOS - Sistema Operativo Clínico para Profesionales de la Salud Mental. Expediente clínico electrónico bajo NOM-004-SSA3, notas de evolución SOAP, batería psicométrica baremada, teleconsulta cifrada y convenios corporativos PAEF.',
    });
    this.metaService.updateTag({
      property: 'og:title',
      content: 'PsiqueOS | Sistema Operativo Clínico para Profesionales de la Salud Mental',
    });
    this.metaService.updateTag({
      property: 'og:description',
      content:
        'PsiqueOS - Sistema Operativo Clínico para Profesionales de la Salud Mental. Expediente clínico electrónico bajo NOM-004-SSA3, notas de evolución SOAP, batería psicométrica baremada, teleconsulta cifrada y convenios corporativos PAEF.',
    });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:image', content: 'assets/images/og-psiqueos.png' });
  }

  // Trust Badges
  readonly trustBadges = computed(() => [
    {
      icon: 'verified_user',
      label: this.i18n.t('landing.hero.trustBadges.nom'),
      desc: this.i18n.isSpanish() ? 'Cumplimiento Normativo Oficial' : 'Official Regulatory Compliance',
    },
    {
      icon: 'lock',
      label: this.i18n.t('landing.hero.trustBadges.aes'),
      desc: this.i18n.isSpanish() ? 'Seguridad de Grado Bancario' : 'Bank-Grade Medical Security',
    },
    {
      icon: 'domain',
      label: this.i18n.t('landing.hero.trustBadges.multiTenant'),
      desc: this.i18n.isSpanish() ? 'Aislamiento Lógico Seguro' : 'Secure Logical Isolation',
    },
    {
      icon: 'bolt',
      label: this.i18n.t('landing.hero.trustBadges.sla'),
      desc: this.i18n.isSpanish() ? 'Infraestructura Cloud de Alta Resiliencia' : 'High-Resilience Cloud Infra',
    },
  ]);

  // Clinical Features Grid
  readonly clinicalFeaturesComputed = computed<ClinicalFeature[]>(() => [
    {
      id: 'expediente',
      title: this.i18n.t('landing.features.items.expediente.title'),
      subtitle: this.i18n.t('landing.features.items.expediente.subtitle'),
      description: this.i18n.t('landing.features.items.expediente.desc'),
      icon: 'description',
      badge: this.i18n.isSpanish() ? 'NOM-004 Certificado' : 'NOM-004 Certified',
      highlights: [
        this.i18n.t('landing.features.items.expediente.h1'),
        this.i18n.t('landing.features.items.expediente.h2'),
        this.i18n.t('landing.features.items.expediente.h3'),
      ],
      category: 'clinical',
    },
    {
      id: 'psicometria',
      title: this.i18n.t('landing.features.items.psicometria.title'),
      subtitle: this.i18n.t('landing.features.items.psicometria.subtitle'),
      description: this.i18n.t('landing.features.items.psicometria.desc'),
      icon: 'psychology',
      badge: this.i18n.isSpanish() ? 'Baremos Automatizados' : 'Automated Norms',
      highlights: [
        this.i18n.t('landing.features.items.psicometria.h1'),
        this.i18n.t('landing.features.items.psicometria.h2'),
        this.i18n.t('landing.features.items.psicometria.h3'),
      ],
      category: 'clinical',
    },
    {
      id: 'teleconsulta',
      title: this.i18n.t('landing.features.items.teleconsulta.title'),
      subtitle: this.i18n.t('landing.features.items.teleconsulta.subtitle'),
      description: this.i18n.t('landing.features.items.teleconsulta.desc'),
      icon: 'videocam',
      badge: 'Zero-Download HD',
      highlights: [
        this.i18n.t('landing.features.items.teleconsulta.h1'),
        this.i18n.t('landing.features.items.teleconsulta.h2'),
        this.i18n.t('landing.features.items.teleconsulta.h3'),
      ],
      category: 'telehealth',
    },
    {
      id: 'corporate-paef',
      title: this.i18n.t('landing.features.items.paef.title'),
      subtitle: this.i18n.t('landing.features.items.paef.subtitle'),
      description: this.i18n.t('landing.features.items.paef.desc'),
      icon: 'corporate_fare',
      badge: 'B2B Enterprise',
      highlights: [
        this.i18n.t('landing.features.items.paef.h1'),
        this.i18n.t('landing.features.items.paef.h2'),
        this.i18n.t('landing.features.items.paef.h3'),
      ],
      category: 'admin',
    },
    {
      id: 'agenda-citas',
      title: this.i18n.t('landing.features.items.agenda.title'),
      subtitle: this.i18n.t('landing.features.items.agenda.subtitle'),
      description: this.i18n.t('landing.features.items.agenda.desc'),
      icon: 'calendar_month',
      badge: this.i18n.isSpanish() ? 'Cero Ausentismo' : 'Zero No-Shows',
      highlights: [
        this.i18n.t('landing.features.items.agenda.h1'),
        this.i18n.t('landing.features.items.agenda.h2'),
        this.i18n.t('landing.features.items.agenda.h3'),
      ],
      category: 'admin',
    },
    {
      id: 'seguridad-audit',
      title: this.i18n.t('landing.features.items.seguridad.title'),
      subtitle: this.i18n.t('landing.features.items.seguridad.subtitle'),
      description: this.i18n.t('landing.features.items.seguridad.desc'),
      icon: 'shield',
      badge: this.i18n.isSpanish() ? 'Máxima Seguridad' : 'Top Security',
      highlights: [
        this.i18n.t('landing.features.items.seguridad.h1'),
        this.i18n.t('landing.features.items.seguridad.h2'),
        this.i18n.t('landing.features.items.seguridad.h3'),
      ],
      category: 'admin',
    },
  ]);

  get clinicalFeatures(): ClinicalFeature[] {
    return this.clinicalFeaturesComputed();
  }

  // Pricing Plans
  readonly plansComputed = computed<PricingPlan[]>(() => [
    {
      id: 'freelance',
      name: this.i18n.t('landing.pricing.freelance.name'),
      tagline: this.i18n.t('landing.pricing.freelance.desc'),
      monthlyPrice: 499,
      annualMonthlyPrice: 399,
      annualTotal: 4788,
      patientLimit: this.i18n.t('landing.pricing.freelance.patientLimit'),
      userLimit: this.i18n.t('landing.pricing.freelance.userLimit'),
      ctaText: this.i18n.t('landing.pricing.freelance.actionCta'),
      ctaRoute: '/signup',
      features: (this.i18n.getRaw('landing.pricing.freelance.features') as string[]) || [],
    },
    {
      id: 'consultorio',
      name: this.i18n.t('landing.pricing.consultorio.name'),
      badge: this.i18n.t('landing.pricing.mostPopularBadge'),
      popular: true,
      tagline: this.i18n.t('landing.pricing.consultorio.desc'),
      monthlyPrice: 1199,
      annualMonthlyPrice: 959,
      annualTotal: 11508,
      patientLimit: this.i18n.t('landing.pricing.consultorio.patientLimit'),
      userLimit: this.i18n.t('landing.pricing.consultorio.userLimit'),
      ctaText: this.i18n.t('landing.pricing.consultorio.actionCta'),
      ctaRoute: '/signup',
      features: (this.i18n.getRaw('landing.pricing.consultorio.features') as string[]) || [],
    },
    {
      id: 'clinica',
      name: this.i18n.t('landing.pricing.clinica.name'),
      badge: this.i18n.t('landing.pricing.multiBranchBadge'),
      tagline: this.i18n.t('landing.pricing.clinica.desc'),
      monthlyPrice: 2499,
      annualMonthlyPrice: 1999,
      annualTotal: 23988,
      patientLimit: this.i18n.t('landing.pricing.clinica.patientLimit'),
      userLimit: this.i18n.t('landing.pricing.clinica.userLimit'),
      ctaText: this.i18n.t('landing.pricing.clinica.actionCta'),
      ctaRoute: '/signup',
      features: (this.i18n.getRaw('landing.pricing.clinica.features') as string[]) || [],
    },
  ]);

  get plans(): PricingPlan[] {
    return this.plansComputed();
  }

  // Feature Comparison Matrix
  readonly comparisonMatrixComputed = computed<PlanFeatureItem[]>(() => {
    const isEs = this.i18n.isSpanish();
    return [
      { category: isEs ? 'Gestión Clínica' : 'Clinical Management', name: isEs ? 'Expediente NOM-004-SSA3' : 'NOM-004 Electronic Records', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Gestión Clínica' : 'Clinical Management', name: isEs ? 'Notas de Evolución SOAP Ilimitadas' : 'Unlimited SOAP Evolution Notes', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Gestión Clínica' : 'Clinical Management', name: isEs ? 'Consentimientos con Firma Digital' : 'Digital Informed Consents', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Gestión Clínica' : 'Clinical Management', name: isEs ? 'Adjuntos Clínicos y Documentos' : 'Clinical Document Attachments', includedInFreelance: false, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Psicometría' : 'Psychometrics', name: isEs ? 'Batería de Instrumentos Estandarizados' : 'Standardized Assessment Battery', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Psicometría' : 'Psychometrics', name: isEs ? 'Baremación Automática de Resultados' : 'Automated Normative Scoring', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Psicometría' : 'Psychometrics', name: isEs ? 'Aplicaciones Psicométricas Ilimitadas' : 'Unlimited Psychometric Tests', includedInFreelance: false, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Telemedicina' : 'Telehealth', name: isEs ? 'Teleconsulta Cifrada E2E' : 'E2E Encrypted Telehealth', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Telemedicina' : 'Telehealth', name: isEs ? 'Salas HD sin Descargas para Pacientes' : 'Zero-Download HD Patient Rooms', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Comunicación' : 'Communication', name: isEs ? 'Recordatorios de Citas por WhatsApp' : 'Automated WhatsApp Reminders', includedInFreelance: false, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Organización' : 'Organization', name: isEs ? 'Multi-Sedes / Sucursales' : 'Multi-Branch & Locations', includedInFreelance: false, includedInConsultorio: true, includedInClinica: true },
      { category: isEs ? 'Corporativo' : 'Corporate', name: isEs ? 'Módulo de Convenios PAEF B2B' : 'Corporate EAP Agreements Module', includedInFreelance: false, includedInConsultorio: false, includedInClinica: true },
      { category: isEs ? 'Seguridad' : 'Security', name: isEs ? 'Pistas de Auditoría Inmutables (Audit Logs)' : 'Tamper-Proof Audit Trails', includedInFreelance: false, includedInConsultorio: false, includedInClinica: true },
      { category: isEs ? 'Seguridad' : 'Security', name: isEs ? 'Cifrado AES-256 y Respaldos Diarios' : 'AES-256 Encryption & Daily Backups', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
    ];
  });

  get comparisonMatrix(): PlanFeatureItem[] {
    return this.comparisonMatrixComputed();
  }

  // FAQ Accordion Data
  readonly faqsComputed = computed<FaqItem[]>(() => {
    const rawFaqs = (this.i18n.getRaw('landing.faq.items') as Array<{ q: string; a: string }>) || [];
    return rawFaqs.map((item) => ({
      question: item.q,
      answer: item.a,
      category: 'general',
    }));
  });

  get faqs(): FaqItem[] {
    return this.faqsComputed();
  }

  // Filtered Clinical Features signal
  readonly filteredFeatures = computed(() => {
    const category = this.activeFeatureCategory();
    const features = this.clinicalFeaturesComputed();
    if (category === 'all') {
      return features;
    }
    return features.filter((f) => f.category === category);
  });

  // Action Methods
  setBillingCycle(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }

  toggleBillingCycle(): void {
    this.billingCycle.update((curr) => (curr === 'monthly' ? 'annual' : 'monthly'));
  }

  setPreviewTab(tab: PreviewTab): void {
    this.selectedPreviewTab.set(tab);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleFaq(index: number): void {
    this.expandedFaqIndices.update((indices) => {
      if (indices.includes(index)) {
        return indices.filter((i) => i !== index);
      }
      return [...indices, index];
    });
  }

  isFaqExpanded(index: number): boolean {
    return this.expandedFaqIndices().includes(index);
  }

  setFeatureCategory(category: string): void {
    this.activeFeatureCategory.set(category);
  }

  toggleTheme(): void {
    this.themeService.toggleDarkTheme(!this.isDarkTheme());
  }

  scrollToSection(sectionId: string): void {
    this.closeMobileMenu();
    const element = this.document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
