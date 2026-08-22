import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import {
  CreateNotificationTemplatePayload,
  NotificationTemplate,
} from '../models/notification-template.models';
import { NotificationTemplatesService } from './notification-templates.service';

describe('NotificationTemplatesService', () => {
  let service: NotificationTemplatesService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/notification-templates`;

  const mockTemplate: NotificationTemplate = {
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationTemplatesService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(NotificationTemplatesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('findAll requests templates with query parameters', () => {
    service
      .findAll({ channel: 'WHATSAPP', eventType: 'APPOINTMENT_CONFIRMATION', isActive: true, search: 'cita' })
      .subscribe((res) => {
        expect(res).toEqual([mockTemplate]);
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === baseUrl &&
        r.params.get('channel') === 'WHATSAPP' &&
        r.params.get('eventType') === 'APPOINTMENT_CONFIRMATION' &&
        r.params.get('isActive') === 'true' &&
        r.params.get('search') === 'cita',
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockTemplate]);
  });

  it('findOne retrieves a single template by id', () => {
    service.findOne('tpl-1').subscribe((res) => {
      expect(res).toEqual(mockTemplate);
    });

    const req = httpMock.expectOne(`${baseUrl}/tpl-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTemplate);
  });

  it('create sends POST request with template data', () => {
    const payload: CreateNotificationTemplatePayload = {
      channel: 'EMAIL',
      eventType: 'APPOINTMENT_CONFIRMATION',
      name: 'Nueva Plantilla',
      subject: 'Asunto',
      body: 'Cuerpo con {{patientName}}',
    };

    service.create(payload).subscribe((res) => {
      expect(res).toEqual(mockTemplate);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockTemplate);
  });

  it('update sends PATCH request with modified data', () => {
    service.update('tpl-1', { name: 'Actualizada' }).subscribe((res) => {
      expect(res.name).toBe('Actualizada');
    });

    const req = httpMock.expectOne(`${baseUrl}/tpl-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Actualizada' });
    req.flush({ ...mockTemplate, name: 'Actualizada' });
  });

  it('delete sends DELETE request', () => {
    service.delete('tpl-1').subscribe((res) => {
      expect(res.deleted).toBe(true);
    });

    const req = httpMock.expectOne(`${baseUrl}/tpl-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 'tpl-1', deleted: true, message: 'Deleted' });
  });

  it('seedDefaults sends POST to seed-defaults endpoint', () => {
    service.seedDefaults().subscribe((res) => {
      expect(res.seededCount).toBe(15);
    });

    const req = httpMock.expectOne(`${baseUrl}/seed-defaults`);
    expect(req.request.method).toBe('POST');
    req.flush({ organizationId: 'org-1', seededCount: 15, templates: [mockTemplate] });
  });

  it('getVariables fetches metadata catalog', () => {
    service.getVariables().subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/variables`);
    expect(req.request.method).toBe('GET');
    req.flush([{ key: 'patientName', label: 'Nombre Paciente' }]);
  });

  it('renderPreview sends POST to render-preview endpoint', () => {
    service
      .renderPreview({ channel: 'WHATSAPP', body: 'Hola {{patientName}}' })
      .subscribe((res) => {
        expect(res.renderedBody).toBe('Hola Ana');
      });

    const req = httpMock.expectOne(`${baseUrl}/render-preview`);
    expect(req.request.method).toBe('POST');
    req.flush({
      renderedBody: 'Hola Ana',
      channel: 'WHATSAPP',
      eventType: 'APPOINTMENT_CONFIRMATION',
      detectedVariables: ['patientName'],
      unmappedVariables: [],
      contextUsed: { patientName: 'Ana' },
    });
  });
});
