import { Component, input } from '@angular/core';

import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';

@Component({
  selector: 'app-report-filters-panel',
  standalone: true,
  imports: [SectionCardComponent],
  templateUrl: './report-filters-panel.component.html',
  styleUrl: './report-filters-panel.component.scss',
})
export class ReportFiltersPanelComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
