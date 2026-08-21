import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-section-card',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './section-card.component.html',
  styleUrl: './section-card.component.scss',
  host: {
    '[attr.title]': 'null',
  },
})
export class SectionCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
