import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ClinicalRecordContent } from '../models/clinical-record-report.model';
import { ClinicalSummaryContent } from '../models/clinical-summary-report.model';
import {
  ReportContextItem,
  ReportPreviewGroup,
  ReportTableColumn,
  ReportTableRow,
} from '../models/report-result.model';

@Component({
  selector: 'app-report-preview-shell',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    DataTableEmptyStateComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './report-preview-shell.component.html',
  styleUrl: './report-preview-shell.component.scss',
})
export class ReportPreviewShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly columns = input<ReportTableColumn[]>([]);
  readonly rows = input<ReportTableRow[]>([]);
  readonly displayedColumns = input<string[]>([]);
  readonly groups = input<ReportPreviewGroup[]>([]);
  readonly clinicalContent = input<ClinicalSummaryContent | ClinicalRecordContent | null>(null);
  readonly previewMode = input<'table' | 'grouped' | 'clinical'>('table');
  readonly isLoading = input(false);
  readonly errorMessage = input('');
  readonly contextItems = input<ReportContextItem[]>([]);
  readonly emptyTitle = input('No hay datos para mostrar');
  readonly emptyMessage = input('Ajusta los filtros para generar una vista previa.');
  readonly generatedAt = input('');

  formatGeneratedAt(value: string): string {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return parsedDate.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getColumnLabel(columnKey: string): string {
    return this.columns().find((column) => column.key === columnKey)?.label ?? columnKey;
  }

  isColumnEndAligned(columnKey: string): boolean {
    return this.columns().find((column) => column.key === columnKey)?.align === 'end';
  }

  trackByLabel(_index: number, item: { label: string }): string {
    return item.label;
  }

  isClinicalSummaryContent(
    content: ClinicalSummaryContent | ClinicalRecordContent | null
  ): content is ClinicalSummaryContent {
    return content?.kind === 'summary';
  }

  isClinicalRecordContent(
    content: ClinicalSummaryContent | ClinicalRecordContent | null
  ): content is ClinicalRecordContent {
    return content?.kind === 'record';
  }
}
