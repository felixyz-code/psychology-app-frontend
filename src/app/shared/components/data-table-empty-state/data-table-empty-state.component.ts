import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-data-table-empty-state',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './data-table-empty-state.component.html',
  styleUrl: './data-table-empty-state.component.scss',
})
export class DataTableEmptyStateComponent {
  readonly icon = input<string | null>(null);
  readonly title = input.required<string>();
  readonly message = input('');
}

