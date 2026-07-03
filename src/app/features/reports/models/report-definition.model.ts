export type ReportKey = 'financial' | 'agenda' | 'clinical-summary';

export type ReportExportFormat = 'pdf' | 'csv';

export interface ReportDefinition {
  key: ReportKey;
  title: string;
  description: string;
  category: string;
  icon: string;
  route: string;
  supportedExports: ReportExportFormat[];
}
