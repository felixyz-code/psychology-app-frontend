import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ClinicalPdfEngineService } from '../../../core/services/clinical-pdf-engine.service';
import { ClinicalPdfExportPayload } from '../models/clinical-pdf.models';
import { ClinicalDocumentPreviewDialogComponent } from './clinical-document-preview-dialog.component';

describe('ClinicalDocumentPreviewDialogComponent', () => {
  let component: ClinicalDocumentPreviewDialogComponent;
  let fixture: ComponentFixture<ClinicalDocumentPreviewDialogComponent>;
  let mockPdfEngine: {
    generateHtml: ReturnType<typeof vi.fn>;
    printDocument: ReturnType<typeof vi.fn>;
  };
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };

  const mockPayload: ClinicalPdfExportPayload = {
    documentType: 'NOM_004_EVOLUTION_NOTE',
    generatedAt: '2026-08-20T20:00:00.000Z',
    tenant: {
      organizationId: 'org-1',
      legalName: 'Psicología Integral S.A. de C.V.',
      displayName: 'Centro PsiqueOS',
      tradeName: null,
      taxId: 'PSI123456ABC',
      phone: '5550001122',
      email: 'contacto@psiqueos.com',
      address: 'Av. Reforma 100',
      primaryColor: '#1976d2',
      accentColor: '#42a5f5',
      logoDataUri: null,
    },
    therapist: {
      id: 'therapist-1',
      name: 'Dra. María Ramos',
      professionalName: 'Dra. María Elena Ramos',
      licenseNumber: 'CED-1234567',
      specialties: ['Psicología'],
      phone: null,
      email: 'dra.maria@clinica.com',
      signatureDataUri: null,
    },
    patient: {
      id: 'patient-1',
      fullName: 'Juan Carlos Pérez',
      firstName: 'Juan Carlos',
      lastName: 'Pérez',
      birthDate: '1992-04-10',
      age: 34,
      phoneNumber: null,
      email: null,
    },
    caseFile: {
      id: 'cf-1',
      diagnosis: 'F41.1 Trastorno de ansiedad generalizada',
      treatmentPlan: 'Terapia cognitiva',
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
    },
    sessionNote: {
      id: 'note-1',
      sessionDate: '2026-08-15T16:00:00.000Z',
      title: 'Nota 1',
      content: 'Contenido clínico de la sesión.',
      createdAt: '2026-08-15T17:00:00.000Z',
      updatedAt: '2026-08-15T17:00:00.000Z',
    },
    appointment: null,
  };

  beforeEach(async () => {
    mockPdfEngine = {
      generateHtml: vi.fn().mockReturnValue('<html><body>Preview Mock</body></html>'),
      printDocument: vi.fn().mockReturnValue(true),
    };
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ClinicalDocumentPreviewDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            payload: mockPayload,
            initialDocumentType: 'NOM_004_EVOLUTION_NOTE',
          },
        },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: ClinicalPdfEngineService, useValue: mockPdfEngine },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClinicalDocumentPreviewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the dialog component and compute sanitizedHtml', () => {
    expect(component).toBeTruthy();
    expect(component.selectedDocType()).toBe('NOM_004_EVOLUTION_NOTE');
    expect(component.sanitizedHtml()).toBeTruthy();
  });

  it('updates selected document type when selectDocType is called', () => {
    component.selectDocType('THERAPEUTIC_PRESCRIPTION');
    expect(component.selectedDocType()).toBe('THERAPEUTIC_PRESCRIPTION');
    expect(mockPdfEngine.generateHtml).toHaveBeenCalled();
    expect(component.sanitizedHtml()).toBeTruthy();
  });

  it('triggers printDocument on print call', () => {
    component.print();
    expect(mockPdfEngine.printDocument).toHaveBeenCalledWith(
      '<html><body>Preview Mock</body></html>',
    );
  });

  it('closes the dialog when close is invoked', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
