import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-data-table-toolbar',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './data-table-toolbar.component.html',
  styleUrl: './data-table-toolbar.component.scss',
})
export class DataTableToolbarComponent {
  readonly searchTerm = input('');
  readonly searchPlaceholder = input('Buscar');
  readonly resultsLabel = input('');
  readonly hasActiveFilters = input(false);
  readonly showClearButton = input(true);

  readonly searchTermChange = output<string>();
  readonly clearFilters = output<void>();

  handleSearchInput(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchTermChange.emit(target.value);
  }
}
