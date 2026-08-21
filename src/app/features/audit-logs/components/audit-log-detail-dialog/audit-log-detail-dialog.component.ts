import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditLogEntry, AuditSeverity } from '../../models/audit-log.models';
import {
  AuditActionLabelPipe,
  AuditResourceLabelPipe,
} from '../../pipes/audit-format.pipes';

@Component({
  selector: 'app-audit-log-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    AuditResourceLabelPipe,
    AuditActionLabelPipe,
  ],
  template: `
    <div class="audit-dialog">
      <div class="audit-dialog__header">
        <div class="header-title">
          <mat-icon class="header-icon">policy</mat-icon>
          <div>
            <h2 mat-dialog-title>Detalle de Evento Forense</h2>
            <span class="entry-id">ID: {{ data.id }}</span>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="audit-dialog__content">
        <!-- Overview Grid -->
        <div class="grid-section">
          <div class="info-card">
            <span class="info-label">Fecha y Hora (Local)</span>
            <span class="info-value">{{ data.timestamp | date: 'dd/MM/yyyy, HH:mm:ss.SSS' }}</span>
          </div>

          <div class="info-card">
            <span class="info-label">Nivel de Severidad</span>
            <span class="severity-badge" [ngClass]="getSeverityClass(data.severity)">
              {{ data.severity || 'INFO' }}
            </span>
          </div>

          <div class="info-card">
            <span class="info-label">Acción Forense</span>
            <span class="action-chip" [ngClass]="getActionClass(data.action)">{{
              data.action | auditActionLabel
            }}</span>
            <span class="raw-code" *ngIf="data.action">{{ data.action }}</span>
          </div>

          <div class="info-card">
            <span class="info-label">Tipo de Recurso</span>
            <span class="info-value font-semibold">{{ data.resourceType | auditResourceLabel }}</span>
            <span class="raw-code" *ngIf="data.resourceType">{{ data.resourceType }}</span>
          </div>

          <div class="info-card">
            <span class="info-label">ID de Recurso</span>
            <span class="info-value font-mono">{{ data.resourceId || '—' }}</span>
          </div>

          <div class="info-card">
            <span class="info-label">Usuario Actor</span>
            <div class="actor-info">
              <span class="actor-name">{{
                data.user?.name || data.userId || 'Sistema / Desconocido'
              }}</span>
              <span class="actor-email" *ngIf="data.user?.email">{{ data.user?.email }}</span>
              <span class="role-badge" *ngIf="data.actorRole">{{ data.actorRole }}</span>
            </div>
          </div>

          <div class="info-card">
            <span class="info-label">Sede / Sucursal</span>
            <div class="branch-info" *ngIf="data.branch; else noBranch">
              <span class="branch-name">{{ data.branch.name }}</span>
              <span class="branch-code">({{ data.branch.code }})</span>
            </div>
            <ng-template #noBranch>
              <span class="info-value text-muted">Global / Sin Sede</span>
            </ng-template>
          </div>
        </div>

        <mat-divider class="my-4"></mat-divider>

        <!-- Technical / Network Meta -->
        <div class="network-meta-grid">
          <div class="meta-item">
            <span class="meta-label"><mat-icon>router</mat-icon> Dirección IP:</span>
            <span class="meta-value font-mono">{{ data.ipAddress || '—' }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label"><mat-icon>timer</mat-icon> Tiempo de Ejecución:</span>
            <span class="meta-value">{{
              data.executionTimeMs !== null && data.executionTimeMs !== undefined
                ? data.executionTimeMs + ' ms'
                : '—'
            }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label"><mat-icon>http</mat-icon> Código HTTP:</span>
            <span
              class="meta-value"
              [class.text-success]="(data.statusCode || 200) < 400"
              [class.text-danger]="(data.statusCode || 200) >= 400"
            >
              HTTP {{ data.statusCode || 200 }}
            </span>
          </div>

          <div class="meta-item full-width">
            <span class="meta-label"><mat-icon>devices</mat-icon> User Agent:</span>
            <span class="meta-value font-mono user-agent-text">{{ data.userAgent || '—' }}</span>
          </div>
        </div>

        <mat-divider class="my-4"></mat-divider>

        <!-- Payload / Diff JSON -->
        <div class="details-section">
          <div class="details-header">
            <mat-icon>data_object</mat-icon>
            <h3>Metadata y Parámetros Auditados</h3>
            <span class="compliance-pill">Sanitizado para NOM-004 / HIPAA</span>
            <button
              *ngIf="data.details && hasKeys(data.details)"
              mat-stroked-button
              class="copy-btn"
              (click)="copyPayload()"
            >
              <mat-icon>{{ copiedSignal() ? 'check' : 'content_copy' }}</mat-icon>
              {{ copiedSignal() ? '¡Copiado!' : 'Copiar JSON' }}
            </button>
          </div>

          <pre class="json-payload" *ngIf="data.details && hasKeys(data.details); else noDetails">{{
            formattedDetails
          }}</pre>
          <ng-template #noDetails>
            <div class="no-details-msg">
              No se registraron parámetros adicionales en este evento.
            </div>
          </ng-template>
        </div>
      </div>

      <div class="audit-dialog__actions">
        <button mat-button mat-dialog-close>Cerrar</button>
      </div>
    </div>
  `,
  styles: [
    `
      .audit-dialog {
        display: flex;
        flex-direction: column;
        max-height: 85vh;
        padding: 1.5rem;
        box-sizing: border-box;
        overflow: hidden;

        &__header {
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        &__content {
          flex: 1 1 auto;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        &__actions,
        mat-dialog-actions {
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
          margin-top: 1rem;
          padding: 0;
        }
      }
      .header-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .header-icon {
        color: #1976d2;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .header-title h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      .entry-id {
        font-size: 11px;
        color: #6c757d;
        font-family: monospace;
      }
      .dialog-body {
        max-height: 70vh;
        overflow-y: auto;
      }
      .grid-section {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      .info-card {
        display: flex;
        flex-direction: column;
        background: #f8f9fa;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid #e9ecef;
      }
      .info-label {
        font-size: 11px;
        text-transform: uppercase;
        color: #6c757d;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .info-value {
        font-size: 13px;
        color: #212529;
      }
      .font-semibold {
        font-weight: 600;
      }
      .font-mono {
        font-family: monospace;
      }
      .raw-code {
        font-size: 10px;
        color: #94a3b8;
        font-family: monospace;
        margin-top: 2px;
      }
      .severity-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        width: fit-content;
      }
      .severity-badge.critical {
        background: #ffebee;
        color: #c62828;
        border: 1px solid #ffcdd2;
      }
      .severity-badge.high {
        background: #fff3e0;
        color: #e65100;
        border: 1px solid #ffe0b2;
      }
      .severity-badge.medium {
        background: #fffde7;
        color: #f57f17;
        border: 1px solid #fff59d;
      }
      .severity-badge.low {
        background: #e3f2fd;
        color: #1565c0;
        border: 1px solid #bbdefb;
      }
      .severity-badge.info {
        background: #e8f5e9;
        color: #2e7d32;
        border: 1px solid #c8e6c9;
      }
      .actor-info,
      .branch-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .actor-name {
        font-weight: 600;
        font-size: 13px;
      }
      .actor-email {
        font-size: 11px;
        color: #6c757d;
      }
      .role-badge {
        display: inline-block;
        width: fit-content;
        margin-top: 4px;
        font-size: 10px;
        padding: 2px 6px;
        background: #e3f2fd;
        color: #0d47a1;
        border-radius: 4px;
        font-weight: 600;
      }
      .branch-name {
        font-weight: 600;
        font-size: 13px;
      }
      .branch-code {
        font-size: 11px;
        color: #6c757d;
      }
      .network-meta-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .meta-item.full-width {
        grid-column: 1 / -1;
      }
      .meta-label {
        font-size: 11px;
        color: #6c757d;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .meta-label mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      .meta-value {
        font-size: 12px;
      }
      .user-agent-text {
        word-break: break-all;
        background: #f1f3f5;
        padding: 6px;
        border-radius: 4px;
        font-size: 11px;
      }
      .my-4 {
        margin: 16px 0;
      }
      .details-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .details-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }
      .compliance-pill {
        font-size: 10px;
        padding: 2px 6px;
        background: #e8f5e9;
        color: #2e7d32;
        border-radius: 10px;
        font-weight: 600;
      }
      .copy-btn {
        margin-left: auto;
        font-size: 11px;
        height: 28px;
        line-height: 28px;
        padding: 0 8px;
      }
      .copy-btn mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        margin-right: 4px;
      }
      .json-payload {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 12px;
        border-radius: 6px;
        font-size: 12px;
        overflow-x: auto;
        max-height: 240px;
        margin: 0;
      }
      .no-details-msg {
        font-size: 12px;
        color: #6c757d;
        font-style: italic;
        padding: 8px 0;
      }
      .text-success {
        color: #2e7d32;
        font-weight: 600;
      }
      .text-danger {
        color: #c62828;
        font-weight: 600;
      }
      .action-chip {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        width: fit-content;
      }
      .action-chip.read {
        background: #e3f2fd;
        color: #1565c0;
      }
      .action-chip.mutation {
        background: #fff3e0;
        color: #e65100;
      }
      .action-chip.delete {
        background: #ffebee;
        color: #c62828;
      }
      .action-chip.security {
        background: #f3e5f5;
        color: #6a1b9a;
      }
    `,
  ],
})
export class AuditLogDetailDialogComponent {
  readonly data = inject<AuditLogEntry>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<AuditLogDetailDialogComponent>);
  readonly copiedSignal = signal<boolean>(false);

  get formattedDetails(): string {
    try {
      return JSON.stringify(this.data.details, null, 2);
    } catch {
      return String(this.data.details);
    }
  }

  hasKeys(obj: any): boolean {
    return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
  }

  copyPayload(): void {
    if (!this.data.details) return;
    navigator.clipboard.writeText(this.formattedDetails).then(() => {
      this.copiedSignal.set(true);
      setTimeout(() => this.copiedSignal.set(false), 2000);
    });
  }

  getSeverityClass(severity?: AuditSeverity): string {
    switch (severity) {
      case 'CRITICAL':
        return 'critical';
      case 'HIGH':
        return 'high';
      case 'MEDIUM':
        return 'medium';
      case 'LOW':
        return 'low';
      case 'INFO':
      default:
        return 'info';
    }
  }

  getActionClass(action: string): string {
    if (!action) return 'read';
    const upper = action.toUpperCase();
    if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REVOKE'))
      return 'delete';
    if (
      upper.includes('CREATE') ||
      upper.includes('MUTATION') ||
      upper.includes('UPDATE') ||
      upper.includes('UPLOAD')
    )
      return 'mutation';
    if (
      upper.includes('LOGIN') ||
      upper.includes('AUTH') ||
      upper.includes('ROLE') ||
      upper.includes('SECURITY')
    )
      return 'security';
    return 'read';
  }
}
