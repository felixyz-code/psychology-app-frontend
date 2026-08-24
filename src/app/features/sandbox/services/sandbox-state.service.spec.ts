import { TestBed } from '@angular/core/testing';
import { SandboxStateService } from './sandbox-state.service';

describe('SandboxStateService', () => {
  let service: SandboxStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SandboxStateService],
    });
    service = TestBed.inject(SandboxStateService);
  });

  it('should be created and initialize with default mock state', () => {
    expect(service).toBeTruthy();
    expect(service.activeView()).toBe('dashboard');
    expect(service.selectedPatientId()).toBe('pat-001');
    expect(service.patients().length).toBeGreaterThanOrEqual(4);
    expect(service.soapNotes().length).toBeGreaterThanOrEqual(3);
    expect(service.assessments().length).toBeGreaterThanOrEqual(3);
    expect(service.appointments().length).toBeGreaterThanOrEqual(4);
  });

  it('should switch active views reactively', () => {
    service.selectView('soap');
    expect(service.activeView()).toBe('soap');

    service.selectView('psychometrics');
    expect(service.activeView()).toBe('psychometrics');

    service.selectView('teleconsultation');
    expect(service.activeView()).toBe('teleconsultation');
  });

  it('should switch selected patient and compute filtered data correctly', () => {
    service.selectPatient('pat-002');
    expect(service.selectedPatientId()).toBe('pat-002');
    expect(service.selectedPatient().fullName).toBe('Roberto Carlos Jiménez');
    expect(service.selectedPatientSoapNotes().length).toBeGreaterThan(0);
    expect(service.selectedPatientSoapNotes()[0].patientId).toBe('pat-002');
  });

  it('should trigger simulation toast notifications on simulated save and delete', () => {
    service.simulateSave('Prueba de guardado');
    const notif = service.activeNotification();
    expect(notif).toBeTruthy();
    expect(notif?.type).toBe('success');
    expect(notif?.message).toContain('Prueba de guardado');

    service.simulateDelete('Prueba de borrado');
    const deleteNotif = service.activeNotification();
    expect(deleteNotif).toBeTruthy();
    expect(deleteNotif?.type).toBe('info');
    expect(deleteNotif?.message).toContain('Prueba de borrado');

    service.dismissNotification();
    expect(service.activeNotification()).toBeNull();
  });

  it('should toggle teleconsultation hardware controls', () => {
    const initialMic = service.teleconsultationState().isMicOn;
    service.toggleTeleconsultationMic();
    expect(service.teleconsultationState().isMicOn).toBe(!initialMic);

    const initialCam = service.teleconsultationState().isCameraOn;
    service.toggleTeleconsultationCamera();
    expect(service.teleconsultationState().isCameraOn).toBe(!initialCam);

    const initialScreen = service.teleconsultationState().isScreenSharing;
    service.toggleTeleconsultationScreenShare();
    expect(service.teleconsultationState().isScreenSharing).toBe(!initialScreen);
  });

  it('should reset demo data back to baseline defaults', () => {
    service.selectPatient('pat-003');
    service.selectView('teleconsultation');

    service.resetDemoData();
    expect(service.selectedPatientId()).toBe('pat-001');
    expect(service.activeView()).toBe('dashboard');
  });
});
