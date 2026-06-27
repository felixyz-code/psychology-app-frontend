import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface PageHeaderBreadcrumb {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>('');
  readonly breadcrumbs = input<PageHeaderBreadcrumb[]>([]);
}
