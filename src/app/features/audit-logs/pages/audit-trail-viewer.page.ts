import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

import { AuthStore } from '../../../core/auth/auth.store';
import { AuditLogsService } from '../services/audit-logs.service';
import { BranchesService } from '../../../core/services/branches.service';
import {
  AuditLogEntry,
  AuditLogsFilterParams,
  AuditSeverity,
} from '../models/audit-log.models';
import { Branch } from '../../../core/models/branch.models';
import { AuditLogDetailDialogComponent } from '../components/audit-log-detail-dialog/audit-log-detail-dialog.component';
import {
  AuditActionLabelPipe,
  AuditResourceLabelPipe,
} from '../pipes/audit-format.pipes';

@Component({
  selector: 'app-audit-trail-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    AuditResourceLabelPipe,
    AuditActionLabelPipe,
  ],
  template: `
    <div class="audit-trail-container">
      <!-- Header Banner -->
      <div class="header-banner">
        <div class="title-group">
          <div class="icon-circle">
            <mat-icon>verified_user</mat-icon>
          </div>
          <div>
            <h1>{{ isGlobalMode() ? 'Bitácora de Auditoría Global de Plataforma' : 'Bitácora de Auditoría Forense' }}</h1>
            <p class="subtitle">
              {{
                isGlobalMode()
                  ? 'Registro inmutable de gobernanza, mutaciones transversales de organizaciones y seguridad de plataforma.'
                  : 'Registro inmutable (Append-Only) y trazabilidad legal de accesos y mutaciones clínicas (Cumplimiento NOM-004 / HIPAA).'
              }}
            </p>
          </div>
        </div>

        <!-- Export Actions -->
        <div class="header-actions">
          <button
            mat-stroked-button
            color="primary"
            [matMenuTriggerFor]="exportMenu"
            [disabled]="loadingSignal() || logsSignal().length === 0"
          >
            <mat-icon>download</mat-icon>
            Exportar Bitácora
          </button>
          <mat-menu #exportMenu="matMenu">
            <button mat-menu-item (click)="exportCsv()">
              <mat-icon>table_view</mat-icon>
              <span>Descargar en CSV</span>
            </button>
            <button mat-menu-item (click)="exportJson()">
              <mat-icon>data_object</mat-icon>
              <span>Descargar en JSON</span>
            </button>
          </mat-menu>

          <button mat-flat-button color="primary" (click)="loadLogs()" [disabled]="loadingSignal()">
            <mat-icon>refresh</mat-icon>
            Actualizar
          </button>
        </div>
      </div>

      <!-- Filters Card -->
      <mat-card class="filter-card">
        <div class="filters-grid">
          <!-- Branch Selector -->
          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Sede / Sucursal</mat-label>
            <mat-select [(ngModel)]="selectedBranchId" (selectionChange)="onFilterChange()">
              <mat-option [value]="''">Todas las Sedes</mat-option>
              <mat-option *ngFor="let b of branchesSignal()" [value]="b.id">
                {{ b.name }} ({{ b.code }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Severity Filter -->
          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Severidad</mat-label>
            <mat-select [(ngModel)]="selectedSeverity" (selectionChange)="onFilterChange()">
              <mat-option [value]="''">Todas las Severidades</mat-option>
              <mat-option value="CRITICAL">Crítica (CRITICAL)</mat-option>
              <mat-option value="HIGH">Alta (HIGH)</mat-option>
              <mat-option value="MEDIUM">Media (MEDIUM)</mat-option>
              <mat-option value="LOW">Baja (LOW)</mat-option>
              <mat-option value="INFO">Informativa (INFO)</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Resource Type Filter -->
          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Tipo de Recurso</mat-label>
            <mat-select [(ngModel)]="selectedResourceType" (selectionChange)="onFilterChange()">
              <mat-option [value]="''">Todos los Recursos</mat-option>
              <mat-option value="SessionNote">Nota de Evolución</mat-option>
              <mat-option value="Document">Documento Clínico</mat-option>
              <mat-option value="CaseFile">Expediente Clínico</mat-option>
              <mat-option value="CaseFileAttachment">Adjunto de Expediente</mat-option>
              <mat-option value="ScheduleBlock">Bloqueo de Agenda</mat-option>
              <mat-option value="Patient">Paciente</mat-option>
              <mat-option value="Appointment">Cita</mat-option>
              <mat-option value="PsychologistProfile">Perfil Profesional</mat-option>
              <mat-option value="PaefAgreement">Convenio Corporativo</mat-option>
              <mat-option value="Branch">Sede / Sucursal</mat-option>
              <mat-option value="Organization">Organización</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Date From -->
          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Desde (Fecha)</mat-label>
            <input matInput type="date" [(ngModel)]="fromDate" (change)="onFilterChange()" />
          </mat-form-field>

          <!-- Date To -->
          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Hasta (Fecha)</mat-label>
            <input matInput type="date" [(ngModel)]="toDate" (change)="onFilterChange()" />
          </mat-form-field>

          <!-- Text Search -->
          <mat-form-field appearance="outline" class="filter-item search-item">
            <mat-label>Buscar por Acción, Actor o ID</mat-label>
            <input
              matInput
              [(ngModel)]="searchTerm"
              (keyup.enter)="onFilterChange()"
              placeholder="Ej. Paciente, Lectura de Nota..."
            />
            <button
              *ngIf="searchTerm"
              matSuffix
              mat-icon-button
              aria-label="Limpiar búsqueda"
              (click)="searchTerm = ''; onFilterChange()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>
        </div>
      </mat-card>

      <!-- Table Container -->
      <mat-card class="table-card">
        <div *ngIf="loadingSignal()" class="loading-overlay">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Cargando eventos de auditoría...</span>
        </div>

        <div class="table-responsive">
          <table mat-table [dataSource]="logsSignal()" class="audit-table">
            <!-- Timestamp Column -->
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef class="col-timestamp">Fecha y Hora</th>
              <td mat-cell *matCellDef="let row" class="col-timestamp">
                <div class="timestamp-box">
                  <span class="date-str">{{ row.timestamp | date: 'dd/MM/yyyy' }}</span>
                  <span class="time-str">{{ row.timestamp | date: 'HH:mm:ss' }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Severity Column -->
            <ng-container matColumnDef="severity">
              <th mat-header-cell *matHeaderCellDef class="col-severity">Severidad</th>
              <td mat-cell *matCellDef="let row" class="col-severity">
                <span class="severity-pill" [ngClass]="getSeverityClass(row.severity)">
                  {{ row.severity || 'INFO' }}
                </span>
              </td>
            </ng-container>

            <!-- Actor Column -->
            <ng-container matColumnDef="actor">
              <th mat-header-cell *matHeaderCellDef class="col-actor">Actor</th>
              <td mat-cell *matCellDef="let row" class="col-actor">
                <div class="actor-box">
                  <div class="actor-header">
                    <span class="actor-name" [matTooltip]="row.user?.name || row.userId || 'Sistema'">
                      {{ row.user?.name || row.userId || 'Sistema' }}
                    </span>
                    <span class="role-pill" *ngIf="row.actorRole">{{ row.actorRole }}</span>
                  </div>
                  <span class="actor-email" *ngIf="row.user?.email" [matTooltip]="row.user.email">
                    {{ row.user.email }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Branch Column -->
            <ng-container matColumnDef="branch">
              <th mat-header-cell *matHeaderCellDef class="col-branch">Sede</th>
              <td mat-cell *matCellDef="let row" class="col-branch">
                <div class="branch-box">
                  <span *ngIf="row.branch" class="branch-pill" [matTooltip]="row.branch.name">
                    <mat-icon class="pill-icon">business</mat-icon>
                    {{ row.branch.code }}
                  </span>
                  <span *ngIf="!row.branch" class="text-muted text-xs">Global</span>
                </div>
              </td>
            </ng-container>

            <!-- Action Column -->
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef class="col-action">Acción Forense</th>
              <td mat-cell *matCellDef="let row" class="col-action">
                <span
                  class="action-chip"
                  [ngClass]="getActionClass(row.action)"
                  [matTooltip]="row.action"
                >
                  {{ row.action | auditActionLabel }}
                </span>
              </td>
            </ng-container>

            <!-- Resource Column -->
            <ng-container matColumnDef="resource">
              <th mat-header-cell *matHeaderCellDef class="col-resource">Recurso</th>
              <td mat-cell *matCellDef="let row" class="col-resource">
                <div class="resource-box">
                  <span class="resource-type">{{ row.resourceType | auditResourceLabel }}</span>
                  <span class="resource-id" [class.text-muted]="!row.resourceId" [matTooltip]="row.resourceId || ''">
                    {{ row.resourceId || '—' }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="col-actions text-right">Ver</th>
              <td mat-cell *matCellDef="let row" class="col-actions text-right">
                <button
                  mat-icon-button
                  color="primary"
                  (click)="openDetail(row)"
                  matTooltip="Ver detalle forense y payload"
                >
                  <mat-icon>visibility</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns"
              class="audit-row"
              (click)="openDetail(row)"
            ></tr>

            <!-- No Data Row -->
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell empty-table-cell" [attr.colspan]="displayedColumns.length">
                <div class="empty-state">
                  <mat-icon>policy</mat-icon>
                  <p>No se encontraron eventos de auditoría con los filtros seleccionados.</p>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Paginator -->
        <mat-paginator
          [length]="totalSignal()"
          [pageSize]="pageSizeSignal()"
          [pageIndex]="pageIndexSignal()"
          [pageSizeOptions]="[10, 25, 50, 100]"
          (page)="onPageChange($event)"
          showFirstLastButtons
        ></mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .audit-trail-container {
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
      }
      .header-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 16px;
      }
      .title-group {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .icon-circle {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: #e3f2fd;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-circle mat-icon {
        color: #1565c0;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
      .title-group h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: var(--app-color-heading, #1e293b);
      }
      .subtitle {
        margin: 3px 0 0 0;
        font-size: 13px;
        color: var(--app-color-muted, #64748b);
      }
      .header-actions {
        display: flex;
        gap: 10px;
      }
      .filter-card {
        padding: 16px 20px;
        margin-bottom: 20px;
        border-radius: 12px;
        border: 1px solid var(--app-color-card-border, #e2e8f0);
        background: var(--app-color-card-bg, #ffffff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 10px;
      }
      .filter-item {
        width: 100%;
      }
      .search-item {
        grid-column: span 2;
      }
      @media (max-width: 768px) {
        .search-item {
          grid-column: span 1;
        }
      }
      .table-card {
        border-radius: 12px;
        border: 1px solid var(--app-color-card-border, #e2e8f0);
        background: var(--app-color-card-bg, #ffffff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        position: relative;
        width: 100%;
      }
      .table-responsive {
        width: 100%;
        overflow-x: auto;
      }
      .audit-table {
        width: 100%;
        table-layout: auto;
        border-collapse: collapse;
      }
      th.mat-header-cell {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.5px;
        padding: 10px 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      td.mat-cell {
        padding: 8px 12px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 13px;
        vertical-align: middle;
      }
      .audit-row {
        cursor: pointer;
        transition: background 0.12s ease-in-out;
      }
      .audit-row:hover {
        background: #f8fafc;
      }
      .timestamp-box {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
      }
      .date-str {
        font-weight: 500;
        font-size: 12px;
        color: #1e293b;
        white-space: nowrap;
      }
      .time-str {
        font-size: 0.75rem;
        color: #64748b;
        font-family: monospace;
        white-space: nowrap;
      }
      .severity-pill {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .severity-pill.critical {
        background: #ffebee;
        color: #c62828;
        border: 1px solid #ffcdd2;
      }
      .severity-pill.high {
        background: #fff3e0;
        color: #e65100;
        border: 1px solid #ffe0b2;
      }
      .severity-pill.medium {
        background: #fffde7;
        color: #f57f17;
        border: 1px solid #fff59d;
      }
      .severity-pill.low {
        background: #e3f2fd;
        color: #1565c0;
        border: 1px solid #bbdefb;
      }
      .severity-pill.info {
        background: #e8f5e9;
        color: #2e7d32;
        border: 1px solid #c8e6c9;
      }
      .actor-box {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
        max-width: 200px;
      }
      .actor-header {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .actor-name {
        font-weight: 600;
        font-size: 12px;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .actor-email {
        font-size: 0.75rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .role-pill {
        font-size: 9px;
        background: #f1f5f9;
        color: #475569;
        padding: 1px 5px;
        border-radius: 4px;
        font-weight: 600;
        white-space: nowrap;
      }
      .branch-box {
        white-space: nowrap;
      }
      .branch-pill {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: #f1f5f9;
        color: #334155;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
      }
      .pill-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
      }
      .action-chip {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
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
      .resource-box {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
        max-width: 160px;
      }
      .resource-type {
        font-weight: 600;
        font-size: 12px;
        color: #1e293b;
        white-space: nowrap;
      }
      .resource-id {
        font-size: 10px;
        font-family: monospace;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .network-box {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
        white-space: nowrap;
      }
      .ip-address {
        font-size: 11px;
        color: #334155;
      }
      .status-code {
        font-size: 10px;
        font-weight: 600;
      }
      .status-code.ok {
        color: #2e7d32;
      }
      .status-code.err {
        color: #c62828;
      }
      .col-actions {
        width: 48px;
      }
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.75);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        z-index: 10;
      }
      .empty-state {
        padding: 40px;
        text-align: center;
        color: #64748b;
      }
      .empty-state mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        margin-bottom: 6px;
        opacity: 0.4;
      }
      .text-right {
        text-align: right;
      }
      .text-muted {
        color: #94a3b8;
      }
      .text-xs {
        font-size: 11px;
      }
      .font-mono {
        font-family: monospace;
      }
    `,
  ],
})
export class AuditTrailViewerPage implements OnInit {
  private readonly auditService = inject(AuditLogsService);
  private readonly branchesService = inject(BranchesService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);

