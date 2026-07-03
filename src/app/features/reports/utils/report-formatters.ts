export function getReportMimeTypeLabel(mimeType?: string | null): string {
  const normalized = mimeType?.trim().toLowerCase() ?? '';

  if (normalized === 'application/pdf') {
    return 'PDF';
  }

  if (normalized === 'image/png') {
    return 'Imagen PNG';
  }

  if (normalized === 'image/jpeg' || normalized === 'image/jpg') {
    return 'Imagen JPG';
  }

  if (normalized === 'image/webp') {
    return 'Imagen WEBP';
  }

  if (normalized.startsWith('image/')) {
    return `Imagen ${normalized.slice('image/'.length).toUpperCase()}`;
  }

  if (normalized.startsWith('text/')) {
    return `Texto ${normalized.slice('text/'.length).toUpperCase()}`;
  }

  if (normalized === 'application/msword') {
    return 'Documento Word';
  }

  if (normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'Documento Word (DOCX)';
  }

  if (normalized === 'application/vnd.ms-excel') {
    return 'Hoja de cálculo Excel';
  }

  if (normalized === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return 'Hoja de cálculo Excel (XLSX)';
  }

  return mimeType?.trim() || 'No disponible';
}
