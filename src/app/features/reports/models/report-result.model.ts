import { MetricCardVariant } from '../../../shared/components/metric-card/metric-card.component';
import { ReportExportFormat, ReportKey } from './report-definition.model';

export interface ReportMetric {
  icon: string;
  label: string;
  value: string;
  supportingText: string;
  variant: MetricCardVariant;
}

export interface ReportContextItem {
  label: string;
  value: string;
}

export interface ReportTableColumn {
  key: string;
  label: string;
  align?: 'start' | 'end';
}

export interface ReportTableRow {
  id: string;
  values: Record<string, string>;
}

export interface ReportPreviewGroupItemBadge {
  label: string;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export interface ReportPreviewGroupItemMeta {
  label: string;
  value: string;
}

export interface ReportPreviewGroupItem {
  id: string;
  leadingText: string;
  title: string;
  supportingText: string;
  badge?: ReportPreviewGroupItemBadge;
  metaItems: ReportPreviewGroupItemMeta[];
}

export interface ReportPreviewGroup {
  id: string;
  title: string;
  supportingText: string;
  items: ReportPreviewGroupItem[];
}

export interface ReportResult<TFilters> {
  reportKey: ReportKey;
  title: string;
  generatedAt: string;
  appliedFilters: TFilters;
  contextItems: ReportContextItem[];
  metrics: ReportMetric[];
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  previewMode: 'table' | 'grouped';
  groups: ReportPreviewGroup[];
  csvFileName: string;
  supportedExports: ReportExportFormat[];
  emptyTitle: string;
  emptyMessage: string;
}
