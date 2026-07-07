import { ActionCardVariant } from '../../../shared/components/action-card/action-card.component';
import { MetricCardVariant } from '../../../shared/components/metric-card/metric-card.component';
import { StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { Appointment } from '../../appointments/models/appointment.models';
import { CaseFile } from '../../case-files/models/case-file.models';
import { Document as ClinicalDocument } from '../../documents/models/document.models';
import { FinancialTransactionSummaryDto } from '../../financial-transactions/models/financial-transaction.models';
import { Patient } from '../../patients/models/patient.models';
import { SessionNote } from '../../session-notes/models/session-note.models';

export interface DashboardSnapshot {
  patients: Patient[];
  appointments: Appointment[];
  caseFiles: CaseFile[];
  sessionNotes: SessionNote[];
  documents: ClinicalDocument[];
  financialSummary: FinancialTransactionSummaryDto | null;
  failedSources: string[];
  generatedAt: string;
}

export interface DashboardKpiItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  supportingText: string;
  variant: MetricCardVariant;
}

export interface DashboardAppointmentItem {
  id: string;
  patientName: string;
  scheduledAt: string;
  timeLabel: string;
  scheduleLabel: string;
  notes: string;
  statusLabel: string;
  statusVariant: StatusBadgeVariant;
}

export interface DashboardAgendaWidget {
  title: string;
  subtitle: string;
  items: DashboardAppointmentItem[];
  totalCount: number;
  emptyTitle: string;
  emptyMessage: string;
}

export interface DashboardFinanceMetric {
  id: string;
  icon: string;
  label: string;
  value: string;
  supportingText: string;
  variant: MetricCardVariant;
}

export interface DashboardFinanceSummaryWidget {
  title: string;
  subtitle: string;
  metrics: DashboardFinanceMetric[];
  periodLabel: string;
  emptyTitle: string;
  emptyMessage: string;
}

export interface DashboardClinicalActivityItem {
  id: string;
  type: 'session-note' | 'document' | 'case-file';
  icon: string;
  title: string;
  description: string;
  patientName: string;
  timestamp: string;
  dateLabel: string;
}

export interface DashboardClinicalActivityWidget {
  title: string;
  subtitle: string;
  items: DashboardClinicalActivityItem[];
  emptyTitle: string;
  emptyMessage: string;
}

export interface DashboardOperationalAlertItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  variant: StatusBadgeVariant;
  badgeLabel: string;
}

export interface DashboardOperationalAlertsWidget {
  title: string;
  subtitle: string;
  items: DashboardOperationalAlertItem[];
  emptyTitle: string;
  emptyMessage: string;
}

export type DashboardQuickActionId =
  | 'create-patient'
  | 'create-appointment'
  | 'open-patients'
  | 'open-finance';

export interface DashboardQuickActionItem {
  id: DashboardQuickActionId;
  icon: string;
  label: string;
  variant: ActionCardVariant;
}

export interface DashboardQuickActionsWidget {
  title: string;
  subtitle: string;
  items: DashboardQuickActionItem[];
}

export interface DashboardViewModel {
  generatedAt: string;
  currentDateLabel: string;
  kpiStrip: DashboardKpiItem[];
  agendaToday: DashboardAgendaWidget;
  upcomingAppointments: DashboardAgendaWidget;
  financeSummary: DashboardFinanceSummaryWidget;
  clinicalActivity: DashboardClinicalActivityWidget;
  operationalAlerts: DashboardOperationalAlertsWidget;
  quickActions: DashboardQuickActionsWidget;
  warnings: string[];
}
