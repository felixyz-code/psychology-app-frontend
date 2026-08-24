import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { NotificationTemplate } from '../models/notification-template.models';
import { NotificationTemplatesService } from '../services/notification-templates.service';
import { NotificationTemplatesListPage } from './notification-templates-list.page';

describe('NotificationTemplatesListPage', () => {
  let component: NotificationTemplatesListPage;
  let fixture: ComponentFixture<NotificationTemplatesListPage>;
  let service: {
    findAll: ReturnType<typeof vi.fn>;
    seedDefaults: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let dialog: { open: ReturnType<typeof vi.fn> };

  const mockTemplates: NotificationTemplate[] = [
    {
      id: 'tpl-1',
      organizationId: 'org-1',
      channel: 'WHATSAPP',
      eventType: 'APPOINTMENT_CONFIRMATION',
      name: 'Confirmación WhatsApp',
      body: 'Hola {{patientName}}',
      variables: ['patientName'],
      isActive: true,
      createdAt: '2026-08-21T18:00:00.000Z',
      updatedAt: '2026-08-21T18:00:00.000Z',
    },
    {
      id: 'tpl-2',
      organizationId: 'org-1',
      channel: 'EMAIL',
      eventType: 'APPOINTMENT_REMINDER_24H',
      name: 'Recordatorio Email',
      subject: 'Recordatorio de tu cita',
      body: 'Estimado {{patientName}}, te recordamos tu cita.',
      variables: ['patientName'],
      isActive: false,
      createdAt: '2026-08-21T18:00:00.000Z',
      updatedAt: '2026-08-21T18:00:00.000Z',
    },
    {
      id: 'tpl-3',
      organizationId: 'org-1',
      channel: 'SMS',
      eventType: 'APPOINTMENT_CANCELLED',
      name: 'Cancelación SMS',
      body: 'Tu cita ha sido cancelada.',
      variables: [],
      isActive: true,
      createdAt: '2026-08-21T18:00:00.000Z',
      updatedAt: '2026-08-21T18:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    service = {
      findAll: vi.fn().mockReturnValue(of(mockTemplates)),
      seedDefaults: vi.fn().mockReturnValue(of({ seededCount: 15 })),
      update: vi.fn().mockReturnValue(of({ ...mockTemplates[0], isActive: false })),
      delete: vi.fn().mockReturnValue(of({ id: 'tpl-1', deleted: true })),
    };

    dialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(null) }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationTemplatesService, useValue: service },
        { provide: MatDialog, useValue: dialog },
      ],
    });

    component = TestBed.runInInjectionContext(() => new NotificationTemplatesListPage());
    component.ngOnInit();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads templates and calculates metrics', () => {
    expect(service.findAll).toHaveBeenCalled();
    expect(component.templates().length).toBe(3);
    expect(component.totalTemplatesCount()).toBe(3);
    expect(component.whatsappCount()).toBe(1);
    expect(component.emailCount()).toBe(1);
    expect(component.smsCount()).toBe(1);
  });

  it('filters templates by channel and search query', () => {
    component.onChannelChange('WHATSAPP');
    expect(component.filteredTemplates().length).toBe(1);
    expect(component.filteredTemplates()[0].channel).toBe('WHATSAPP');
    expect(component.selectedTemplateForPreview()?.id).toBe('tpl-1');

    component.onChannelChange('EMAIL');
    expect(component.filteredTemplates().length).toBe(1);
    expect(component.filteredTemplates()[0].channel).toBe('EMAIL');
    expect(component.selectedTemplateForPreview()?.id).toBe('tpl-2');

    component.onChannelChange('ALL');
    component.onSearchQueryChange('recordatorio');
    expect(component.filteredTemplates().length).toBe(1);
    expect(component.filteredTemplates()[0].name).toBe('Recordatorio Email');
    expect(component.selectedTemplateForPreview()?.id).toBe('tpl-2');
  });

  it('auto-selects first template when changing event type filter', () => {
    component.onEventTypeChange('APPOINTMENT_CANCELLED');
    expect(component.filteredTemplates().length).toBe(1);
    expect(component.selectedTemplateForPreview()?.id).toBe('tpl-3');
  });

  it('opens create dialog with expanded dimensions on openCreateDialog call', () => {
    component.openCreateDialog();
    expect(dialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        width: '94vw',
        maxWidth: '1100px',
        maxHeight: '90vh',
      }),
    );
  });

  it('opens edit dialog on openEditDialog call', () => {
    component.openEditDialog(mockTemplates[0]);
    expect(dialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: { template: mockTemplates[0] },
      }),
    );
  });

  it('calls seedDefaults on service when button clicked', () => {
    component.seedDefaults();
    expect(service.seedDefaults).toHaveBeenCalled();
  });

  it('toggles template activation status', () => {
    component.toggleActive(mockTemplates[0], { checked: false });
    expect(service.update).toHaveBeenCalledWith('tpl-1', { isActive: false });
  });

  it('deletes template after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteTemplate(mockTemplates[0]);
    expect(service.delete).toHaveBeenCalledWith('tpl-1');
  });
});
