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
              font-family: Arial, sans-serif;
              margin: 32px;
              color: #0f172a;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 28px;
            }
            p {
              margin: 0;
              color: #475569;
            }
            .meta {
              margin-bottom: 24px;
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin: 24px 0;
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
            .align-end {
              text-align: right;
            }
            @media print {
              body {
                margin: 20px;
              }
            }
          </style>
        </head>
        <body>
          <header class="meta">
            <h1>${this.escapeHtml(result.title)}</h1>
            <p>Generado el ${this.escapeHtml(this.formatDateTime(result.generatedAt))}</p>
          </header>
          <section class="metrics">${metricsHtml}</section>
          <table>
            <thead>
              <tr>${tableHeadHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
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
