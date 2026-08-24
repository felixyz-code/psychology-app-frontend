import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { NotificationTemplate } from '../models/notification-template.models';
import { NotificationTemplatesService } from '../services/notification-templates.service';
import {
  TemplateEditorDialogComponent,
  TemplateEditorDialogData,
} from './template-editor-dialog.component';

describe('TemplateEditorDialogComponent', () => {
  let component: TemplateEditorDialogComponent;
  let fixture: ComponentFixture<TemplateEditorDialogComponent>;
  let service: {
    getVariables: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  const mockExistingTemplate: NotificationTemplate = {
    id: 'tpl-1',
    organizationId: 'org-1',
    channel: 'WHATSAPP',
    eventType: 'APPOINTMENT_CONFIRMATION',
    name: 'Confirmación WhatsApp',
    body: 'Hola {{patientName}}',
    isActive: true,
    createdAt: '2026-08-21T18:00:00.000Z',
    updatedAt: '2026-08-21T18:00:00.000Z',
  };

  const createComponentWithData = async (data?: TemplateEditorDialogData) => {
    service = {
      getVariables: vi.fn().mockReturnValue(
        of([
          {
            key: 'patientName',
            label: 'Nombre Paciente',
            description: 'Nombre',
            exampleValue: 'Ana',
            category: 'patient',
          },
        ]),
      ),
      create: vi.fn(),
      update: vi.fn(),
    };

    dialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TemplateEditorDialogComponent],
      providers: [
        { provide: NotificationTemplatesService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data || null },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateEditorDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('initializes in creation mode with default values', async () => {
    await createComponentWithData();

    expect(component.isEditMode()).toBe(false);
    expect(component.form.get('channel')?.value).toBe('WHATSAPP');
    expect(component.form.get('eventType')?.value).toBe(
      'APPOINTMENT_CONFIRMATION',
    );
  });

  it('initializes in edit mode with provided template data', async () => {
    await createComponentWithData({ template: mockExistingTemplate });

    expect(component.isEditMode()).toBe(true);
    expect(component.form.get('name')?.value).toBe('Confirmación WhatsApp');
    expect(component.form.get('channel')?.disabled).toBe(true);
    expect(component.form.get('eventType')?.disabled).toBe(true);
  });

  it('inserts variable placeholder at body cursor position or end', async () => {
    await createComponentWithData();

    component.form.get('body')?.setValue('Hola');
    component.insertVariable('patientName');

    expect(component.form.get('body')?.value).toContain('{{patientName}}');
  });

  it('calls create on service when valid and in create mode', async () => {
    await createComponentWithData();

    component.form.setValue({
      channel: 'SMS',
      eventType: 'APPOINTMENT_REMINDER_24H',
      name: 'Recordatorio SMS',
      subject: '',
      body: 'Recordatorio para {{patientName}}',
      isActive: true,
    });

    service.create.mockReturnValue(of({ ...mockExistingTemplate, id: 'tpl-new' }));

    component.onSave();

    expect(service.create).toHaveBeenCalledWith({
      channel: 'SMS',
      eventType: 'APPOINTMENT_REMINDER_24H',
      name: 'Recordatorio SMS',
      subject: undefined,
      body: 'Recordatorio para {{patientName}}',
      isActive: true,
    });
    expect(dialogRef.close).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tpl-new' }),
    );
  });

  it('calls update on service when in edit mode', async () => {
    await createComponentWithData({ template: mockExistingTemplate });

    component.form.patchValue({
      name: 'Nombre Modificado',
      body: 'Nuevo texto',
    });

    service.update.mockReturnValue(
      of({ ...mockExistingTemplate, name: 'Nombre Modificado' }),
    );

    component.onSave();

    expect(service.update).toHaveBeenCalledWith('tpl-1', {
      name: 'Nombre Modificado',
      subject: undefined,
      body: 'Nuevo texto',
      isActive: true,
    });
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('handles submission error gracefully setting errorMessage signal', async () => {
    await createComponentWithData();

    component.form.setValue({
      channel: 'SMS',
      eventType: 'APPOINTMENT_REMINDER_24H',
      name: 'Recordatorio SMS',
      subject: '',
      body: 'Texto',
      isActive: true,
    });

    service.create.mockReturnValue(
      throwError(() => ({ error: { message: 'Plantilla duplicada' } })),
    );

    component.onSave();

    expect(component.isSaving()).toBe(false);
    expect(component.errorMessage()).toBe('Plantilla duplicada');
  });
});
