import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { TeleconsultationRoomViewPage } from './teleconsultation-room-view.page';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import { PublicTeleconsultationRoom } from '../../appointments/models/appointment.models';
import { TeleconsultationWebRtcService } from '../services/teleconsultation-webrtc.service';

const MOCK_PUBLIC_ROOM: PublicTeleconsultationRoom = {
  id: 'room-uuid-1',
  appointmentId: 'appt-uuid-1',
  roomCode: 'abc123def456ghi7',
  provider: 'internal',
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  scheduledAt: new Date(Date.now()).toISOString(),
  durationMinutes: 50,
  organizationName: 'PsiqueOS Central',
  psychologistName: 'Dr. Carlos Mendoza',
  patientName: 'Ana Sofía Rodríguez',
};

describe('TeleconsultationRoomViewPage', () => {
  let appointmentsService: {
    getPublicTeleconsultationRoom: ReturnType<typeof vi.fn>;
    updateAppointment: ReturnType<typeof vi.fn>;
  };
  let mockDialog: {
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    appointmentsService = {
      getPublicTeleconsultationRoom: vi.fn().mockReturnValue(of(MOCK_PUBLIC_ROOM)),
      updateAppointment: vi.fn().mockReturnValue(of({ id: 'appt-uuid-1', status: 'COMPLETED' })),
    };
    mockDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of({ confirmed: true, markCompleted: true }),
      }),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  function createComponent(
    params: { roomCode?: string } = { roomCode: 'abc123def456ghi7' },
    queryParams: { token?: string; room?: string } = { token: 'token-uuid-123' },
  ) {
    TestBed.configureTestingModule({
      imports: [TeleconsultationRoomViewPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(params),
              queryParamMap: convertToParamMap(queryParams),
            },
          },
        },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: MatDialog, useValue: mockDialog },
        TeleconsultationWebRtcService,
      ],
    });

    const fixture = TestBed.createComponent(TeleconsultationRoomViewPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { component, fixture };
  }

  it('creates the component', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  it('loads room data when roomCode and token are present', () => {
    const { component } = createComponent();
    expect(appointmentsService.getPublicTeleconsultationRoom).toHaveBeenCalledWith(
      'abc123def456ghi7',
      'token-uuid-123',
    );
    expect(component.room()).toEqual(MOCK_PUBLIC_ROOM);
    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('reads roomCode from queryParam "room" if route param is missing', () => {
    const { component } = createComponent({}, { room: 'query-room-code', token: 'tok-1' });
    expect(appointmentsService.getPublicTeleconsultationRoom).toHaveBeenCalledWith(
      'query-room-code',
      'tok-1',
    );
    expect(component.roomCode()).toBe('query-room-code');
  });

  it('sets error when roomCode or token is missing', () => {
    const { component } = createComponent({}, {});
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBe(false);
    expect(appointmentsService.getPublicTeleconsultationRoom).not.toHaveBeenCalled();
  });

  it('handles 404 room not found error', () => {
    appointmentsService.getPublicTeleconsultationRoom.mockReturnValue(
      throwError(() => ({ status: 404 })),
    );
    const { component } = createComponent();
    expect(component.error()).toContain('No se encontró ninguna sala');
    expect(component.isLoading()).toBe(false);
  });

  it('handles 401 unauthorized token error', () => {
    appointmentsService.getPublicTeleconsultationRoom.mockReturnValue(
      throwError(() => ({ status: 401 })),
    );
    const { component } = createComponent();
    expect(component.error()).toContain('token de acceso es inválido');
  });

  it('computes correct status labels and helpers', () => {
    const { component } = createComponent();

    component.room.set({ ...MOCK_PUBLIC_ROOM, status: 'PENDING' });
    expect(component.statusLabel()).toBe('Esperando al profesional');
    expect(component.isRoomPending()).toBe(true);
    expect(component.isRoomActive()).toBe(false);

    component.room.set({ ...MOCK_PUBLIC_ROOM, status: 'ACTIVE' });
    expect(component.statusLabel()).toBe('Sesión en Vivo');
    expect(component.isRoomActive()).toBe(true);

    component.room.set({ ...MOCK_PUBLIC_ROOM, status: 'EXPIRED' });
    expect(component.statusLabel()).toBe('Sesión Expirada');
    expect(component.isRoomExpired()).toBe(true);

    component.room.set({ ...MOCK_PUBLIC_ROOM, status: 'TERMINATED' });
    expect(component.statusLabel()).toBe('Sesión Finalizada');
    expect(component.isRoomTerminated()).toBe(true);
  });

  it('toggles mic, camera, screen share and notes sidebar controls', () => {
    const { component } = createComponent();

    expect(component.isMicOn()).toBe(true);
    component.toggleMic();
    expect(component.isMicOn()).toBe(false);

    expect(component.isCameraOn()).toBe(true);
    component.toggleCamera();
    expect(component.isCameraOn()).toBe(false);

    expect(component.isScreenSharing()).toBe(false);
    component.toggleScreenShare();
    expect(component.isScreenSharing()).toBe(true);

    expect(component.isNotesOpen()).toBe(false);
    component.toggleNotes();
    expect(component.isNotesOpen()).toBe(true);
    component.closeNotes();
    expect(component.isNotesOpen()).toBe(false);
  });

  it('selects audio and video devices through WebRtc service', () => {
    const { component } = createComponent();
    const audioSpy = vi.spyOn(component.webrtc, 'selectAudioDevice');
    const videoSpy = vi.spyOn(component.webrtc, 'selectVideoDevice');

    component.selectAudioDevice('mic-device-1');
    expect(audioSpy).toHaveBeenCalledWith('mic-device-1');

    component.selectVideoDevice('cam-device-1');
    expect(videoSpy).toHaveBeenCalledWith('cam-device-1');
  });

  it('ends call via dialog, marks appointment COMPLETED and rejoins', () => {
    const { component } = createComponent();
    component.room.set({ ...MOCK_PUBLIC_ROOM, status: 'ACTIVE', appointmentId: 'appt-uuid-1' });
    component.isCallActive.set(true);

    component.endCall();
    expect(mockDialog.open).toHaveBeenCalled();
    expect(appointmentsService.updateAppointment).toHaveBeenCalledWith('appt-uuid-1', {
      status: 'COMPLETED',
    });
    expect(component.appointmentMarkedCompleted()).toBe(true);
    expect(component.isCallActive()).toBe(false);
    expect(component.callEnded()).toBe(true);

    component.rejoinCall();
    expect(component.callEnded()).toBe(false);
    expect(component.appointmentMarkedCompleted()).toBe(false);
    expect(appointmentsService.getPublicTeleconsultationRoom).toHaveBeenCalled();
  });
});
