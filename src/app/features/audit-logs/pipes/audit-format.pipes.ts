import { Pipe, PipeTransform } from '@angular/core';

export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  SessionNote: 'Nota de Evolución',
  Document: 'Documento Clínico',
  CaseFile: 'Expediente Clínico',
  Patient: 'Paciente',
  Appointment: 'Cita',
  PsychologistProfile: 'Perfil Profesional',
  Organization: 'Organización',
  Branch: 'Sede / Sucursal',
  PaefAgreement: 'Convenio Corporativo',
  BenefitDebit: 'Débito de Beneficio',
  BenefitPool: 'Bolsa de Sesiones',
  CorporateClient: 'Cliente Corporativo',
  UserAvatarAsset: 'Foto de Perfil',
  UserSignatureAsset: 'Firma Digitalizada',
  OrganizationLogoAsset: 'Logo de Organización',
  Membership: 'Membresía',
  User: 'Usuario',
  Assessment: 'Evaluación Psicométrica',
  AssessmentAdministration: 'Aplicación de Evaluación',
  FinancialTransaction: 'Transacción Financiera',
  System: 'Sistema',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CLINICAL_NOTE_READ: 'Lectura de Nota',
  CLINICAL_NOTE_CREATE: 'Creación de Nota',
  CLINICAL_NOTE_UPDATE: 'Actualización de Nota',
  CLINICAL_NOTE_DELETE: 'Eliminación de Nota',
  CLINICAL_DOCUMENT_READ: 'Lectura de Documento',
  CLINICAL_DOCUMENT_UPLOAD: 'Carga de Documento',
  CLINICAL_DOCUMENT_DELETE: 'Eliminación de Documento',
  CLINICAL_CASE_FILE_READ: 'Consulta de Expediente',
  CLINICAL_CASE_FILE_CREATE: 'Apertura de Expediente',
  CLINICAL_CASE_FILE_UPDATE: 'Actualización de Expediente',
  CLINICAL_PATIENT_READ: 'Consulta de Paciente',
  CLINICAL_PATIENT_CREATE: 'Alta de Paciente',
  CLINICAL_PATIENT_UPDATE: 'Actualización de Paciente',
  CLINICAL_PATIENT_DELETE: 'Baja de Paciente',
  CLINICAL_ASSESSMENT_ASSIGN: 'Asignación de Evaluación',
  CLINICAL_ASSESSMENT_COMPLETE: 'Evaluación Completada',
  CLINICAL_ASSESSMENT_READ: 'Consulta de Evaluación',
  APPOINTMENT_CREATE: 'Creación de Cita',
  APPOINTMENT_UPDATE: 'Actualización de Cita',
  APPOINTMENT_CANCEL: 'Cancelación de Cita',
  AUTH_LOGIN: 'Inicio de Sesión',
  AUTH_LOGOUT: 'Cierre de Sesión',
  AUTH_ROLE_CHANGE: 'Cambio de Rol',
  ORGANIZATION_UPDATE: 'Actualización de Organización',
  ORGANIZATION_BRANDING_UPDATE: 'Actualización de Marca',
  BRANCH_CREATE: 'Creación de Sede',
  BRANCH_UPDATE: 'Actualización de Sede',
  BRANCH_DELETE: 'Eliminación de Sede',
  USER_PROFILE_UPDATE: 'Actualización de Perfil',
  USER_SIGNATURE_UPDATE: 'Actualización de Firma',
  USER_AVATAR_UPDATE: 'Actualización de Avatar',
  CORPORATE_AGREEMENT_CREATE: 'Alta de Convenio',
  CORPORATE_AGREEMENT_UPDATE: 'Actualización de Convenio',
  FINANCIAL_TRANSACTION_CREATE: 'Registro de Cobro/Gasto',
};

export function formatAuditResource(resourceType?: string | null): string {
  if (!resourceType) return '—';
  if (AUDIT_RESOURCE_LABELS[resourceType]) {
    return AUDIT_RESOURCE_LABELS[resourceType];
  }
  // Fallback: Split CamelCase or snake_case nicely
  return resourceType
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

export function formatAuditAction(action?: string | null): string {
  if (!action) return '—';
  if (AUDIT_ACTION_LABELS[action]) {
    return AUDIT_ACTION_LABELS[action];
  }
  // Fallback: Replace underscores and humanize
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

@Pipe({
  name: 'auditResourceLabel',
  standalone: true,
})
export class AuditResourceLabelPipe implements PipeTransform {
  transform(value?: string | null): string {
    return formatAuditResource(value);
  }
}

@Pipe({
  name: 'auditActionLabel',
  standalone: true,
})
export class AuditActionLabelPipe implements PipeTransform {
  transform(value?: string | null): string {
    return formatAuditAction(value);
  }
}
