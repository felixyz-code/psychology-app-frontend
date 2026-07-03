import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { ReportDefinition } from '../models/report-definition.model';

@Component({
  selector: 'app-report-catalog-card',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './report-catalog-card.component.html',
  styleUrl: './report-catalog-card.component.scss',
})
export class ReportCatalogCardComponent {
  readonly definition = input.required<ReportDefinition>();
}
