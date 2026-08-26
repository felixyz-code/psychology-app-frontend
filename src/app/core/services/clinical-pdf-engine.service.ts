import { Injectable } from '@angular/core';
import {
  ClinicalDocumentType,
  ClinicalPdfExportPayload,
} from '../../features/case-files/models/clinical-pdf.models';

@Injectable({
  providedIn: 'root',
})
export class ClinicalPdfEngineService {
  generateHtml(
    payload: ClinicalPdfExportPayload,
    typeOverride?: ClinicalDocumentType,
    customIndications?: string,
  ): string {
    const docType = typeOverride ?? payload.documentType;

    switch (docType) {
      case 'THERAPEUTIC_PRESCRIPTION':
        return this.generatePrescriptionHtml(payload, customIndications);
      case 'INFORMED_CONSENT':
        return this.generateInformedConsentHtml(payload);
      case 'CASE_FILE_SUMMARY':
        return this.generateCaseFileSummaryHtml(payload);
      case 'NOM_004_EVOLUTION_NOTE':
      default:
        return this.generateEvolutionNoteHtml(payload);
    }
  }

  printDocument(htmlContent: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return false;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    };

    iframe.onload = triggerPrint;
    setTimeout(triggerPrint, 300);

    return true;
  }

  private generateEvolutionNoteHtml(payload: ClinicalPdfExportPayload): string {
    const primaryColor = payload.tenant.primaryColor || '#1976d2';
    const accentColor = payload.tenant.accentColor || '#0288d1';
    const note = payload.sessionNote;
    const sessionDateFormatted = note
      ? this.formatDateTime(note.sessionDate)
      : this.formatDateTime(payload.generatedAt);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nota de Evolución Clínica - NOM-004-SSA3-2012</title>
  <style>
    ${this.getBaseCss(primaryColor, accentColor)}
  </style>
</head>
<body>
  <div class="page-container document-page">
    ${this.renderHeader(payload, 'NOTA DE EVOLUCIÓN CLÍNICA (NOM-004-SSA3-2012)')}

    <section class="patient-card">
      <div class="grid-2">
        <div>
          <span class="label">PACIENTE:</span>
          <span class="value">${this.escape(payload.patient.fullName)}</span>
        </div>
        <div>
          <span class="label">NO. EXPEDIENTE:</span>
          <span class="value">${this.escape(payload.caseFile.id.substring(0, 8).toUpperCase())}</span>
        </div>
        <div>
          <span class="label">EDAD:</span>
          <span class="value">${payload.patient.age !== null && payload.patient.age !== undefined ? `${payload.patient.age} años` : 'No especificada'}</span>
        </div>
        <div>
          <span class="label">FECHA DE NACIMIENTO:</span>
          <span class="value">${this.formatDate(payload.patient.birthDate)}</span>
        </div>
        <div>
          <span class="label">FECHA Y HORA DE SESIÓN:</span>
          <span class="value">${sessionDateFormatted}</span>
        </div>
        <div>
          <span class="label">TELÉFONO / CONTACTO:</span>
          <span class="value">${this.escape(payload.patient.phoneNumber || payload.patient.email || 'No registrado')}</span>
        </div>
      </div>
    </section>

    <main class="clinical-body">
      <div class="section-title">1. MOTIVO Y DIAGNÓSTICO CLÍNICO</div>
      <div class="content-box">
        <p><strong>Diagnóstico Principal:</strong> ${this.escape(payload.caseFile.diagnosis || 'En proceso de evaluación diagnóstica.')}</p>
        ${note?.title ? `<p><strong>Título de la sesión:</strong> ${this.escape(note.title)}</p>` : ''}
      </div>

      <div class="section-title">2. RESUMEN DE EVOLUCIÓN Y ESTADO CLÍNICO</div>
      <div class="content-box clinical-text">
        ${note ? this.escape(note.content).replace(/\n/g, '<br>') : '<p>Sin contenido de nota registrado para esta fecha.</p>'}
      </div>

      <div class="section-title">3. PLAN DE INTERVENCIÓN Y TRATAMIENTO</div>
      <div class="content-box">
        <p>${this.escape(payload.caseFile.treatmentPlan || 'Continuar con el plan psicoterapéutico establecido en sesiones subsecuentes.')}</p>
      </div>
    </main>

    ${this.renderSignatureBlock(payload, 'Conforme a la Norma Oficial Mexicana NOM-004-SSA3-2012, del expediente clínico.')}
  </div>
</body>
</html>`;
  }

  private generatePrescriptionHtml(
    payload: ClinicalPdfExportPayload,
    customIndications?: string,
  ): string {
    const primaryColor = payload.tenant.primaryColor || '#1976d2';
    const accentColor = payload.tenant.accentColor || '#0288d1';
    const indicationsContent =
      customIndications?.trim() ||
      payload.caseFile.treatmentPlan ||
      '1. Continuar con ejercicios de respiración diafragmática 10 minutos al día.\n2. Registro de autorregistro de pensamientos automáticos inter-sesión.\n3. Acudir a su próxima sesión programada.';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Receta e Indicaciones Terapéuticas</title>
  <style>
    ${this.getBaseCss(primaryColor, accentColor)}
    .rx-symbol {
      font-size: 26pt;
      font-family: serif;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="page-container document-page">
    ${this.renderHeader(payload, 'RECETA E INDICACIONES TERAPÉUTICAS')}

    <section class="patient-card">
      <div class="grid-2">
        <div>
          <span class="label">PACIENTE:</span>
          <span class="value">${this.escape(payload.patient.fullName)}</span>
        </div>
        <div>
          <span class="label">FECHA DE EMISIÓN:</span>
          <span class="value">${this.formatDate(payload.generatedAt)}</span>
        </div>
        <div>
          <span class="label">EDAD:</span>
          <span class="value">${payload.patient.age !== null && payload.patient.age !== undefined ? `${payload.patient.age} años` : 'No especificada'}</span>
        </div>
        <div>
          <span class="label">EXPEDIENTE:</span>
          <span class="value">${this.escape(payload.caseFile.id.substring(0, 8).toUpperCase())}</span>
        </div>
      </div>
    </section>

    <main class="clinical-body">
      <div class="rx-symbol">℞ Indicaciones y Recomendaciones Clínicas</div>
      <div class="content-box" style="min-height: 220px; line-height: 1.8; font-size: 11pt;">
        ${this.escape(indicationsContent).replace(/\n/g, '<br>')}
      </div>

      ${
        payload.appointment
          ? `
        <div class="section-title">PRÓXIMA CITA PROGRAMADA</div>
        <div class="content-box">
          <p><strong>Fecha y hora:</strong> ${this.formatDateTime(payload.appointment.scheduledAt)} (${payload.appointment.durationMinutes} minutos)</p>
          ${payload.appointment.notes ? `<p><strong>Notas:</strong> ${this.escape(payload.appointment.notes)}</p>` : ''}
        </div>
      `
          : ''
      }
    </main>

    ${this.renderSignatureBlock(payload, 'Válido como prescripción terapéutica y constancia de atención.')}
  </div>
</body>
</html>`;
  }

  private generateInformedConsentHtml(payload: ClinicalPdfExportPayload): string {
    const primaryColor = payload.tenant.primaryColor || '#1976d2';
    const accentColor = payload.tenant.accentColor || '#0288d1';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Consentimiento Informado para Atención Psicológica</title>
  <style>
    ${this.getBaseCss(primaryColor, accentColor)}
    .consent-clause {
      margin-bottom: 12px;
      text-align: justify;
      line-height: 1.5;
      font-size: 9.5pt;
    }
    .dual-signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-column {
      text-align: center;
      border-top: 1px solid #333;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="page-container document-page">
    ${this.renderHeader(payload, 'CONSENTIMIENTO INFORMADO PARA SERVICIOS DE PSICOLOGÍA')}

    <section class="patient-card">
      <div class="grid-2">
        <div>
          <span class="label">PACIENTE:</span>
          <span class="value">${this.escape(payload.patient.fullName)}</span>
        </div>
        <div>
          <span class="label">NO. EXPEDIENTE:</span>
          <span class="value">${this.escape(payload.caseFile.id.substring(0, 8).toUpperCase())}</span>
        </div>
        <div>
          <span class="label">PROFESIONAL TRATANTE:</span>
          <span class="value">${this.escape(payload.therapist.professionalName)}</span>
        </div>
        <div>
          <span class="label">CÉDULA PROFESIONAL:</span>
          <span class="value">${this.escape(payload.therapist.licenseNumber || 'En trámite')}</span>
        </div>
      </div>
    </section>

    <main class="clinical-body">
      <div class="consent-clause">
        <strong>1. NATURALEZA Y OBJETIVOS DEL TRATAMIENTO:</strong> Por medio del presente documento, el/la paciente (o su tutor legal) manifiesta su voluntad informada de iniciar un proceso de evaluación y/o intervención psicológica conducido por el profesional de la salud antes mencionado, en las instalaciones o plataformas autorizadas por <em>${this.escape(payload.tenant.displayName)}</em>.
      </div>

      <div class="consent-clause">
        <strong>2. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS:</strong> Toda la información recabada durante las sesiones y consignada en el expediente clínico goza de estricto secreto profesional conforme a lo dispuesto en la <strong>NOM-004-SSA3-2012</strong>, del expediente clínico, y las leyes de protección de datos personales en posesión de particulares.
      </div>

      <div class="consent-clause">
        <strong>3. EXCEPCIONES AL SECRETO PROFESIONAL:</strong> La confidencialidad únicamente podrá ser dispensada ante: a) Situaciones de riesgo inminente y grave para la vida o integridad física del paciente o de terceras personas; b) Mandamiento judicial expreso emitido por autoridad competente; c) Detección de abuso o violencia hacia menores de edad o personas en estado de vulnerabilidad.
      </div>

      <div class="consent-clause">
        <strong>4. DERECHOS DEL PACIENTE:</strong> El paciente tiene derecho a conocer el plan de tratamiento, solicitar aclaraciones sobre las técnicas empleadas y revocar este consentimiento en cualquier momento de manera libre y voluntaria.
      </div>

      <div class="consent-clause">
        <strong>5. DECLARACIÓN DE CONFORMIDAD:</strong> Habiendo leído, comprendido y resuelto todas las dudas referentes al proceso psicoterapéutico, acepto participar de manera voluntaria en la atención clínica.
      </div>

      <div class="dual-signatures">
        <div class="sig-column">
          <div style="height: 60px;"></div>
          <strong>FIRMA DEL PACIENTE / TUTOR</strong><br>
          <span>${this.escape(payload.patient.fullName)}</span><br>
          <small>Fecha: ${this.formatDate(payload.generatedAt)}</small>
        </div>
        <div class="sig-column">
          <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center;">
            ${
              payload.therapist.signatureDataUri
                ? `<img src="${payload.therapist.signatureDataUri}" alt="Firma" class="signature-image sig-img" style="max-width: 180px; max-height: 55px; object-fit: contain;">`
                : ''
            }
          </div>
          <strong>FIRMA DEL PROFESIONAL</strong><br>
          <span>${this.escape(payload.therapist.professionalName)}</span><br>
          <small>Céd. Prof. ${this.escape(payload.therapist.licenseNumber || 'Registrada')}</small>
        </div>
      </div>
    </main>

    <footer class="doc-footer" style="margin-top: 25px;">
      <span>Documento médico-legal expedido en ${this.formatDate(payload.generatedAt)} por ${this.escape(payload.tenant.displayName)}.</span>
    </footer>
  </div>