  readonly isGlobalMode = computed(
    () => this.authStore.isSuperAdmin() && this.router.url.startsWith('/admin'),
  );

  readonly logsSignal = signal<AuditLogEntry[]>([]);
  readonly branchesSignal = signal<Branch[]>([]);
  readonly totalSignal = signal<number>(0);
  readonly loadingSignal = signal<boolean>(false);
  readonly pageIndexSignal = signal<number>(0);
  readonly pageSizeSignal = signal<number>(50);

  selectedBranchId = '';
  selectedSeverity = '';
  selectedResourceType = '';
  fromDate = '';
  toDate = '';
  searchTerm = '';

  displayedColumns = [
    'timestamp',
    'severity',
    'actor',
    'branch',
    'action',
    'resource',
    'actions',
  ];

  ngOnInit(): void {
    this.loadBranches();
    this.loadLogs();
  }

  loadBranches(): void {
    if (this.isGlobalMode()) {
      return;
    }
    this.branchesService.findAll().subscribe({
      next: (branches) => this.branchesSignal.set(branches),
      error: () => {},
    });
  }

  getFilterParams(): AuditLogsFilterParams {
    return {
      limit: this.pageSizeSignal(),
      offset: this.pageIndexSignal() * this.pageSizeSignal(),
      ...(this.selectedBranchId && { branchId: this.selectedBranchId }),
      ...(this.selectedSeverity && { severity: this.selectedSeverity as AuditSeverity }),
      ...(this.selectedResourceType && { resourceType: this.selectedResourceType }),
      ...(this.fromDate && { from: new Date(this.fromDate + 'T00:00:00.000Z').toISOString() }),
      ...(this.toDate && { to: new Date(this.toDate + 'T23:59:59.999Z').toISOString() }),
      ...(this.searchTerm && { search: this.searchTerm.trim() }),
    };
  }

