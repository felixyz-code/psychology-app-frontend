import { Component, OnInit, inject, signal } from '@angular/core';
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

import { AuditLogsService } from '../services/audit-logs.service';
import { BranchesService } from '../../../core/services/branches.service';
import { AuditLogEntry, AuditLogsFilterParams } from '../models/audit-log.models';
import { Branch } from '../../../core/models/branch.models';
import { AuditLogDetailDialogComponent } from '../components/audit-log-detail-dialog/audit-log-detail-dialog.component';

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
            <h1>Bitácora de Auditoría Forense</h1>
            <p class="subtitle">
              Registro inmutable (Append-Only) y trazabilidad legal de accesos y mutaciones clínicas
              (Cumplimiento NOM-004 / HIPAA).
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

          <!-- Resource Type Filter -->
          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Tipo de Recurso</mat-label>
            <mat-select [(ngModel)]="selectedResourceType" (selectionChange)="onFilterChange()">
              <mat-option [value]="''">Todos los Recursos</mat-option>
              <mat-option value="Patient">Paciente</mat-option>
              <mat-option value="SessionNote">Nota de Sesión</mat-option>
              <mat-option value="CaseFile">Expediente Clínico</mat-option>
              <mat-option value="Document">Documento / Archivo</mat-option>
              <mat-option value="Appointment">Cita</mat-option>
              <mat-option value="Branch">Sede</mat-option>
              <mat-option value="PaefAgreement">Convenio Corporativo</mat-option>
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
              placeholder="Ej. CLINICAL, paciente..."
            />
            <button
              *ngIf="searchTerm"
              matSuffix
              mat-icon-button
              aria-label="Clear"
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
              <th mat-header-cell *matHeaderCellDef>Fecha y Hora</th>
              <td mat-cell *matCellDef="let row">
                <div class="timestamp-box">
                  <span class="date-str">{{ row.timestamp | date: 'dd/MM/yyyy' }}</span>
                  <span class="time-str">{{ row.timestamp | date: 'HH:mm:ss.SSS' }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Actor Column -->
            <ng-container matColumnDef="actor">
              <th mat-header-cell *matHeaderCellDef>Actor</th>
              <td mat-cell *matCellDef="let row">
                <div class="actor-box">
                  <span class="actor-name">{{ row.user?.name || row.userId || 'Sistema' }}</span>
                  <span class="actor-email" *ngIf="row.user?.email">{{ row.user?.email }}</span>
                  <span class="role-pill" *ngIf="row.actorRole">{{ row.actorRole }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Branch Column -->
            <ng-container matColumnDef="branch">
              <th mat-header-cell *matHeaderCellDef>Sede</th>
              <td mat-cell *matCellDef="let row">
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
              <th mat-header-cell *matHeaderCellDef>Acción Forense</th>
              <td mat-cell *matCellDef="let row">
                <div class="action-box">
                  <span class="action-chip" [ngClass]="getActionClass(row.action)">
                    {{ row.action }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Resource Column -->
            <ng-container matColumnDef="resource">
              <th mat-header-cell *matHeaderCellDef>Recurso Afectado</th>
              <td mat-cell *matCellDef="let row">
                <div class="resource-box">
                  <span class="resource-type">{{ row.resourceType }}</span>
                  <span class="resource-id" [class.text-muted]="!row.resourceId">{{
                    row.resourceId || '—'
                  }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Network / IP Column -->
            <ng-container matColumnDef="network">
              <th mat-header-cell *matHeaderCellDef>Origen</th>
              <td mat-cell *matCellDef="let row">
                <div class="network-box">
                  <span class="ip-address font-mono">{{ row.ipAddress || '—' }}</span>
                  <span
                    class="status-code"
                    [class.ok]="(row.statusCode || 200) < 400"
                    [class.err]="(row.statusCode || 200) >= 400"
                  >
                    HTTP {{ row.statusCode || 200 }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="text-right">Detalle</th>
              <td mat-cell *matCellDef="let row" class="text-right">
                <button
                  mat-icon-button
                  color="primary"
                  (click)="openDetail(row)"
                  matTooltip="Ver detalle forense y diff"
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
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }
      .header-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 16px;
      }
      .title-group {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .icon-circle {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: #e3f2fd;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-circle mat-icon {
        color: #1565c0;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .title-group h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--app-color-heading);
      }
      .subtitle {
        margin: 4px 0 0 0;
        font-size: 13px;
        color: var(--app-color-muted);
      }
      .header-actions {
        display: flex;
        gap: 12px;
      }
      .filter-card {
        padding: 20px 24px;
        margin-bottom: 24px;
        border-radius: 14px;
        border: 1px solid var(--app-color-card-border);
        background: var(--app-color-card-bg);
        box-shadow: var(--app-shadow-card);
      }
      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
      }
      .search-item {
        grid-column: span 2;
      }
      .table-card {
        position: relative;
        border-radius: 14px;
        border: 1px solid var(--app-color-card-border);
        background: var(--app-color-card-bg);
        box-shadow: var(--app-shadow-card);
        overflow: hidden;
      }
      .table-responsive {
        overflow-x: auto;
      }
      .audit-table {
        width: 100%;
        border-collapse: collapse;
      }
      .audit-table th.mat-header-cell,
      .audit-table td.mat-cell {
        vertical-align: middle;
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
      }
      .audit-row {
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      .audit-row:hover {
        background-color: #f8f9fa;
      }
      .timestamp-box,
      .actor-box,
      .branch-box,
      .action-box,
      .resource-box,
      .network-box {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 40px;
        gap: 2px;
      }
      .date-str {
        display: block;
        font-weight: 600;
        font-size: 13px;
      }
      .time-str {
        display: block;
        font-size: 11px;
        color: #6c757d;
        font-family: monospace;
      }
      .actor-name {
        font-weight: 600;
        font-size: 13px;
      }
      .actor-email {
        font-size: 11px;
        color: #6c757d;
      }
      .role-pill {
        display: inline-block;
        font-size: 10px;
        padding: 1px 6px;
        background: #f1f3f5;
        border-radius: 4px;
        font-weight: 600;
        width: fit-content;
      }
      .branch-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: #e8f5e9;
        color: #2e7d32;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        width: fit-content;
      }
      .pill-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      .action-chip {
        display: inline-block;
        padding: 3px 8px;
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
      .resource-type {
        font-weight: 600;
        font-size: 12px;
      }
      .resource-id {
        font-size: 11px;
        color: #6c757d;
        font-family: monospace;
      }
      .ip-address {
        font-size: 12px;
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
      .font-mono {
        font-family: monospace;
      }
      .text-muted {
        color: #6c757d;
      }
      .text-xs {
        font-size: 11px;
      }
      .text-right {
        text-align: right;
      }
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        z-index: 10;
      }
      .empty-state {
        padding: 48px;
        text-align: center;
        color: #6c757d;
      }
      .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
        opacity: 0.5;
      }
    `,
  ],
})
export class AuditTrailViewerPage implements OnInit {
  private readonly auditService = inject(AuditLogsService);
  private readonly branchesService = inject(BranchesService);
  private readonly dialog = inject(MatDialog);

  readonly logsSignal = signal<AuditLogEntry[]>([]);
  readonly branchesSignal = signal<Branch[]>([]);
  readonly totalSignal = signal<number>(0);
  readonly loadingSignal = signal<boolean>(false);
  readonly pageIndexSignal = signal<number>(0);
  readonly pageSizeSignal = signal<number>(50);

  selectedBranchId = '';
  selectedResourceType = '';
  fromDate = '';
  toDate = '';
  searchTerm = '';

  displayedColumns = ['timestamp', 'actor', 'branch', 'action', 'resource', 'network', 'actions'];

  ngOnInit(): void {
    this.loadBranches();
    this.loadLogs();
  }

  loadBranches(): void {
    this.branchesService.findAll().subscribe({
      next: (branches) => this.branchesSignal.set(branches),
      error: () => {},
    });
  }

  loadLogs(): void {
    this.loadingSignal.set(true);

    const filter: AuditLogsFilterParams = {
      limit: this.pageSizeSignal(),
      offset: this.pageIndexSignal() * this.pageSizeSignal(),
      ...(this.selectedBranchId && { branchId: this.selectedBranchId }),
      ...(this.selectedResourceType && { resourceType: this.selectedResourceType }),
      ...(this.fromDate && { from: new Date(this.fromDate + 'T00:00:00.000Z').toISOString() }),
      ...(this.toDate && { to: new Date(this.toDate + 'T23:59:59.999Z').toISOString() }),
      ...(this.searchTerm && { search: this.searchTerm.trim() }),
    };

    this.auditService.findAll(filter).subscribe({
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
    this.auditService.exportToCsv(this.logsSignal());
  }

  exportJson(): void {
    this.auditService.exportToJson(this.logsSignal());
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
