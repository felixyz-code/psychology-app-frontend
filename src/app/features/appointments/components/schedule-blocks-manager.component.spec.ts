import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';

import { ScheduleBlocksManagerComponent } from './schedule-blocks-manager.component';
import { AppointmentsService } from '../services/appointments.service';
import { ScheduleBlock } from '../models/appointment.models';

describe('ScheduleBlocksManagerComponent', () => {
  let component: ScheduleBlocksManagerComponent;
  let fixture: ComponentFixture<ScheduleBlocksManagerComponent>;
  let appointmentsService: {
    getScheduleBlocks: ReturnType<typeof vi.fn>;
    createScheduleBlock: ReturnType<typeof vi.fn>;
    deleteScheduleBlock: ReturnType<typeof vi.fn>;
  };
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  const mockBlocks: ScheduleBlock[] = [
    {
      id: 'block-1',
      therapistId: 'therapist-1',
      title: 'Capacitación NOM-004',
      reason: 'Asistencia a curso',
      startTime: '2026-08-25T14:00:00.000Z',
      endTime: '2026-08-25T17:00:00.000Z',
      createdAt: '2026-08-21T10:00:00.000Z',
      updatedAt: '2026-08-21T10:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    appointmentsService = {
      getScheduleBlocks: vi.fn().mockReturnValue(of(mockBlocks)),
      createScheduleBlock: vi.fn().mockReturnValue(of(mockBlocks[0])),
      deleteScheduleBlock: vi.fn().mockReturnValue(of(mockBlocks[0])),
    };
    dialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ScheduleBlocksManagerComponent],
      providers: [
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleBlocksManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads schedule blocks on initialization', () => {
    expect(appointmentsService.getScheduleBlocks).toHaveBeenCalled();
    expect(component.blocks()).toEqual(mockBlocks);
    expect(component.isLoading()).toBe(false);
  });

  it('toggles create form visibility', () => {
    expect(component.showCreateForm()).toBe(false);
    component.toggleCreateForm();
    expect(component.showCreateForm()).toBe(true);
  });

  it('validates start and end time order on creation', () => {
    component.blockForm.patchValue({
      title: 'Bloqueo Inválido',
      startTime: '2026-08-25T18:00',
      endTime: '2026-08-25T16:00',
    });

    component.createBlock();
    expect(component.errorMessage()).toBe('La hora de inicio debe ser anterior a la hora de fin.');
    expect(appointmentsService.createScheduleBlock).not.toHaveBeenCalled();
  });

  it('creates schedule block successfully and reloads list', () => {
    component.blockForm.patchValue({
      title: 'Bloqueo Válido',
      reason: 'Supervisión',
      startTime: '2026-08-25T14:00',
      endTime: '2026-08-25T16:00',
    });

    component.createBlock();
    expect(appointmentsService.createScheduleBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bloqueo Válido',
        reason: 'Supervisión',
      }),
    );
    expect(component.successMessage()).toBe('Bloqueo de horario creado correctamente.');
  });

  it('handles conflict error on creation', () => {
    const errorResponse = new HttpErrorResponse({
      error: { message: 'Schedule block overlaps with an existing appointment' },
      status: 400,
    });
    appointmentsService.createScheduleBlock.mockReturnValue(throwError(() => errorResponse));

    component.blockForm.patchValue({
      title: 'Bloqueo Con Conflicto',
      startTime: '2026-08-25T14:00',
      endTime: '2026-08-25T16:00',
    });

    component.createBlock();
    expect(component.errorMessage()).toBe('Schedule block overlaps with an existing appointment');
  });

  it('deletes schedule block and refreshes list', () => {
    component.deleteBlock(mockBlocks[0]);
    expect(appointmentsService.deleteScheduleBlock).toHaveBeenCalledWith('block-1');
    expect(component.successMessage()).toBe('Bloqueo eliminado correctamente.');
  });

  it('closes dialog', () => {
    component.close();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