  loadLogs(): void {
    this.loadingSignal.set(true);

    const query$ = this.isGlobalMode()
      ? this.auditService.findGlobal(this.getFilterParams())
      : this.auditService.findAll(this.getFilterParams());

    query$.subscribe({
      next: (res) => {
        this.logsSignal.set(res.items);
        this.totalSignal.set(res.total);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.logsSignal.set([]);
        this.totalSignal.set(0);
        this.loadingSignal.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.pageIndexSignal.set(0);
    this.loadLogs();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndexSignal.set(event.pageIndex);
    this.pageSizeSignal.set(event.pageSize);
    this.loadLogs();
  }

  openDetail(entry: AuditLogEntry): void {
    this.dialog.open(AuditLogDetailDialogComponent, {
      data: entry,
      width: '680px',
    });
  }

  exportCsv(): void {
    const filters = this.getFilterParams();
    this.auditService.exportViaApi(filters, 'csv').subscribe({
      next: (blob) => {
        const dateStr = new Date().toISOString().split('T')[0];
        this.auditService.downloadBlob(blob, `audit_trail_export_${dateStr}.csv`);
      },
      error: () => {
        this.auditService.exportToCsv(this.logsSignal());
      },
    });
  }

  exportJson(): void {
    const filters = this.getFilterParams();
    this.auditService.exportViaApi(filters, 'json').subscribe({
      next: (blob) => {
        const dateStr = new Date().toISOString().split('T')[0];
        this.auditService.downloadBlob(blob, `audit_trail_export_${dateStr}.json`);
      },
      error: () => {
        this.auditService.exportToJson(this.logsSignal());
      },
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
