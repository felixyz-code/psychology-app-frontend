import { MetricCardVariant } from '../../../shared/components/metric-card/metric-card.component';
import { ReportExportFormat, ReportKey } from './report-definition.model';

export interface ReportMetric {
  icon: string;
  label: string;
  value: string;
  supportingText: string;
  variant: MetricCardVariant;
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

export interface ReportResult<TFilters> {
  reportKey: ReportKey;
  title: string;
  generatedAt: string;
  appliedFilters: TFilters;
  metrics: ReportMetric[];
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  csvFileName: string;
  supportedExports: ReportExportFormat[];
  emptyTitle: string;
  emptyMessage: string;
}
