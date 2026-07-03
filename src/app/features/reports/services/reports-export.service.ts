import { Injectable } from '@angular/core';

import { ReportResult } from '../models/report-result.model';
import { FinancialReportFilters } from '../models/report-filters.model';

@Injectable({ providedIn: 'root' })
export class ReportsExportService {
  exportAsPdf(result: ReportResult<FinancialReportFilters>): void {
    const printWindow = globalThis.open('', '_blank', 'noopener,noreferrer,width=960,height=720');

    if (!printWindow) {
      return;
    }

    const metricsHtml = result.metrics
      .map(
        (metric) => `
          <div class="metric">
            <span class="metric__label">${this.escapeHtml(metric.label)}</span>
            <strong class="metric__value">${this.escapeHtml(metric.value)}</strong>
            <span class="metric__supporting">${this.escapeHtml(metric.supportingText)}</span>
          </div>
        `
      )
      .join('');

    const contextHtml = result.contextItems
      .map(
        (item) => `
          <div class="context-item">
            <span class="context-item__label">${this.escapeHtml(item.label)}</span>
            <strong class="context-item__value">${this.escapeHtml(item.value)}</strong>
          </div>
        `
      )
      .join('');

    const tableHeadHtml = result.columns
      .map((column) => `<th class="${column.align === 'end' ? 'align-end' : ''}">${this.escapeHtml(column.label)}</th>`)
      .join('');

    const tableRowsHtml = result.rows
      .map((row) => {
        const cells = result.columns
          .map((column) => {
            const value = row.values[column.key] ?? '-';
            const alignClass = column.align === 'end' ? 'align-end' : '';

            return `<td class="${alignClass}">${this.escapeHtml(value)}</td>`;
          })
          .join('');

        return `<tr>${cells}</tr>`;
      })
      .join('');

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${this.escapeHtml(result.title)}</title>
          <style>
            body {
              font-family: "Segoe UI", Arial, sans-serif;
              margin: 28px;
              color: #0f172a;
              background: #ffffff;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 30px;
              line-height: 1.15;
            }
            p {
              margin: 0;
              color: #475569;
            }
            .document {
              display: grid;
              gap: 24px;
            }
            .meta {
              display: grid;
              gap: 8px;
              padding-bottom: 16px;
              border-bottom: 1px solid #dbe3ef;
            }
            .eyebrow {
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #2563eb;
            }
            .context {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }
            .context-item {
              display: grid;
              gap: 4px;
              padding: 12px;
              border: 1px solid #dbe3ef;
              border-radius: 12px;
              background: #ffffff;
            }
            .context-item__label {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              color: #64748b;
            }
            .context-item__value {
              font-size: 14px;
              line-height: 1.35;
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }
            .metric {
              border: 1px solid #dbe3ef;
              border-radius: 12px;
              padding: 12px;
              display: grid;
              gap: 6px;
              background: #f8fafc;
            }
            .metric__label {
              font-size: 12px;
              text-transform: uppercase;
              color: #64748b;
            }
            .metric__value {
              font-size: 22px;
            }
            .metric__supporting {
              font-size: 12px;
              color: #475569;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 10px 12px;
              border-bottom: 1px solid #dbe3ef;
              text-align: left;
              vertical-align: top;
            }
            th {
              font-size: 12px;
              text-transform: uppercase;
              color: #64748b;
            }
            .table-card {
              padding: 16px;
              border: 1px solid #dbe3ef;
              border-radius: 16px;
              background: #ffffff;
            }
            .table-card__header {
              display: flex;
              align-items: baseline;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 12px;
            }
            .table-card__title {
              margin: 0;
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
            }
            .table-card__meta {
              font-size: 12px;
              color: #64748b;
            }
            .align-end {
              text-align: right;
            }
            .empty {
              padding: 20px 0 4px;
              text-align: center;
              color: #64748b;
            }
            @media print {
              body {
                margin: 18px;
              }
              .document {
                gap: 18px;
              }
            }
            @media (max-width: 900px) {
              .context,
              .metrics {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <main class="document">
            <header class="meta">
              <span class="eyebrow">Reporte profesional</span>
              <h1>${this.escapeHtml(result.title)}</h1>
              <p>Generado el ${this.escapeHtml(this.formatDateTime(result.generatedAt))}</p>
            </header>
            <section class="context">${contextHtml}</section>
            <section class="metrics">${metricsHtml}</section>
            <section class="table-card">
              <div class="table-card__header">
                <p class="table-card__title">Vista previa tabular</p>
                <span class="table-card__meta">${result.rows.length === 1 ? '1 registro incluido' : `${result.rows.length} registros incluidos`}</span>
              </div>
              ${
                result.rows.length
                  ? `
                    <table>
                      <thead>
                        <tr>${tableHeadHtml}</tr>
                      </thead>
                      <tbody>
                        ${tableRowsHtml}
                      </tbody>
                    </table>
                  `
                  : `
                    <div class="empty">
                      <p>No hay movimientos para exportar con los filtros actuales.</p>
                    </div>
                  `
              }
            </section>
          </main>
          <script>
            window.addEventListener('load', () => {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  exportAsCsv(result: ReportResult<FinancialReportFilters>): void {
    const header = result.columns.map((column) => column.label);
    const rows = result.rows.map((row) => result.columns.map((column) => row.values[column.key] ?? ''));
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => this.escapeCsvValue(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = globalThis.document.createElement('a');

    link.href = url;
    link.download = result.csvFileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private escapeCsvValue(value: string): string {
    const normalizedValue = value.replace(/"/g, '""');
    return `"${normalizedValue}"`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private formatDateTime(value: string): string {
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
}