</body>
</html>`;
  }

  private generateCaseFileSummaryHtml(payload: ClinicalPdfExportPayload): string {
    const primaryColor = payload.tenant.primaryColor || '#1976d2';
    const accentColor = payload.tenant.accentColor || '#0288d1';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen de Expediente Clínico</title>
  <style>
    ${this.getBaseCss(primaryColor, accentColor)}
  </style>
</head>
<body>
  <div class="page-container document-page">
    ${this.renderHeader(payload, 'RESUMEN GENERAL DE EXPEDIENTE CLÍNICO')}

    <section class="patient-card">
      <div class="grid-2">
        <div>
          <span class="label">PACIENTE:</span>
          <span class="value">${this.escape(payload.patient.fullName)}</span>
        </div>
        <div>
          <span class="label">EXPEDIENTE ID:</span>
          <span class="value">${this.escape(payload.caseFile.id)}</span>
        </div>
        <div>
          <span class="label">FECHA DE APERTURA:</span>
          <span class="value">${this.formatDate(payload.caseFile.createdAt)}</span>
        </div>
        <div>
          <span class="label">ÚLTIMA ACTUALIZACIÓN:</span>
          <span class="value">${this.formatDate(payload.caseFile.updatedAt)}</span>
        </div>
      </div>
    </section>

    <main class="clinical-body">
      <div class="section-title">DIAGNÓSTICO REGISTRADO</div>
      <div class="content-box">
        <p>${this.escape(payload.caseFile.diagnosis || 'Sin diagnóstico registrado.')}</p>
      </div>

      <div class="section-title">PLAN DE TRATAMIENTO INTEGRAL</div>
      <div class="content-box">
        <p>${this.escape(payload.caseFile.treatmentPlan || 'Sin plan de tratamiento registrado.')}</p>
      </div>
    </main>

    ${this.renderSignatureBlock(payload, 'Resumen para fines informativos y de seguimiento clínico.')}
  </div>
</body>
</html>`;
  }

  private renderHeader(payload: ClinicalPdfExportPayload, subtitle: string): string {
    const logoHtml = payload.tenant.logoDataUri
      ? `<img src="${payload.tenant.logoDataUri}" alt="Logo" class="header-logo clinic-logo" style="max-width: 100px; max-height: 70px; object-fit: contain;">`
      : `<div class="clinic-logo-placeholder">${this.escape(payload.tenant.displayName.substring(0, 2).toUpperCase())}</div>`;

    const folioNumber = `EXP-${payload.caseFile.id.substring(0, 8).toUpperCase()}-${this.formatDateCompact(payload.generatedAt)}`;

    return `
    <header class="doc-header">
      <div class="clinic-info">
        ${logoHtml}
        <div>
          <h1 class="clinic-name">${this.escape(payload.tenant.displayName)}</h1>
          <div class="clinic-meta">
            ${payload.tenant.legalName ? `<span>${this.escape(payload.tenant.legalName)}</span> • ` : ''}
            ${payload.tenant.taxId ? `<span>RFC: ${this.escape(payload.tenant.taxId)}</span> • ` : ''}
            ${payload.tenant.phone ? `<span>Tel: ${this.escape(payload.tenant.phone)}</span>` : ''}
          </div>
          ${payload.tenant.address ? `<div class="clinic-address">${this.escape(payload.tenant.address)}</div>` : ''}
        </div>
      </div>
      <div class="doc-badge-group">
        <div class="doc-badge">${this.escape(subtitle)}</div>
        <div class="doc-folio">FOLIO: <strong>${folioNumber}</strong></div>
      </div>
    </header>
    `;
  }

  private renderSignatureBlock(payload: ClinicalPdfExportPayload, disclaimer: string): string {
    const signatureImg = payload.therapist.signatureDataUri
      ? `<img src="${payload.therapist.signatureDataUri}" alt="Firma digitalizada" class="signature-image sig-img" style="max-width: 180px; max-height: 60px; object-fit: contain;">`
      : `<div style="height: 45px;"></div>`;

    const folioNumber = `EXP-${payload.caseFile.id.substring(0, 8).toUpperCase()}-${this.formatDateCompact(payload.generatedAt)}`;

    return `
    <footer class="signature-section">
      <div class="sig-container">
        ${signatureImg}
        <div class="sig-line"></div>
        <strong class="therapist-name">${this.escape(payload.therapist.professionalName)}</strong>
        <div class="therapist-license">
          ${payload.therapist.licenseNumber ? `Cédula Profesional: ${this.escape(payload.therapist.licenseNumber)}` : 'Cédula Profesional Registrada'}
        </div>
        <div class="therapist-specialties">
          ${payload.therapist.specialties.length > 0 ? this.escape(payload.therapist.specialties.join(' • ')) : 'Especialista en Psicología'}
        </div>
      </div>
      <div class="doc-footer">
        <p class="doc-disclaimer">${this.escape(disclaimer)}</p>
        <p class="doc-pagination">Folio: ${folioNumber} · Página 1 de 1 · Expediente Clínico Electrónico Certificado PsiqueOS (NOM-004/NOM-024)</p>
      </div>
    </footer>
    `;
  }

  private getBaseCss(primaryColor: string, accentColor: string): string {
    return `
      * {
        box-sizing: border-box;
      }
      @page {
        size: letter;
        margin: 15mm;
      }
      html, body {
        margin: 0;
        padding: 0;
        background-color: #525659;
        display: flex;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1a1a1a;
        font-size: 10pt;
        line-height: 1.4;
      }
      .document-page, .page-container {
        background: #ffffff;
        width: 210mm;
        min-height: 297mm;
        margin: 20px auto;
        padding: 20mm;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        box-sizing: border-box;
      }
      img {
        display: block;
      }
      .header-logo, .clinic-logo, img[alt*="logo" i], img[alt*="Logo" i] {
        max-width: 100px !important;
        max-height: 70px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
      }
      .signature-image, .sig-img, img[alt*="firma" i], img[alt*="Firma" i] {
        max-width: 180px !important;
        max-height: 60px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
      }
      @media print {
        html, body {
          background-color: transparent !important;
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }
        .document-page, .page-container {
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          min-height: auto !important;
        }
      }
      .doc-header {
        border-bottom: 2px solid ${primaryColor};
        padding-bottom: 12px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .clinic-info {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .clinic-logo-placeholder {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        background-color: ${primaryColor};
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16pt;
      }
      .clinic-name {
        font-size: 15pt;
        font-weight: 700;
        color: #111827;
      }
      .clinic-meta, .clinic-address {
        font-size: 8.5pt;
        color: #4b5563;
        margin-top: 2px;
      }
      .doc-badge-group {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      .doc-badge {
        font-size: 9pt;
        font-weight: 600;
        color: ${primaryColor};
        text-align: right;
        max-width: 250px;
      }
      .doc-folio {
        font-size: 8pt;
        font-weight: 600;
        color: #64748b;
        background-color: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 2px 6px;
        text-align: right;
        display: inline-block;

        strong {
          color: #0f172a;
        }
      }
      .patient-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 16px;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 16px;
      }
      .label {
        font-weight: 600;
        font-size: 8.5pt;
        color: #64748b;
        display: inline-block;
        margin-right: 4px;
      }
      .value {
        font-weight: 500;
        color: #0f172a;
      }
      .section-title {
        font-size: 9.5pt;
        font-weight: 700;
        color: ${primaryColor};
        margin-top: 14px;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .content-box {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 10px 12px;
        margin-bottom: 12px;
      }
      .clinical-text {
        min-height: 140px;
        line-height: 1.6;
        text-align: justify;
      }
      .signature-section {
        margin-top: 28px;
        page-break-inside: avoid;
        text-align: center;
      }
      .sig-container {
        display: inline-block;
        min-width: 260px;
        text-align: center;
      }
      .sig-line {
        border-top: 1px solid #334155;
        margin: 6px 0;
      }
      .therapist-name {
        font-size: 10.5pt;
        color: #0f172a;
      }
      .therapist-license {
        font-size: 8.5pt;
        color: #475569;
      }
      .therapist-specialties {
        font-size: 8pt;
        color: #64748b;
        margin-top: 2px;
      }
      .doc-footer {
        font-size: 7.5pt;
        color: #94a3b8;
        margin-top: 16px;
        border-top: 1px solid #f1f5f9;
        padding-top: 6px;
        text-align: center;

        .doc-disclaimer {
          margin: 0 0 3px 0;
          color: #64748b;
          font-weight: 500;
        }

        .doc-pagination {
          margin: 0;
          font-size: 7pt;
          color: #94a3b8;
        }
      }
    `;
  }

  private escape(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'No especificada';
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  }

  private formatDateCompact(dateStr: string | null | undefined): string {
    if (!dateStr) return '00000000';
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return '00000000';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    } catch {
      return '00000000';
    }
  }

  private formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return 'No especificada';
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return dateStr;
    }
  }
}
