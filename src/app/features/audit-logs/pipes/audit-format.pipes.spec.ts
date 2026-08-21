import { describe, it, expect } from 'vitest';
import {
  AuditActionLabelPipe,
  AuditResourceLabelPipe,
  formatAuditAction,
  formatAuditResource,
} from './audit-format.pipes';

describe('AuditFormatPipes', () => {
  describe('AuditResourceLabelPipe & formatAuditResource', () => {
    const pipe = new AuditResourceLabelPipe();

    it('translates known clinical and platform resource names to Spanish', () => {
      expect(pipe.transform('SessionNote')).toBe('Nota de Evolución');
      expect(pipe.transform('Document')).toBe('Documento Clínico');
      expect(pipe.transform('CaseFile')).toBe('Expediente Clínico');
      expect(pipe.transform('CaseFileAttachment')).toBe('Adjunto de Expediente');
      expect(pipe.transform('ScheduleBlock')).toBe('Bloqueo de Agenda');
      expect(pipe.transform('Patient')).toBe('Paciente');
      expect(pipe.transform('Appointment')).toBe('Cita');
      expect(pipe.transform('PsychologistProfile')).toBe('Perfil Profesional');
      expect(pipe.transform('Organization')).toBe('Organización');
      expect(pipe.transform('Branch')).toBe('Sede / Sucursal');
      expect(pipe.transform('PaefAgreement')).toBe('Convenio Corporativo');
    });

    it('handles unknown or empty resource types gracefully', () => {
      expect(pipe.transform(null)).toBe('—');
      expect(pipe.transform(undefined)).toBe('—');
      expect(pipe.transform('')).toBe('—');
      expect(formatAuditResource('CustomEntity')).toBe('Custom Entity');
    });
  });

  describe('AuditActionLabelPipe & formatAuditAction', () => {
    const pipe = new AuditActionLabelPipe();

    it('translates known forensic actions to Spanish', () => {
      expect(pipe.transform('CLINICAL_NOTE_READ')).toBe('Lectura de Nota');
      expect(pipe.transform('CLINICAL_DOCUMENT_READ')).toBe('Lectura de Documento');
      expect(pipe.transform('CLINICAL_CASE_FILE_READ')).toBe('Consulta de Expediente');
      expect(pipe.transform('CLINICAL_PATIENT_READ')).toBe('Consulta de Paciente');
      expect(pipe.transform('CLINICAL_DOCUMENT_DELETE')).toBe('Eliminación de Documento');
      expect(pipe.transform('CLINICAL_DOCUMENT_EXPORT')).toBe('Exportación de Documento Clínico');
      expect(pipe.transform('CLINICAL_ATTACHMENT_UPLOAD')).toBe('Carga de Adjunto Clínico');
      expect(pipe.transform('CLINICAL_ATTACHMENT_READ')).toBe('Consulta de Adjuntos Clínicos');
      expect(pipe.transform('CLINICAL_ATTACHMENT_DOWNLOAD')).toBe('Descarga de Adjunto Clínico');
      expect(pipe.transform('CLINICAL_ATTACHMENT_VIEW')).toBe('Previsualización de Adjunto');
      expect(pipe.transform('CLINICAL_ATTACHMENT_DELETE')).toBe('Eliminación de Adjunto Clínico');
      expect(pipe.transform('CLINICAL_APPOINTMENT_RESCHEDULED')).toBe('Reprogramación de Cita');
      expect(pipe.transform('CLINICAL_SCHEDULE_BLOCK_CREATED')).toBe('Creación de Bloqueo de Agenda');
      expect(pipe.transform('CLINICAL_SCHEDULE_BLOCK_DELETED')).toBe('Eliminación de Bloqueo de Agenda');
      expect(pipe.transform('AUTH_ROLE_CHANGE')).toBe('Cambio de Rol');
      expect(pipe.transform('AUTH_LOGIN')).toBe('Inicio de Sesión');
    });

    it('handles unknown or empty actions gracefully', () => {
      expect(pipe.transform(null)).toBe('—');
      expect(pipe.transform(undefined)).toBe('—');
      expect(formatAuditAction('UNKNOWN_ACTION')).toBe('Unknown Action');
    });
  });
});
