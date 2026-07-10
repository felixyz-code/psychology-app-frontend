import { Injectable } from '@angular/core';

import { ClinicalRecordContent } from '../models/clinical-record-report.model';
import { ClinicalSummaryContent } from '../models/clinical-summary-report.model';
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

    const descriptivePdfName = this.ensurePdfExtension(this.sanitizePrintableFileName(result.pdfFileName));
    const printableDocumentTitle = descriptivePdfName.replace(/\.pdf$/i, '');

    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${this.escapeHtml(printableDocumentTitle)}</title>
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
            .clinical-hero,
            .clinical-section {
              border: 1px solid #dbe3ef;
              border-radius: 18px;
              background: #ffffff;
            }
            .clinical-hero {
              display: grid;
              gap: 16px;
              padding: 16px;
              background:
                radial-gradient(circle at top right, rgba(59, 130, 246, 0.12) 0%, transparent 38%),
                linear-gradient(180deg, rgba(241, 245, 249, 0.9) 0%, transparent 100%),
                #ffffff;
            }
            .clinical-hero__identity {
              display: grid;
              grid-template-columns: 72px minmax(0, 1fr);
              gap: 14px;
              align-items: center;
            }
            .clinical-hero__avatar {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 72px;
              height: 72px;
              border-radius: 20px;
              background: #dbeafe;
              color: #1d4ed8;
              font-size: 22px;
              font-weight: 800;
            }
            .clinical-hero__copy,
            .clinical-section__header,
            .clinical-kpi,
            .clinical-data-card,
            .clinical-list__item,
            .clinical-timeline__body {
              display: grid;
              gap: 6px;
            }
            .clinical-hero__copy h2,
            .clinical-section__header h3,
            .clinical-list__header strong,
            .clinical-timeline__row strong {
              margin: 0;
            }
            .clinical-hero__copy p,
            .clinical-section__header p,
            .clinical-kpi p,
            .clinical-data-card span,
            .clinical-list__item p,
            .clinical-timeline__body p,
            .clinical-footnote,
            .clinical-empty p {
              margin: 0;
              color: #475569;
              font-size: 12px;
            }
            .clinical-kpi__label {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              color: #1d4ed8;
            }
            .clinical-data-card span,
            .clinical-kpi__label {
              display: block;
              margin-bottom: 2px;
              line-height: 1.2;
            }
            .clinical-kpis,
            .clinical-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }
            .clinical-kpi,
            .clinical-data-card,
            .clinical-list__item,
            .clinical-empty {
              padding: 12px;
              border: 1px solid #dbe3ef;
              border-radius: 14px;
              background: #f8fafc;
            }
            .clinical-kpi strong,
            .clinical-data-card strong,
            .clinical-list__header strong,
            .clinical-timeline__row strong {
              display: block;
              color: #0f172a;
              font-size: 14px;
              font-weight: 600;
              line-height: 1.45;
              overflow-wrap: anywhere;
              word-break: break-word;
            }
            .clinical-kpi strong {
              font-size: 15px;
            }
            .clinical-section {
              display: grid;
              gap: 14px;
              padding: 16px;
            }
            .clinical-narrative {
              display: grid;
              gap: 10px;
              padding: 12px;
              border-radius: 14px;
              background: #f8fafc;
            }
            .clinical-narrative p {
              margin: 0;
              line-height: 1.7;
            }
            .clinical-timeline,
            .clinical-list {
              display: grid;
              gap: 12px;
            }
            .clinical-timeline__item {
              display: grid;
              grid-template-columns: 18px minmax(0, 1fr);
              gap: 12px;
            }
            .clinical-timeline__marker {
              width: 10px;
              height: 10px;
              margin-top: 6px;
              border-radius: 999px;
              background: #2563eb;
              box-shadow: 0 0 0 5px rgba(191, 219, 254, 0.9);
            }
            .clinical-timeline__row,
            .clinical-list__header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }
            .clinical-timeline__row span,
            .clinical-list__header span {
              color: #64748b;
              font-size: 12px;
              flex-shrink: 0;
              line-height: 1.35;
            }
            .clinical-list__item p,
            .clinical-timeline__body p {
              line-height: 1.55;
              overflow-wrap: anywhere;
              word-break: break-word;
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
              .agenda-item,
              .clinical-kpis,
              .clinical-grid,
              .clinical-hero__identity {
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
            ${
              result.previewMode === 'clinical' && result.clinicalContent
                ? this.buildClinicalPdfHtml(result.clinicalContent)
                : `
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
                `
            }
          </main>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = printableDocumentTitle;
    printWindow.name = printableDocumentTitle;
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
    const neutralizedValue = this.neutralizeCsvFormula(value);
    const normalizedValue = neutralizedValue.replace(/"/g, '""');
    return `"${normalizedValue}"`;
  }

  private neutralizeCsvFormula(value: string): string {
    if (value.startsWith("'")) {
      return value;
    }

    const firstEffectiveCharacter = value.match(/^[ \t\r\n]*([\s\S])/u)?.[1];
    const dangerousFormulaPrefixes = '=+-@＝＋－＠';

    return firstEffectiveCharacter && dangerousFormulaPrefixes.includes(firstEffectiveCharacter) ? `\t${value}` : value;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private sanitizePrintableFileName(value: string): string {
    const trimmed = value.trim() || 'Reporte';

    return trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private ensurePdfExtension(value: string): string {
    return value.toLowerCase().endsWith('.pdf') ? value : `${value}.pdf`;
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

  private buildClinicalPdfHtml(content: ClinicalSummaryContent | ClinicalRecordContent): string {
    if (content.kind === 'record') {
      return this.buildClinicalRecordPdfHtml(content);
    }

    return this.buildClinicalSummaryPdfHtml(content);
  }

  private buildClinicalSummaryPdfHtml(content: ClinicalSummaryContent): string {
    const renderEmpty = (title: string | undefined, message: string | undefined, fallbackTitle: string, fallbackMessage: string) => `
      <section class="clinical-empty">
        <strong>${this.escapeHtml(title || fallbackTitle)}</strong>
        <p>${this.escapeHtml(message || fallbackMessage)}</p>
      </section>
    `;

    return `
      <section class="clinical-hero">
        <div class="clinical-hero__identity">
          <div class="clinical-hero__avatar">${this.escapeHtml(content.patientInitials)}</div>
          <div class="clinical-hero__copy">
            <span class="eyebrow">Paciente</span>
            <h2>${this.escapeHtml(content.patientFullName)}</h2>
            <p>${this.escapeHtml(content.patientSection.subtitle)}</p>
          </div>
        </div>
        <div class="clinical-kpis">
          ${content.kpis
            .map(
              (metric) => `
                <article class="clinical-kpi">
                  <span class="clinical-kpi__label">${this.escapeHtml(metric.label)}</span>
                  <strong>${this.escapeHtml(metric.value)}</strong>
                  <p>${this.escapeHtml(metric.supportingText)}</p>
                </article>
              `
            )
            .join('')}
        </div>
      </section>

      ${this.buildClinicalGridSection(content.patientSection.title, content.patientSection.subtitle, content.patientDetails)}
      ${this.buildClinicalGridSection(content.generalInfoSection.title, content.generalInfoSection.subtitle, content.generalInfo)}

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.evolutionSection.title)}</h3>
          <p>${this.escapeHtml(content.evolutionSection.subtitle)}</p>
        </header>
        ${
          content.evolutionSummary.length
            ? `
              <div class="clinical-narrative">
                ${content.evolutionSummary.map((paragraph) => `<p>${this.escapeHtml(paragraph)}</p>`).join('')}
              </div>
            `
            : renderEmpty(
                content.evolutionSection.emptyTitle,
                content.evolutionSection.emptyMessage,
                'Sin narrativa clínica suficiente',
                'Todavía no hay suficiente información estructurada para redactar un resumen de evolución.'
              )
        }
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.timelineSection.title)}</h3>
          <p>${this.escapeHtml(content.timelineSection.subtitle)}</p>
        </header>
        ${
          content.timelineItems.length
            ? `
              <div class="clinical-timeline">
                ${content.timelineItems
                  .map(
                    (item) => `
                      <article class="clinical-timeline__item">
                        <div class="clinical-timeline__marker"></div>
                        <div class="clinical-timeline__body">
                          <div class="clinical-timeline__row">
                            <strong>${this.escapeHtml(item.title)}</strong>
                            <span>${this.escapeHtml(item.occurredAtLabel)}</span>
                          </div>
                          <p>${this.escapeHtml(item.description)}</p>
                        </div>
                      </article>
                    `
                  )
                  .join('')}
              </div>
            `
            : renderEmpty(
                content.timelineSection.emptyTitle,
                content.timelineSection.emptyMessage,
                'Sin eventos clínicos en el período',
                'Ajusta el rango de fechas para revisar actividad clínica visible en el workspace.'
              )
        }
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.notesSection.title)}</h3>
          <p>${this.escapeHtml(content.notesSection.subtitle)}</p>
        </header>
        ${
          content.notes.length
            ? `
              <div class="clinical-list">
                ${content.notes
                  .map(
                    (note) => `
                      <article class="clinical-list__item">
                        <div class="clinical-list__header">
                          <strong>${this.escapeHtml(note.title)}</strong>
                          <span>${this.escapeHtml(note.sessionDateLabel)}</span>
                        </div>
                        <p>${this.escapeHtml(note.excerpt)}</p>
                      </article>
                    `
                  )
                  .join('')}
              </div>
              ${
                content.hiddenNotesCount > 0
                  ? `<p class="clinical-footnote">Se omitieron visualmente ${content.hiddenNotesCount} notas adicionales para mantener una lectura ejecutiva.</p>`
                  : ''
              }
            `
            : renderEmpty(
                content.notesSection.emptyTitle,
                content.notesSection.emptyMessage,
                'Sin notas clínicas en el período',
                'No se encontraron notas de sesión dentro del rango seleccionado.'
              )
        }
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.documentsSection.title)}</h3>
          <p>${this.escapeHtml(content.documentsSection.subtitle)}</p>
        </header>
        ${
          content.documents.length
            ? `
              <div class="clinical-list">
                ${content.documents
                  .map(
                    (document) => `
                      <article class="clinical-list__item">
                        <div class="clinical-list__header">
                          <strong>${this.escapeHtml(document.fileName)}</strong>
                          <span>${this.escapeHtml(document.uploadedAtLabel)}</span>
                        </div>
                        <p>${this.escapeHtml(document.typeLabel)}</p>
                      </article>
                    `
                  )
                  .join('')}
              </div>
            `
            : renderEmpty(
                content.documentsSection.emptyTitle,
                content.documentsSection.emptyMessage,
                'Sin documentos relacionados en el período',
                'No hay documentos visibles en el rango actual.'
              )
        }
      </section>
    `;
  }

  private buildClinicalRecordPdfHtml(content: ClinicalRecordContent): string {
    const renderEmpty = (title: string | undefined, message: string | undefined, fallbackTitle: string, fallbackMessage: string) => `
      <section class="clinical-empty">
        <strong>${this.escapeHtml(title || fallbackTitle)}</strong>
        <p>${this.escapeHtml(message || fallbackMessage)}</p>
      </section>
    `;

    return `
      <section class="clinical-section">
        <header class="clinical-section__header">
          <span class="eyebrow">Documento clínico</span>
          <h3>${this.escapeHtml(content.documentTitle)}</h3>
          <p>Paciente: ${this.escapeHtml(content.patientFullName)} | Periodo: ${this.escapeHtml(content.periodLabel)} | Generado: ${this.escapeHtml(content.generatedAtLabel)}</p>
        </header>
      </section>

      <section class="clinical-hero">
        <div class="clinical-hero__identity">
          <div class="clinical-hero__avatar">${this.escapeHtml(content.patientInitials)}</div>
          <div class="clinical-hero__copy">
            <span class="eyebrow">Expediente Clinico</span>
            <h2>${this.escapeHtml(content.patientFullName)}</h2>
            <p>Documento estructurado e imprimible del expediente clínico visible en el sistema.</p>
          </div>
        </div>
      </section>

      ${this.buildClinicalGridSection(content.patientSection.title, content.patientSection.subtitle, content.patientDetails)}
      ${this.buildClinicalGridSection(content.recordSection.title, content.recordSection.subtitle, content.recordDetails)}

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.diagnosisSection.title)}</h3>
          <p>${this.escapeHtml(content.diagnosisSection.subtitle)}</p>
        </header>
        <div class="clinical-narrative">
          <p>${this.escapeHtml(content.diagnosis)}</p>
        </div>
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.treatmentPlanSection.title)}</h3>
          <p>${this.escapeHtml(content.treatmentPlanSection.subtitle)}</p>
        </header>
        <div class="clinical-narrative">
          <p>${this.escapeHtml(content.treatmentPlan)}</p>
        </div>
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.appointmentsSection.title)}</h3>
          <p>${this.escapeHtml(content.appointmentsSection.subtitle)}</p>
        </header>
        ${
          content.appointments.length
            ? `
              <div class="clinical-list">
                ${content.appointments
                  .map(
                    (appointment) => `
                      <article class="clinical-list__item">
                        <div class="clinical-list__header">
                          <strong>${this.escapeHtml(appointment.scheduledAtLabel)}</strong>
                          <span>${this.escapeHtml(appointment.statusLabel)}</span>
                        </div>
                        <p>Duración: ${this.escapeHtml(appointment.durationLabel)}</p>
                        <p>${this.escapeHtml(appointment.notes)}</p>
                      </article>
                    `
                  )
                  .join('')}
              </div>
            `
            : renderEmpty(
                content.appointmentsSection.emptyTitle,
                content.appointmentsSection.emptyMessage,
                'Sin citas en el período',
                'No se encontraron citas visibles para el rango seleccionado.'
              )
        }
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.notesSection.title)}</h3>
          <p>${this.escapeHtml(content.notesSection.subtitle)}</p>
        </header>
        ${
          content.notes.length
            ? `
              <div class="clinical-list">
                ${content.notes
                  .map(
                    (note) => `
                      <article class="clinical-list__item">
                        <div class="clinical-list__header">
                          <strong>${this.escapeHtml(note.title)}</strong>
                          <span>${this.escapeHtml(note.sessionDateLabel)}</span>
                        </div>
                        <p style="white-space: pre-wrap;">${this.escapeHtml(note.content)}</p>
                      </article>
                    `
                  )
                  .join('')}
              </div>
            `
            : renderEmpty(
                content.notesSection.emptyTitle,
                content.notesSection.emptyMessage,
                'Sin notas clínicas en el período',
                'No se encontraron notas clínicas dentro del rango seleccionado.'
              )
        }
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.documentsSection.title)}</h3>
          <p>${this.escapeHtml(content.documentsSection.subtitle)}</p>
        </header>
        ${
          content.documents.length
            ? `
              <div class="clinical-list">
                ${content.documents
                  .map(
                    (document) => `
                      <article class="clinical-list__item">
                        <div class="clinical-list__header">
                          <strong>${this.escapeHtml(document.fileName)}</strong>
                          <span>${this.escapeHtml(document.uploadedAtLabel)}</span>
                        </div>
                        <p>${this.escapeHtml(document.typeLabel)}</p>
                      </article>
                    `
                  )
                  .join('')}
              </div>
            `
            : renderEmpty(
                content.documentsSection.emptyTitle,
                content.documentsSection.emptyMessage,
                'Sin documentos en el período',
                'No se encontraron documentos relacionados dentro del rango seleccionado.'
              )
        }
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.timelineSection.title)}</h3>
          <p>${this.escapeHtml(content.timelineSection.subtitle)}</p>
        </header>
        ${
          content.timelineItems.length
            ? `
              <div class="clinical-timeline">
                ${content.timelineItems
                  .map(
                    (item) => `
                      <article class="clinical-timeline__item">
                        <div class="clinical-timeline__marker"></div>
                        <div class="clinical-timeline__body">
                          <div class="clinical-timeline__row">
                            <strong>${this.escapeHtml(item.title)}</strong>
                            <span>${this.escapeHtml(item.occurredAtLabel)}</span>
                          </div>
                          <p>${this.escapeHtml(item.description)}</p>
                        </div>
                      </article>
                    `
                  )
                  .join('')}
              </div>
            `
            : renderEmpty(
                content.timelineSection.emptyTitle,
                content.timelineSection.emptyMessage,
                'Sin eventos clínicos en el período',
                'No se identificaron eventos clínicos visibles para el rango seleccionado.'
              )
        }
      </section>

      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(content.referencesSection.title)}</h3>
          <p>${this.escapeHtml(content.referencesSection.subtitle)}</p>
        </header>
        ${
          content.references.length
            ? `
              <div class="clinical-grid">
                ${content.references
                  .map(
                    (reference) => `
                      <article class="clinical-data-card">
                        <span>${this.escapeHtml(reference.label)}</span>
                        <strong>${this.escapeHtml(reference.value)}</strong>
                      </article>
                    `
                  )
                  .join('')}
              </div>
            `
            : renderEmpty(
                content.referencesSection.emptyTitle,
                content.referencesSection.emptyMessage,
                'Sin referencias documentales',
                'No hay documentos disponibles para anexar como referencia en el período consultado.'
              )
        }
      </section>
    `;
  }

  private buildClinicalGridSection(
    title: string,
    subtitle: string,
    items: Array<{ label: string; value: string }>
  ): string {
    return `
      <section class="clinical-section">
        <header class="clinical-section__header">
          <h3>${this.escapeHtml(title)}</h3>
          <p>${this.escapeHtml(subtitle)}</p>
        </header>
        <div class="clinical-grid">
          ${items
            .map(
              (item) => `
                <article class="clinical-data-card">
                  <span>${this.escapeHtml(item.label)}</span>
                  <strong>${this.escapeHtml(item.value)}</strong>
                </article>
              `
            )
            .join('')}
        </div>
      </section>
    `;
  }
}
