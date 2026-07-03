import { Injectable } from '@angular/core';

import { ReportDefinition, ReportKey } from '../models/report-definition.model';

@Injectable({ providedIn: 'root' })
export class ReportsCatalogService {
  private readonly definitions: ReportDefinition[] = [
    {
      key: 'financial',
      title: 'Reporte Financiero',
      description:
        'Consulta indicadores, filtros y movimientos financieros del periodo seleccionado con una vista preparada para exportacion.',
      category: 'Analitica operativa',
      icon: 'payments',
      route: '/reports/financial',
      supportedExports: ['pdf', 'csv'],
    },
  ];

  getReports(): ReportDefinition[] {
    return this.definitions;
  }

  getReportByKey(key: ReportKey): ReportDefinition | undefined {
    return this.definitions.find((definition) => definition.key === key);
  }
}
