import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { ReportExportFormat } from '../models/report-definition.model';

@Component({
  selector: 'app-report-export-menu',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './report-export-menu.component.html',
  styleUrl: './report-export-menu.component.scss',
})
export class ReportExportMenuComponent {
  readonly formats = input<ReportExportFormat[]>([]);
  readonly disabled = input(false);
  readonly reportTitle = input('Reporte');
  readonly rowCount = input(0);

  readonly exportSelected = output<ReportExportFormat>();

  getLabel(format: ReportExportFormat): string {
    return format === 'pdf' ? 'PDF' : 'CSV';
  }

  getIcon(format: ReportExportFormat): string {
    return format === 'pdf' ? 'picture_as_pdf' : 'table_view';
  }

  getAriaLabel(): string {
    const rowCount = this.rowCount();
    const rowsLabel = rowCount === 1 ? '1 registro' : `${rowCount} registros`;

    return `Exportar ${this.reportTitle()} con ${rowsLabel}`;
  }
}
