export type PlanTier =
  | 'FREE'
  | 'STARTER'
  | 'PRO'
  | 'CLINIC'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'
  | 'CUSTOM';

export type BillingInterval = 'MONTHLY' | 'ANNUAL' | 'LIFETIME';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'UNPAID'
  | 'EXPIRED'
  | 'LIFETIME_SPONSOR'
  | 'FROZEN';

export interface PlanQuota {
  maxTherapists: number;
  maxBranches: number;
  maxNotificationsPerMonth: number;
  maxPatients?: number | null;
  canCustomBrand: boolean;
  canTeleconsultation: boolean;
}

export interface OrganizationUsage {
  therapistsCount: number;
  branchesCount: number;
  notificationsCount: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface PlanDetail {
  id: string;
  tier: PlanTier;
  code: string;
  name: string;
  description?: string | null;
  billingInterval: BillingInterval;
  basePrice: string;
  currency: string;
  stripePriceId?: string | null;
}

export interface SubscriptionOverview {
  id: string;
  organizationId: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEndsAt?: string | null;
  isGracePeriod?: boolean;
  plan: PlanDetail;
  quotas: PlanQuota;
  usage: OrganizationUsage;
}

export interface CreateCheckoutSessionPayload {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

export interface CreatePortalSessionPayload {
  returnUrl?: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface QuotaExceededDetails {
  statusCode: number;
  error?: string;
  code?: string;
  resource: string;
  currentUsage: number;
  maxAllowed: number;
  currentTier: string;
  suggestedTier: string;
  message?: string;
}

export interface CommercialPlanDefinition {
  tier: PlanTier;
  code: string;
  name: string;
  tagline: string;
  priceMxn: number;
  formattedPrice: string;
  billingIntervalText: string;
  stripePriceId: string;
  isPopular?: boolean;
  features: string[];
  quotasSummary: {
    therapists: string;
    branches: string;
    notifications: string;
    teleconsultation: boolean;
    customBrand: boolean;
  };
}

export const COMMERCIAL_PLANS: CommercialPlanDefinition[] = [
  {
    tier: 'STARTER',
    code: 'starter-monthly',
    name: 'Starter',
    tagline: 'Ideal para consultorios independientes y terapeutas en práctica privada.',
    priceMxn: 399,
    formattedPrice: '$399 MXN',
    billingIntervalText: 'por mes',
    stripePriceId: 'price_starter_monthly_mxn',
    isPopular: false,
    features: [
      '1 Terapeuta profesional incluido',
      '1 Sucursal / Consultorio registrado',
      'Hasta 100 Notificaciones y recordatorios / mes',
      'Expediente Clínico NOM-004-SSA3-2012',
      'Agenda y programación de citas básicas',
      'Consentimientos informados digitales',
    ],
    quotasSummary: {
      therapists: '1 terapeuta',
      branches: '1 sucursal',
      notifications: '100 / mes',
      teleconsultation: false,
      customBrand: false,
    },
  },
  {
    tier: 'PRO',
    code: 'pro-monthly',
    name: 'Pro',
    tagline: 'Para clínicas en crecimiento y equipos multidisciplinarios.',
    priceMxn: 999,
    formattedPrice: '$999 MXN',
    billingIntervalText: 'por mes',
    stripePriceId: 'price_pro_monthly_mxn',
    isPopular: true,
    features: [
      'Hasta 3 Terapeutas profesionales',
      'Hasta 2 Sucursales o sedes clínicas',
      '500 Notificaciones automáticas / mes',
      'Sala de Teleconsulta cifrada integrada (WebRTC)',
      'Módulo de Finanzas, Facturación e Ingresos',
      'Baterías psicométricas y corrección automática',
      'Recordatorios automatizados por WhatsApp y Email',
    ],
    quotasSummary: {
      therapists: 'Hasta 3 terapeutas',
      branches: 'Hasta 2 sucursales',
      notifications: '500 / mes',
      teleconsultation: true,
      customBrand: false,
    },
  },
  {
    tier: 'CLINIC',
    code: 'clinic-monthly',
    name: 'Clinic',
    tagline: 'Para centros psicológicos avanzados e instituciones de salud mental.',
    priceMxn: 1999,
    formattedPrice: '$1,999 MXN',
    billingIntervalText: 'por mes',
    stripePriceId: 'price_clinic_monthly_mxn',
    isPopular: false,
    features: [
      'Hasta 10 Terapeutas profesionales',
      'Hasta 5 Sucursales o sedes físicas',
      '2,500 Notificaciones / mes',
      'Marca blanca & Custom Branding (Logo e Identidad)',
      'Convenios Corporativos B2B (PAEF)',
      'Auditoría forense y trazabilidad completa',
      'Soporte técnico prioritario y onboarding asistido',
    ],
    quotasSummary: {
      therapists: 'Hasta 10 terapeutas',
      branches: 'Hasta 5 sucursales',
      notifications: '2,500 / mes',
      teleconsultation: true,
      customBrand: true,
    },
  },
  {
    tier: 'ENTERPRISE',
    code: 'enterprise-custom',
    name: 'Enterprise',
    tagline: 'Para redes hospitalarias, universidades y grandes corporativos.',
    priceMxn: 0,
    formattedPrice: 'A la medida',
    billingIntervalText: 'contrato anual',
    stripePriceId: 'price_enterprise_custom',
    isPopular: false,
    features: [
      'Terapeutas ilimitados',
      'Sedes y sucursales ilimitadas',
      'Volumen ilimitado de notificaciones',
      'Multi-organización y estructura federada',
      'SLA garantizado 99.9% de disponibilidad',
      'Facturación corporativa personalizada (CFDI 4.0)',
      'Gerente de cuenta dedicado y capacitación in-company',
    ],
    quotasSummary: {
      therapists: 'Ilimitados',
      branches: 'Ilimitadas',
      notifications: 'Ilimitadas',
      teleconsultation: true,
      customBrand: true,
    },
  },
];
