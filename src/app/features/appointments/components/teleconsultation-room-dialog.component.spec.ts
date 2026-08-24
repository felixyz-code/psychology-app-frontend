import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import {
  TeleconsultationRoomDialogComponent,
  TeleconsultationRoomDialogData,
} from './teleconsultation-room-dialog.component';
import { AppointmentsService } from '../services/appointments.service';
import { TeleconsultationRoom } from '../models/appointment.models';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const MOCK_ROOM: TeleconsultationRoom = {
  id: 'room-uuid-1',
  appointmentId: 'appt-uuid-1',
  organizationId: 'org-uuid-1',
  roomCode: 'abc123def456ghi7',
  provider: 'internal',
  therapistPasscode: '654321',
  patientToken: 'patient-token-uuid-v4',
  expiresAt: new Date(Date.now() + 7200000).toISOString(),
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DIALOG_DATA: TeleconsultationRoomDialogData = { appointmentId: 'appt-uuid-1' };

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('TeleconsultationRoomDialogComponent', () => {
  let dialogRef: { close: ReturnType<typeof vi.fn> };
  let appointmentsService: {
    getTeleconsultationRoom: ReturnType<typeof vi.fn>;
    createTeleconsultationRoom: ReturnType<typeof vi.fn>;
    activateTeleconsultationRoom: ReturnType<typeof vi.fn>;
    terminateTeleconsultationRoom: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dialogRef = { close: vi.fn() };
    appointmentsService = {
      getTeleconsultationRoom: vi.fn().mockReturnValue(of(MOCK_ROOM)),
      createTeleconsultationRoom: vi.fn(),
      activateTeleconsultationRoom: vi.fn(),
      terminateTeleconsultationRoom: vi.fn(),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  function createComponent(data: TeleconsultationRoomDialogData = DIALOG_DATA) {
    TestBed.configureTestingModule({
      imports: [TeleconsultationRoomDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: AppointmentsService, useValue: appointmentsService },
      ],
    });
    const fixture = TestBed.createComponent(TeleconsultationRoomDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { component, fixture };
  }

  it('creates the component', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  it('loads existing room on init', () => {
    const { component } = createComponent();
    expect(component.room()).toEqual(MOCK_ROOM);
    expect(component.isLoading()).toBe(false);
  });

  it('creates a new room when 404 is returned', () => {
    appointmentsService.getTeleconsultationRoom.mockReturnValue(
      throwError(() => ({ status: 404 })),
    );
    appointmentsService.createTeleconsultationRoom.mockReturnValue(of(MOCK_ROOM));
    const { component } = createComponent();
    expect(appointmentsService.createTeleconsultationRoom).toHaveBeenCalledWith('appt-uuid-1');
    expect(component.room()).toEqual(MOCK_ROOM);
  });

  it('sets error when load fails with non-404 error', () => {
    appointmentsService.getTeleconsultationRoom.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );
    const { component } = createComponent();
    expect(component.error()).toBeTruthy();
    expect(component.room()).toBeNull();
  });

  it('uses existingRoom from dialog data without API call', () => {
    const existingRoom: TeleconsultationRoom = { ...MOCK_ROOM, status: 'ACTIVE' };
    const { component } = createComponent({ appointmentId: 'appt-uuid-1', existingRoom });
    expect(component.room()?.status).toBe('ACTIVE');
    expect(appointmentsService.getTeleconsultationRoom).not.toHaveBeenCalled();
  });

  it('computes correct statusLabel for each status', () => {
    const { component } = createComponent();

    component.room.set({ ...MOCK_ROOM, status: 'PENDING' });
    expect(component.statusLabel()).toBe('Pendiente');

    component.room.set({ ...MOCK_ROOM, status: 'ACTIVE' });
    expect(component.statusLabel()).toBe('Activa');

    component.room.set({ ...MOCK_ROOM, status: 'EXPIRED' });
    expect(component.statusLabel()).toBe('Expirada');

    component.room.set({ ...MOCK_ROOM, status: 'TERMINATED' });
    expect(component.statusLabel()).toBe('Terminada');
  });

  it('canActivate is true for PENDING and EXPIRED', () => {
    const { component } = createComponent();

    component.room.set({ ...MOCK_ROOM, status: 'PENDING' });
    expect(component.canActivate()).toBe(true);

    component.room.set({ ...MOCK_ROOM, status: 'EXPIRED' });
    expect(component.canActivate()).toBe(true);

    component.room.set({ ...MOCK_ROOM, status: 'ACTIVE' });
    expect(component.canActivate()).toBe(false);

    component.room.set({ ...MOCK_ROOM, status: 'TERMINATED' });
    expect(component.canActivate()).toBe(false);
  });

  it('canTerminate is true for PENDING and ACTIVE', () => {
    const { component } = createComponent();

    component.room.set({ ...MOCK_ROOM, status: 'PENDING' });
    expect(component.canTerminate()).toBe(true);

    component.room.set({ ...MOCK_ROOM, status: 'ACTIVE' });
    expect(component.canTerminate()).toBe(true);

    component.room.set({ ...MOCK_ROOM, status: 'TERMINATED' });
    expect(component.canTerminate()).toBe(false);
  });

  it('activateRoom calls service and updates room signal', () => {
    const activatedRoom: TeleconsultationRoom = { ...MOCK_ROOM, status: 'ACTIVE' };
    appointmentsService.activateTeleconsultationRoom.mockReturnValue(of(activatedRoom));
    const { component } = createComponent();
    component.activateRoom();
    expect(component.room()?.status).toBe('ACTIVE');
  });

  it('terminateRoom calls service and sets status TERMINATED', () => {
    appointmentsService.terminateTeleconsultationRoom.mockReturnValue(of(undefined));
    const { component } = createComponent();
    component.room.set({ ...MOCK_ROOM, status: 'ACTIVE' });
    component.terminateRoom();
    expect(component.room()?.status).toBe('TERMINATED');
  });

  it('close calls dialogRef.close with current room', () => {
    const { component } = createComponent();
    component.close();
    expect(dialogRef.close).toHaveBeenCalledWith(MOCK_ROOM);
  });

  it('generates correct patientAccessUrl with roomCode and patientToken', () => {
    const { component } = createComponent();
    const url = component.patientAccessUrl();
    expect(url).toContain(`room=${MOCK_ROOM.roomCode}`);
    expect(url).toContain(`token=${MOCK_ROOM.patientToken}`);
  });
});
