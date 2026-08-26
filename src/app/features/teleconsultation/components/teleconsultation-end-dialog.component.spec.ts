import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  TeleconsultationEndDialogComponent,
  TeleconsultationEndDialogData,
} from './teleconsultation-end-dialog.component';

describe('TeleconsultationEndDialogComponent', () => {
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    dialogRef = { close: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  function createComponent(
    data: TeleconsultationEndDialogData = {
      patientName: 'Eduardo Garza',
      appointmentId: 'appt-123',
    },
  ) {
    TestBed.configureTestingModule({
      imports: [TeleconsultationEndDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });

    const fixture = TestBed.createComponent(TeleconsultationEndDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { component, fixture };
  }

  it('creates the component with default markCompleted true', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
    expect(component.markCompleted()).toBe(true);
  });

  it('closes dialog with confirmed true and markCompleted true on confirm()', () => {
    const { component } = createComponent();
    component.confirm();
    expect(dialogRef.close).toHaveBeenCalledWith({
      confirmed: true,
      markCompleted: true,
    });
  });

  it('closes dialog with confirmed false on cancel()', () => {
    const { component } = createComponent();
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith({
      confirmed: false,
      markCompleted: false,
    });
  });

  it('allows toggling markCompleted before confirming', () => {
    const { component } = createComponent();
    component.markCompleted.set(false);
    component.confirm();
    expect(dialogRef.close).toHaveBeenCalledWith({
      confirmed: true,
      markCompleted: false,
    });
  });
});
