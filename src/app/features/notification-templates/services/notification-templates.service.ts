import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateNotificationTemplatePayload,
  NotificationTemplate,
  QueryNotificationTemplatesParams,
  RenderPreviewRequest,
  RenderPreviewResponse,
  TemplateVariableMetadata,
  UpdateNotificationTemplatePayload,
} from '../models/notification-template.models';

@Injectable({ providedIn: 'root' })
export class NotificationTemplatesService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/notification-templates`;

  /**
   * Lists templates filtered by channel, event type, status, or search query.
   */
  findAll(filters?: QueryNotificationTemplatesParams): Observable<NotificationTemplate[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.channel) params = params.set('channel', filters.channel);
      if (filters.eventType) params = params.set('eventType', filters.eventType);
      if (filters.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
      if (filters.search) params = params.set('search', filters.search);
      if (filters.limit !== undefined) params = params.set('limit', String(filters.limit));
      if (filters.offset !== undefined) params = params.set('offset', String(filters.offset));
    }

    return this.http.get<NotificationTemplate[]>(this.basePath, { params });
  }

  /**
   * Retrieves a single template by ID.
   */
  findOne(id: string): Observable<NotificationTemplate> {
    return this.http.get<NotificationTemplate>(`${this.basePath}/${encodeURIComponent(id)}`);
  }

  /**
   * Creates a new notification template.
   */
  create(payload: CreateNotificationTemplatePayload): Observable<NotificationTemplate> {
    return this.http.post<NotificationTemplate>(this.basePath, payload);
  }

  /**
   * Updates an existing notification template.
   */
  update(
    id: string,
    payload: UpdateNotificationTemplatePayload,
  ): Observable<NotificationTemplate> {
    return this.http.patch<NotificationTemplate>(
      `${this.basePath}/${encodeURIComponent(id)}`,
      payload,
    );
  }

  /**
   * Deletes a notification template.
   */
  delete(id: string): Observable<{ id: string; deleted: boolean; message: string }> {
    return this.http.delete<{ id: string; deleted: boolean; message: string }>(
      `${this.basePath}/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Seeds default system templates for the current organization.
   */
  seedDefaults(): Observable<{ organizationId: string; seededCount: number; templates: NotificationTemplate[] }> {
    return this.http.post<{
      organizationId: string;
      seededCount: number;
      templates: NotificationTemplate[];
    }>(`${this.basePath}/seed-defaults`, {});
  }

  /**
   * Retrieves the dynamic variables metadata catalog.
   */
  getVariables(): Observable<TemplateVariableMetadata[]> {
    return this.http.get<TemplateVariableMetadata[]>(`${this.basePath}/variables`);
  }

  /**
   * Renders a live preview with substituted variable values.
   */
  renderPreview(payload: RenderPreviewRequest): Observable<RenderPreviewResponse> {
    return this.http.post<RenderPreviewResponse>(`${this.basePath}/render-preview`, payload);
  }
}
