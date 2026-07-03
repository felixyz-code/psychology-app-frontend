import { Injectable } from '@angular/core';

import { ReportResult } from '../models/report-result.model';

@Injectable({ providedIn: 'root' })
export class ReportsExportService {
  exportAsPdf(result: ReportResult<unknown>): boolean {
    const printWindow = globalThis.open('about:blank', '_blank', 'width=960,height=720');

    if (!printWindow) {
      return false;
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

    const groupedContentHtml = result.groups
      .map(
        (group) => `
          <section class="group">
            <header class="group__header">
              <h3>${this.escapeHtml(group.title)}</h3>
              <p>${this.escapeHtml(group.supportingText)}</p>
            </header>
            <div class="group__items">
              ${group.items
                .map(
                  (item) => `
                    <article class="agenda-item">
                      <div class="agenda-item__leading">${this.escapeHtml(item.leadingText)}</div>
                      <div class="agenda-item__body">
                        <div class="agenda-item__title-row">
                          <h4>${this.escapeHtml(item.title)}</h4>
                          ${
                            item.badge
                              ? `<span class="agenda-item__badge">${this.escapeHtml(item.badge.label)}</span>`
                              : ''
                          }
                        </div>
                        <p class="agenda-item__supporting">${this.escapeHtml(item.supportingText)}</p>
                        ${
                          item.metaItems.length
                            ? `
                              <div class="agenda-item__meta">
                                ${item.metaItems
                                  .map(
                                    (metaItem) => `
                                      <span class="agenda-item__meta-item">
                                        <strong>${this.escapeHtml(metaItem.label)}:</strong>
                                        <span>${this.escapeHtml(metaItem.value)}</span>
                                      </span>
                                    `
                                  )
                                  .join('')}
                              </div>
                            `
                            : ''
                        }
                      </div>
                    </article>
                  `
                )
                .join('')}
            </div>
          </section>
        `
      )
      .join('');

    const html = `
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
            h1, h3, h4, p {
              margin: 0;
            }
            h1 {
              font-size: 30px;
              line-height: 1.15;
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
            .generated-at {
              color: #475569;
            }
            .context {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }
            .context-item,
            .metric,
            .group,
            .table-card {
              border: 1px solid #dbe3ef;
              border-radius: 12px;
              background: #ffffff;
            }
            .context-item {
              display: grid;
              gap: 4px;
              padding: 12px;
            }
            .context-item__label,
            .metric__label {
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
              padding: 12px;
              display: grid;
              gap: 6px;
              background: #f8fafc;
            }
            .metric__value {
              font-size: 22px;
            }
            .metric__supporting,
            .group__header p,
            .agenda-item__supporting,
            .agenda-item__meta-item,
            .table-card__meta {
              font-size: 12px;
              color: #475569;
            }
            .groups {
              display: grid;
              gap: 16px;
            }
            .group {
              padding: 16px;
              display: grid;
              gap: 12px;
            }
            .group__header {
              display: grid;
              gap: 4px;
            }
            .group__items {
              display: grid;
              gap: 10px;
            }
            .agenda-item {
              display: grid;
              grid-template-columns: 88px minmax(0, 1fr);
              gap: 12px;
              padding: 12px;
              border: 1px solid #dbe3ef;
              border-radius: 12px;
              background: #f8fafc;
            }
            .agenda-item__leading {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 44px;
              border-radius: 10px;
              background: #dbeafe;
              color: #1d4ed8;
              font-weight: 700;
            }
            .agenda-item__body {
              display: grid;
              gap: 6px;
            }
            .agenda-item__title-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
            }
            .agenda-item__badge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 4px 10px;
              border-radius: 999px;
              background: #eff6ff;
              color: #1e3a8a;
              font-size: 11px;
              font-weight: 700;
            }
            .agenda-item__meta {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
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
            }
            .table-card__header {
              display: flex;
              align-items: baseline;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 12px;
            }
            .table-card__title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
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
              .metrics,
              .agenda-item {
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
              <p class="generated-at">Generado el ${this.escapeHtml(this.formatDateTime(result.generatedAt))}</p>
            </header>
            <section class="context">${contextHtml}</section>
            <section class="metrics">${metricsHtml}</section>
            ${
              result.previewMode === 'grouped' && result.groups.length
                ? `<section class="groups">${groupedContentHtml}</section>`
                : `
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
                            <p>No hay registros para exportar con los filtros actuales.</p>
                          </div>
                        `
                    }
                  </section>
                `
            }
          </main>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = null;
    printWindow.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);

    return true;
  }

  exportAsCsv(result: ReportResult<unknown>): void {
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
