import { TestBed } from '@angular/core/testing';
import { ClinicalPdfEngineService } from './clinical-pdf-engine.service';
import { ClinicalPdfExportPayload } from '../../features/case-files/models/clinical-pdf.models';

describe('ClinicalPdfEngineService', () => {
  let service: ClinicalPdfEngineService;

  const mockPayload: ClinicalPdfExportPayload = {
    documentType: 'NOM_004_EVOLUTION_NOTE',
    generatedAt: '2026-08-20T20:00:00.000Z',
    tenant: {
      organizationId: 'org-1',
      legalName: 'Psicología Integral S.A. de C.V.',
      displayName: 'Centro PsiqueOS',
      tradeName: 'PsiqueOS Polanco',
      taxId: 'PSI123456ABC',
      phone: '5550001122',
      email: 'contacto@psiqueos.com',
      address: 'Av. Paseo de la Reforma 100, CDMX',
      primaryColor: '#1976d2',
      accentColor: '#42a5f5',
      logoDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
    therapist: {
      id: 'therapist-1',
      name: 'Dra. María Ramos',
      professionalName: 'Dra. María Elena Ramos',
      licenseNumber: 'CED-1234567',
      specialties: ['Psicología Clínica', 'TCC'],
      phone: '5559876543',
      email: 'dra.maria@clinica.com',
      signatureDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
    patient: {
      id: 'patient-1',
      fullName: 'Juan Carlos Pérez',
      firstName: 'Juan Carlos',
      lastName: 'Pérez',
      birthDate: '1992-04-10',
      age: 34,
      phoneNumber: '5551234567',
      email: 'juan.perez@example.com',
    },
    caseFile: {
      id: 'cf-12345678-abcd',
      diagnosis: 'F41.1 Trastorno de ansiedad generalizada',
      treatmentPlan: 'Reestructuración cognitiva y exposición gradual.',
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
    },
    sessionNote: {
      id: 'note-1',
      sessionDate: '2026-08-15T16:00:00.000Z',
      title: 'Sesión de seguimiento #5',
      content: 'El paciente reporta mejoría notable en la conciliación del sueño.',
      createdAt: '2026-08-15T17:00:00.000Z',
      updatedAt: '2026-08-15T17:00:00.000Z',
    },
    appointment: {
      id: 'appt-1',
      scheduledAt: '2026-08-22T16:00:00.000Z',
      durationMinutes: 50,
      notes: 'Sesión presencial',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClinicalPdfEngineService],
    });
    service = TestBed.inject(ClinicalPdfEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateHtml', () => {
    it('generates NOM-004 Evolution Note HTML with all mandatory normative fields', () => {
      const html = service.generateHtml(mockPayload, 'NOM_004_EVOLUTION_NOTE');

      expect(html).toContain('NOTA DE EVOLUCIÓN CLÍNICA (NOM-004-SSA3-2012)');
      expect(html).toContain('Juan Carlos Pérez');
      expect(html).toContain('34 años');
      expect(html).toContain('F41.1 Trastorno de ansiedad generalizada');
      expect(html).toContain('Dra. María Elena Ramos');
      expect(html).toContain('CED-1234567');
      expect(html).toContain('Centro PsiqueOS');
      expect(html).toContain('data:image/png;base64');
      expect(html).toContain('El paciente reporta mejoría notable');
      expect(html).toContain('FOLIO:');
      expect(html).toContain('EXP-CF-12345');
      expect(html).toContain('Página 1 de 1');
    });

    it('generates Therapeutic Prescription HTML with indications and next appointment', () => {
      const html = service.generateHtml(
        mockPayload,
        'THERAPEUTIC_PRESCRIPTION',
        'Pautas personalizadas para el paciente.',
      );

      expect(html).toContain('RECETA E INDICACIONES TERAPÉUTICAS');
      expect(html).toContain('Pautas personalizadas para el paciente.');
      expect(html).toContain('Juan Carlos Pérez');
      expect(html).toContain('Dra. María Elena Ramos');
      expect(html).toContain('CED-1234567');
      expect(html).toContain('50 minutos');
    });

    it('generates Informed Consent HTML with legal declarations and dual signature zones', () => {
      const html = service.generateHtml(mockPayload, 'INFORMED_CONSENT');

      expect(html).toContain('CONSENTIMIENTO INFORMADO PARA SERVICIOS DE PSICOLOGÍA');
      expect(html).toContain('NOM-004-SSA3-2012');
      expect(html).toContain('FIRMA DEL PACIENTE / TUTOR');
      expect(html).toContain('FIRMA DEL PROFESIONAL');
      expect(html).toContain('Dra. María Elena Ramos');
    });

    it('generates Case File Summary HTML', () => {
      const html = service.generateHtml(mockPayload, 'CASE_FILE_SUMMARY');

      expect(html).toContain('RESUMEN GENERAL DE EXPEDIENTE CLÍNICO');
      expect(html).toContain('Juan Carlos Pérez');
      expect(html).toContain('F41.1 Trastorno de ansiedad generalizada');
    });

    it('escapes special characters properly to prevent XSS', () => {
      const xssPayload: ClinicalPdfExportPayload = {
        ...mockPayload,
        patient: {
          ...mockPayload.patient,
          fullName: '<script>alert("xss")</script>',
        },
      };

      const html = service.generateHtml(xssPayload, 'NOM_004_EVOLUTION_NOTE');
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
  });

  describe('printDocument', () => {
    it('handles print in browser environment', () => {
      const result = service.printDocument('<html><body>Test</body></html>');
      expect(typeof result).toBe('boolean');
    });
  });
});
