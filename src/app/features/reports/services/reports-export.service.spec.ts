import { ReportResult } from '../models/report-result.model';
import { ReportsExportService } from './reports-export.service';

const UTF8_BOM = '\uFEFF';

describe('ReportsExportService', () => {
  let service: ReportsExportService;
  let csvContent: string;
  let csvBlob: Blob | null;

  beforeEach(() => {
    service = new ReportsExportService();
    csvContent = '';
    csvBlob = null;

    const NativeBlob = globalThis.Blob;

    vi.stubGlobal(
      'Blob',
      class extends NativeBlob {
        constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          csvContent = (parts ?? []).map((part) => String(part)).join('');
          csvBlob = this;
        }
      }
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:reports-csv'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['=1+1', '+1+1', '-1+1', '@SUM(1,1)', '＝1+1', '＋1+1', '－1+1', '＠SUM(1,1)'])(
    'prefixes dangerous formula text with a tab: %s',
    (value) => {
      exportCsv(service, [value]);

      expect(csvContent).toBe(`${UTF8_BOM}"Valor"\r\n"\t${value}"`);
    }
  );

  it.each(['    =1+1', '\t=1+1', '\r=1+1', '\n=1+1', ' \t@SUM(1,1)'])(
    'detects dangerous prefixes after leading whitespace or controls: %j',
    (value) => {
      exportCsv(service, [value]);

      expect(csvContent).toBe(`${UTF8_BOM}"Valor"\r\n"\t${value}"`);
    }
  );

  it('preserves safe text and CSV escaping without adding protection', () => {
    exportCsv(service, ['Hola', 'Álvarez', 'Texto, con coma', 'Texto "citado"', 'Línea uno\nLínea dos', '', "'=1+1", 'Paciente = revisión']);

    expect(csvContent).toBe(
      `${UTF8_BOM}"Valor"\r\n"Hola"\r\n"Álvarez"\r\n"Texto, con coma"\r\n"Texto ""citado"""\r\n"Línea uno\nLínea dos"\r\n""\r\n"'=1+1"\r\n"Paciente = revisión"`
    );
  });

  it('serializes null, undefined, and empty values as empty cells', () => {
    service.exportAsCsv(createResult([{ value: undefined }, { value: null }, { value: '' }]));

    expect(csvContent).toBe(`${UTF8_BOM}"Valor"\r\n""\r\n""\r\n""`);
  });

  it('keeps the structural CSV layout while protecting only dangerous cells', () => {
    const result = createResult([
      { concept: '=1+1', patient: '+Paciente', notes: 'Nota "clínica",\nmultilínea', amount: '1,234.50' },
      { concept: 'Consulta', patient: 'Álvarez', notes: 'Paciente = revisión', amount: '-1,234.50' },
    ]);

    service.exportAsCsv(result);

    expect(csvContent).toBe(
      `${UTF8_BOM}"Concept","Patient","Notes","Amount"\r\n"\t=1+1","\t+Paciente","Nota ""clínica"",\nmultilínea","1,234.50"\r\n"Consulta","Álvarez","Paciente = revisión","\t-1,234.50"`
    );
  });

  it('writes a UTF-8 BOM before the logical CSV content', async () => {
    exportCsv(service, ['Categoría', 'Método', 'seguimiento clínico', 'sesión']);

    const bytes = new Uint8Array(await csvBlob!.arrayBuffer());

    expect(csvBlob!.type).toBe('text/csv;charset=utf-8;');
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(csvContent.slice(UTF8_BOM.length)).toBe(
      '"Valor"\r\n"Categoría"\r\n"Método"\r\n"seguimiento clínico"\r\n"sesión"'
    );
  });
});

function exportCsv(service: ReportsExportService, values: string[]): void {
  service.exportAsCsv(createResult(values.map((value) => ({ value }))));
}

function createResult(rows: Array<Record<string, string | null | undefined>>): ReportResult<unknown> {
  const keys = Object.keys(rows[0] ?? { value: '' });

  return {
    reportKey: 'financial',
    title: 'Reporte de prueba',
    generatedAt: '2026-07-09T00:00:00.000Z',
    pdfFileName: 'reporte-prueba.pdf',
    appliedFilters: {},
    contextItems: [],
    metrics: [],
    columns: keys.map((key) => ({ key, label: key === 'value' ? 'Valor' : key.charAt(0).toUpperCase() + key.slice(1) })),
    rows: rows.map((values, index) => ({ id: String(index), values: values as Record<string, string> })),
    previewMode: 'table',
    groups: [],
    csvFileName: 'reporte-prueba.csv',
    supportedExports: ['csv'],
    emptyTitle: '',
    emptyMessage: '',
  };
}
