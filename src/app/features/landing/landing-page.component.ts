import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
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

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  private readonly themeService = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  readonly isDarkTheme = this.themeService.isDarkTheme;

  // Interactive UI State Signals
  readonly billingCycle = signal<BillingCycle>('monthly');
  readonly selectedPreviewTab = signal<PreviewTab>('soap');
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly expandedFaqIndices = signal<number[]>([0]); // First FAQ open by default
  readonly activeFeatureCategory = signal<string>('all');

  // Trust Badges
  readonly trustBadges = [
    { icon: 'verified_user', label: 'NOM-004-SSA3 / NOM-024', desc: 'Cumplimiento Normativo Oficial' },
    { icon: 'lock', label: 'Cifrado AES-256 / TLS 1.3', desc: 'Seguridad de Grado Bancario' },
    { icon: 'domain', label: 'Multi-Sedes & Multi-Tenant', desc: 'Aislamiento Lógico Seguro' },
    { icon: 'bolt', label: '99.9% Disponibilidad SLA', desc: 'Infraestructura Cloud de Alta Resiliencia' },
  ];

  // Clinical Features Grid
  readonly clinicalFeatures: ClinicalFeature[] = [
    {
      id: 'expediente',
      title: 'Expediente Clínico Electrónico',
      subtitle: 'Cumplimiento estricto NOM-004-SSA3-2012',
      description:
        'Estructura integral para notas de evolución SOAP, historia clínica unificada, antecedentes patológicos y consentimientos informados con firma digital autógrafa.',
      icon: 'description',
      badge: 'NOM-004 Certificado',
      highlights: [
        'Notas SOAP estructuradas con autoguardado',
        'Consentimientos informados con trazabilidad y firma digital',
        'Exportación inmediata de reportes clínicos a PDF institucional',
        'Bloqueo inmutable de notas para cumplimiento legal',
      ],
      category: 'clinical',
    },
    {
      id: 'psicometria',
      title: 'Batería Psicométrica Integrada',
      subtitle: 'Evaluaciones digitales baremadas y alertas clínicas',
      description:
        'Aplica instrumentos estandarizados (ansiedad, depresión, estrés laboral) de forma remota o presencial con calificación baremada automática e identificación de riesgos.',
      icon: 'psychology',
      badge: 'Baremos Automatizados',
      highlights: [
        'Envío de links efímeros para respuesta autónoma del paciente',
        'Cálculo automático de percentiles y puntuaciones típicas',
        'Detección instantánea de alertas clínicas y riesgo suicida',
        'Seguimiento longitudinal y gráficas de evolución temporal',
      ],
      category: 'clinical',
    },
    {
      id: 'teleconsulta',
      title: 'Teleconsulta Cifrada E2E',
      subtitle: 'Salas virtuales efímeras sin descargas ni complicaciones',
      description:
        'Conexión segura de videoconsulta de alta definición con tokens criptográficos efímeros. El paciente ingresa con un clic desde cualquier navegador sin crear cuentas.',
      icon: 'videocam',
      badge: 'Zero-Download HD',
      highlights: [
        'Tokens criptográficos de un solo uso con expiración programada',
        'Panel dividido de notas clínicas y chat confidencial en vivo',
        '100% compatible con computadoras, tablets y smartphones',
        'Cumplimiento de estándares de privacidad médica internacional',
      ],
      category: 'telehealth',
    },
    {
      id: 'corporate-paef',
      title: 'Convenios Corporativos B2B (PAEF)',
      subtitle: 'Gestión de Programas de Asistencia al Empleado',
      description:
        'Administra pólizas y convenios con empresas, débitos automáticos de beneficios por colaborador y bolsas de sesiones con métricas ejecutivas de impacto.',
      icon: 'corporate_fare',
      badge: 'B2B Enterprise',
      highlights: [
        'Control de elegibilidad de empleados por número de nómina',
        'Débito automático de bolsas de cobertura prepagadas',
        'Reportes ejecutivos anonimizados para áreas de Recursos Humanos',
        'Gestión de tarifas preferenciales y facturación por convenio',
      ],
      category: 'admin',
    },
    {
      id: 'agenda-citas',
      title: 'Agenda Médica Inteligente',
      subtitle: 'Programación fluida y recordatorios multicanal',
      description:
        'Calendario optimizado con sincronización de sucursales, bloqueo de horarios no laborables, control de ausentismo y recordatorios automáticos por WhatsApp y correo.',
      icon: 'calendar_month',
      badge: 'Cero Ausentismo',
      highlights: [
        'Vista de agenda por día, semana, mes y terapeuta asignado',
        'Notificaciones y recordatorios automáticos multicanal',
        'Bloqueo preventivo de sobrecupos y festivos',
        'Historial de asistencias, cancelaciones y reagendamientos',
      ],
      category: 'admin',
    },
    {
      id: 'finanzas-metricas',
      title: 'Control Financiero & Métricas',
      subtitle: 'Claridad total en ingresos, cobros y retención',
      description:
        'Panel financiero con registro de transacciones, estados de cuenta por paciente, control de honorarios por terapeuta y métricas de crecimiento clínico.',
      icon: 'account_balance_wallet',
      badge: 'Finanzas Claras',
      highlights: [
        'Registro de pagos en efectivo, transferencias y pasarelas',
        'Reportes de facturación y recibos descargables',
        'Métricas de retención de pacientes y tasa de adherencia',
        'Auditoría y trazabilidad completa de movimientos económicos',
      ],
      category: 'admin',
    },
  ];

  // Pricing Plans
  readonly plans: PricingPlan[] = [
    {
      id: 'freelance',
      name: 'Freelance',
      tagline: 'Para terapeutas y psicólogos individuales con práctica privada independiente.',
      monthlyPrice: 499,
      annualMonthlyPrice: 399,
      annualTotal: 4788,
      patientLimit: 'Hasta 30 pacientes activos',
      userLimit: '1 Terapeuta profesional',
      ctaText: 'Comenzar Gratis',
      ctaRoute: '/signup',
      features: [
        'Expediente clínico NOM-004 completo',
        'Notas SOAP estructuradas ilimitadas',
        'Teleconsulta cifrada estándar',
        '5 evaluaciones psicométricas al mes',
        'Agenda de citas y recordatorios por email',
        'Consentimientos informados digitales',
        'Exportación de expedientes a PDF',
        'Soporte estándar vía correo',
      ],
    },
    {
      id: 'consultorio',
      name: 'Consultorio',
      badge: 'Más Popular',
      popular: true,
      tagline: 'Para consultorios privados, duplas terapéuticas y clínicas en expansión.',
      monthlyPrice: 1199,
      annualMonthlyPrice: 959,
      annualTotal: 11508,
      patientLimit: 'Hasta 150 pacientes activos',
      userLimit: 'Hasta 3 terapeutas / miembros',
      ctaText: 'Prueba Gratis 14 Días',
      ctaRoute: '/signup',
      features: [
        'Todo lo del plan Freelance, y además:',
        'Baterías psicométricas ilimitadas',
        'Teleconsulta HD con salas virtuales ilimitadas',
        'Recordatorios automáticos por WhatsApp y Email',
        'Firma digital autógrafa de pacientes en tableta/móvil',
        'Adjuntos de archivos clínicos (estudios, PDFs, imágenes)',
        'Hasta 2 sucursales o consultorios físicos',
        'Módulo financiero y control de cobros',
        'Soporte prioritario por chat y correo',
      ],
    },
    {
      id: 'clinica',
      name: 'Clínica Enterprise',
      badge: 'Multi-Sedes & PAEF',
      tagline: 'Para clínicas de salud mental, centros especializados y convenios corporativos.',
      monthlyPrice: 2499,
      annualMonthlyPrice: 1999,
      annualTotal: 23988,
      patientLimit: 'Pacientes activos ilimitados',
      userLimit: 'Terapeutas y recepcionistas ilimitados',
      ctaText: 'Comenzar con Clínica',
      ctaRoute: '/signup',
      features: [
        'Todo lo del plan Consultorio, y además:',
        'Gestión de Multi-Sedes y sucursales ilimitadas',
        'Módulo de Convenios Corporativos PAEF (B2B)',
        'Débito automático de bolsas de sesiones empresariales',
        'Roles y permisos granulares (Admin, Terapeuta, Recepción)',
        'Pistas de auditoría clínica avanzadas (Audit Trail)',
        'Personalización de marca, logotipo y temas institucionales',
        'Plantillas de notificación personalizables',
        'Onboarding asistido y soporte 24/7 preferente',
      ],
    },
  ];

  // Feature Comparison Matrix
  readonly comparisonMatrix: PlanFeatureItem[] = [
    { category: 'Gestión Clínica', name: 'Expediente NOM-004-SSA3', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
    { category: 'Gestión Clínica', name: 'Notas de Evolución SOAP Ilimitadas', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
    { category: 'Gestión Clínica', name: 'Consentimientos con Firma Digital', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
    { category: 'Gestión Clínica', name: 'Adjuntos Clínicos y Documentos', includedInFreelance: false, includedInConsultorio: true, includedInClinica: true },
    { category: 'Psicometría', name: 'Batería de Instrumentos Estandarizados', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
    { category: 'Psicometría', name: 'Baremación Automática de Resultados', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
    { category: 'Psicometría', name: 'Aplicaciones Psicométricas Ilimitadas', includedInFreelance: false, includedInConsultorio: true, includedInClinica: true },
    { category: 'Telemedicina', name: 'Teleconsulta Cifrada E2E', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
    { category: 'Telemedicina', name: 'Salas HD sin Descargas para Pacientes', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
    { category: 'Comunicación', name: 'Recordatorios de Citas por WhatsApp', includedInFreelance: false, includedInConsultorio: true, includedInClinica: true },
    { category: 'Organización', name: 'Multi-Sedes / Sucursales', includedInFreelance: false, includedInConsultorio: true, includedInClinica: true },
    { category: 'Corporativo', name: 'Módulo de Convenios PAEF B2B', includedInFreelance: false, includedInConsultorio: false, includedInClinica: true },
    { category: 'Seguridad', name: 'Pistas de Auditoría Inmutables (Audit Logs)', includedInFreelance: false, includedInConsultorio: false, includedInClinica: true },
    { category: 'Seguridad', name: 'Cifrado AES-256 y Respaldos Diarios', includedInFreelance: true, includedInConsultorio: true, includedInClinica: true },
  ];

  // FAQ Accordion Data
  readonly faqs: FaqItem[] = [
    {
      question: '¿PsiqueOS cumple con las normas oficiales mexicanas de salud mental?',
      answer:
        'Sí. PsiqueOS está diseñado en estricto apego a la NOM-004-SSA3-2012 (Del expediente clínico) y la NOM-024-SSA3-2012 (Sistemas de información de registro electrónico para la salud). Garantiza la confidencialidad, estructura estandarizada de notas de evolución (SOAP), inmutabilidad tras cierre y trazabilidad de consentimientos informados.',
      category: 'normatividad',
    },
    {
      question: '¿Mis pacientes necesitan descargar o instalar alguna aplicación para la teleconsulta?',
      answer:
        'No. La teleconsulta de PsiqueOS funciona 100% en el navegador web con tecnología WebRTC cifrada de última generación. El paciente recibe un enlace seguro por WhatsApp o correo y se conecta al instante desde su smartphone, tablet o computadora sin crear cuentas ni descargar programas.',
      category: 'teleconsulta',
    },
    {
      question: '¿Cómo funciona el periodo de prueba gratuito de 14 días?',
      answer:
        'Al crear tu cuenta en PsiqueOS obtienes acceso inmediato y completo a todas las características del plan Consultorio durante 14 días. No solicitamos tarjeta de crédito ni datos de pago para iniciar. Al finalizar tu prueba, puedes seleccionar el plan que mejor se adapte a tus necesidades.',
      category: 'planes',
    },
    {
      question: '¿Cómo se garantiza la seguridad y privacidad de los expedientes de mis pacientes?',
      answer:
        'Todos los datos viajan cifrados mediante TLS 1.3 y se almacenan en reposo con cifrado de grado militar AES-256. Cada consultorio o clínica cuenta con un esquema de base de datos Multi-Tenant aislado, lo que imposibilita cualquier cruce indebido de información entre profesionales.',
      category: 'seguridad',
    },
    {
      question: '¿Puedo migrar los pacientes y expedientes que ya tengo en Excel o papel?',
      answer:
        'Sí. PsiqueOS cuenta con herramientas intuitivas de importación masiva en formato CSV/Excel. Además, nuestro equipo de soporte técnico te acompaña sin costo en el proceso de migración para que tu transición sea rápida y sin interrupciones en tu consulta diaria.',
      category: 'migracion',
    },
    {
      question: '¿Qué incluye el módulo de Convenios Corporativos PAEF del plan Clínica?',
      answer:
        'El módulo PAEF permite a las clínicas registrar empresas colaboradoras, administrar pólizas de bienestar psicológico, controlar bolsas de sesiones prepagadas y debitar automáticamente las atenciones por colaborador, generando reportes ejecutivos consolidados para los departamentos de Recursos Humanos.',
      category: 'enterprise',
    },
  ];

  // Filtered Clinical Features signal
  readonly filteredFeatures = computed(() => {
    const category = this.activeFeatureCategory();
    if (category === 'all') {
      return this.clinicalFeatures;
    }
    return this.clinicalFeatures.filter((f) => f.category === category);
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
