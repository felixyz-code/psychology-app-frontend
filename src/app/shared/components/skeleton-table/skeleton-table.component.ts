import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  templateUrl: './skeleton-table.component.html',
  styleUrl: './skeleton-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonTableComponent {
  readonly rows = input<number>(5);
  readonly columns = input<number>(5);
  readonly hasToolbar = input<boolean>(true);
  readonly hasPagination = input<boolean>(true);
  readonly hasActionsColumn = input<boolean>(true);
  readonly columnWidths = input<string[]>([]);
  readonly customClass = input<string>('');

  getRowsArray(): number[] {
    const count = Math.max(1, this.rows());
    return Array.from({ length: count }, (_, i) => i);
  }

  getColumnsArray(): number[] {
    const count = Math.max(1, this.columns());
    return Array.from({ length: count }, (_, i) => i);
  }

  getColumnWidth(colIndex: number): string | null {
    const widths = this.columnWidths();
    if (widths && widths.length > colIndex) {
      return widths[colIndex];
    }
    return null;
  }

  getCellWidth(rowIndex: number, colIndex: number): string {
    const pattern = ['70%', '85%', '60%', '90%', '75%'];
    const idx = (rowIndex * 3 + colIndex) % pattern.length;
    return pattern[idx];
  }
}
