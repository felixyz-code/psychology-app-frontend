import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { Appointment } from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';
import { AppointmentsListPage } from './appointments-list.page';

describe('AppointmentsListPage cancellation', () => {
  let getAppointments: ReturnType<typeof vi.fn>;
  let getPatients: ReturnType<typeof vi.fn>;
  let updateAppointment: ReturnType<typeof vi.fn>;
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    getAppointments = vi.fn(() => of([createAppointment()]));
    getPatients = vi.fn(() => of([createPatient()]));
    updateAppointment = vi.fn();
    toastService = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AppointmentsService, useValue: { getAppointments, updateAppointment } },
        { provide: PatientsService, useValue: { getPatients } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: ToastService, useValue: toastService },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('patches cancellation once and refreshes after success', () => {
    const pendingRequest = new Subject<Appointment>();
    updateAppointment.mockReturnValue(pendingRequest);
    const page = createPage();

    page.cancelAppointment(createAppointment());
    page.cancelAppointment(createAppointment());

    expect(updateAppointment).toHaveBeenCalledTimes(1);
    expect(updateAppointment).toHaveBeenCalledWith('appointment-1', { status: 'CANCELLED' });

    pendingRequest.next({ ...createAppointment(), status: 'CANCELLED' });
    pendingRequest.complete();

    expect(page.cancellingAppointmentId()).toBeNull();
    expect(getAppointments).toHaveBeenCalledTimes(2);
  });

  it('unlocks cancellation and exposes a recoverable error without refreshing', () => {
    updateAppointment.mockReturnValue(throwError(() => ({ status: 404 })));
    const page = createPage();

    page.cancelAppointment(createAppointment());

    expect(page.cancellingAppointmentId()).toBeNull();
    expect(page.errorMessage()).toBe('La cita ya no está disponible.');
    expect(getAppointments).toHaveBeenCalledTimes(1);
  });

  it('opens reschedule dialog and reloads appointments on success', () => {
    const dialog = TestBed.inject(MatDialog);
    const dialogRef = { afterClosed: vi.fn(() => of(true)) };
    (dialog.open as any).mockReturnValue(dialogRef);

    const page = createPage();
    page.openRescheduleAppointmentDialog(createAppointment());

    expect(dialog.open).toHaveBeenCalled();
    expect(page.successMessage()).toBe('La cita fue reprogramada correctamente.');
    expect(getAppointments).toHaveBeenCalledTimes(2);
  });

  it('opens schedule blocks manager dialog', () => {
    const dialog = TestBed.inject(MatDialog);
    const dialogRef = { afterClosed: vi.fn(() => of(true)) };
    (dialog.open as any).mockReturnValue(dialogRef);

    const page = createPage();
    page.openScheduleBlocksManager();

    expect(dialog.open).toHaveBeenCalled();
    expect(getAppointments).toHaveBeenCalledTimes(2);
  });

  it('reloads appointments when branchChanges emits from BranchContextService', () => {
    const branchChangesSubject = new Subject<string | null>();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AppointmentsService, useValue: { getAppointments, updateAppointment } },
        { provide: PatientsService, useValue: { getPatients } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: ToastService, useValue: toastService },
        {
          provide: BranchContextService,
          useValue: { branchChanges: branchChangesSubject.asObservable() },
        },
      ],
    });

    const page = createPage();
    expect(getAppointments).toHaveBeenCalledTimes(1);

    branchChangesSubject.next('branch-2');
    expect(getAppointments).toHaveBeenCalledTimes(2);

    page.ngOnDestroy();
    branchChangesSubject.next('branch-3');
    expect(getAppointments).toHaveBeenCalledTimes(2);
  });

  function createPage(): AppointmentsListPage {
    return TestBed.runInInjectionContext(() => new AppointmentsListPage());
  }
});

function createPatient(): Patient {
  return {
    id: 'patient-1',
    psychologistId: 'psychologist-1',
    firstName: 'Ana',
    lastName: 'Lopez',
    createdAt: '',
    updatedAt: '',
  };
}

function createAppointment(): Appointment {
  return {
    id: 'appointment-1',
    patientId: 'patient-1',
    psychologistId: 'psychologist-1',
    scheduledAt: '2026-07-15T16:30:00.000Z',
    durationMinutes: 60,
    status: 'SCHEDULED',
    notes: null,
    createdAt: '',
    updatedAt: '',
  };
}
