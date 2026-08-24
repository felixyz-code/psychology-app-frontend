import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SandboxPageComponent } from './sandbox.page';
import { SandboxStateService } from '../services/sandbox-state.service';

describe('SandboxPageComponent', () => {
  let component: SandboxPageComponent;
  let fixture: ComponentFixture<SandboxPageComponent>;
  let sandboxState: SandboxStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SandboxPageComponent],
      providers: [provideRouter([]), SandboxStateService],
    }).compileComponents();

    fixture = TestBed.createComponent(SandboxPageComponent);
    component = fixture.componentInstance;
    sandboxState = TestBed.inject(SandboxStateService);
    fixture.detectChanges();
  });

  it('should create the sandbox page with initial dashboard view and patient selected', () => {
    expect(component).toBeTruthy();
    expect(component.activeView()).toBe('dashboard');
    expect(component.selectedPatient().id).toBe('pat-001');
    expect(component.patients().length).toBeGreaterThanOrEqual(4);
  });

  it('should switch views between dashboard, soap, psychometrics, teleconsultation, and appointments', () => {
    component.setView('soap');
    expect(component.activeView()).toBe('soap');

    component.setView('psychometrics');
    expect(component.activeView()).toBe('psychometrics');

    component.setView('teleconsultation');
    expect(component.activeView()).toBe('teleconsultation');

    component.setView('appointments');
    expect(component.activeView()).toBe('appointments');
  });

  it('should switch patient when selectPatient or onPatientSelectChange is called', () => {
    component.selectPatient('pat-002');
    expect(component.selectedPatient().id).toBe('pat-002');
    expect(component.selectedPatient().fullName).toBe('Roberto Carlos Jiménez');

    const fakeEvent = {
      target: { value: 'pat-003' },
    } as unknown as Event;
    component.onPatientSelectChange(fakeEvent);
    expect(component.selectedPatient().id).toBe('pat-003');
    expect(component.selectedPatient().fullName).toBe('Elena Vega Morales');
  });

  it('should trigger simulation toast when saving SOAP note or locking note', () => {
    component.saveSoapNote();
    expect(sandboxState.activeNotification()).toBeTruthy();
    expect(sandboxState.activeNotification()?.type).toBe('success');

    component.lockSoapNote();
    expect(sandboxState.activeNotification()?.message).toContain('Firma digital');

    component.exportClinicalPdf();
    expect(sandboxState.activeNotification()?.message).toContain('PDF');

    component.deleteNote('soap-001');
    expect(sandboxState.activeNotification()?.type).toBe('info');
  });

  it('should calculate live psychometrics score and severity when updating answers', () => {
    expect(component.simulatedGad7Total()).toBe(9);
    expect(component.simulatedGad7Severity().label).toBe('Ansiedad Leve');

    // Change first 4 answers to 3 (max score)
    component.updateSimulatedAnswer(0, 3);
    component.updateSimulatedAnswer(1, 3);
    component.updateSimulatedAnswer(2, 3);
    component.updateSimulatedAnswer(3, 3);

    expect(component.simulatedGad7Total()).toBe(15);
    expect(component.simulatedGad7Severity().label).toBe('Ansiedad Severa');

    component.submitAssessmentSimulation();
    expect(sandboxState.activeNotification()?.type).toBe('success');
  });

  it('should handle teleconsultation notes and scheduling simulation', () => {
    component.generateEphemeralPatientLink();
    expect(sandboxState.activeNotification()?.message).toContain('Link efímero');

    component.saveInCallNotes();
    expect(sandboxState.activeNotification()?.message).toContain('Notas clínicas en vivo');

    component.scheduleDemoAppointment();
    expect(sandboxState.activeNotification()?.message).toContain('Cita médica programada');
  });

  it('should toggle theme and reset data', () => {
    component.toggleTheme();
    component.resetAllData();
    expect(component.activeView()).toBe('dashboard');
    expect(component.selectedPatient().id).toBe('pat-001');
  });
});
