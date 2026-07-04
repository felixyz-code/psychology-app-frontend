import { Injectable } from '@angular/core';

import { ReportDefinition, ReportKey } from '../models/report-definition.model';

@Injectable({ providedIn: 'root' })
export class ReportsCatalogService {
  private readonly definitions: ReportDefinition[] = [
    {
      key: 'financial',
      title: 'Reporte Financiero',
      description:
        'Consulta indicadores, filtros y movimientos financieros del período seleccionado con una vista preparada para exportación.',
      category: 'Analítica operativa',
      icon: 'payments',
      route: '/reports/financial',
      supportedExports: ['pdf', 'csv'],
    },
    {
      key: 'agenda',
      title: 'Reporte Agenda',
      description:
        'Consulta citas por rango, estado y paciente con una vista agrupada por día y exportación profesional.',
      category: 'Operación clínica',
      icon: 'event_note',
      route: '/reports/agenda',
      supportedExports: ['pdf', 'csv'],
    },
    {
      key: 'clinical-summary',
      title: 'Resumen Clínico',
      description:
        'Construye un documento clínico profesional centrado en el paciente con resumen, evolución y cronología.',
      category: 'Operación clínica',
      icon: 'description',
      route: '/reports/clinical-summary',
      supportedExports: ['pdf'],
    },
    {
      key: 'clinical-record',
      title: 'Expediente Clínico',
      description:
        'Genera un expediente clínico estructurado e imprimible con datos del paciente, citas, notas, documentos y línea de tiempo.',
      category: 'Operación clínica',
      icon: 'folder_shared',
      route: '/reports/clinical-record',
      supportedExports: ['pdf'],
    },
  ];

  getReports(): ReportDefinition[] {
    return this.definitions;
  }

  getReportByKey(key: ReportKey): ReportDefinition | undefined {
    return this.definitions.find((definition) => definition.key === key);
  }
}
