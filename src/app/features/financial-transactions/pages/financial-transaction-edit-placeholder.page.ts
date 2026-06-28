import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';

@Component({
  selector: 'app-financial-transaction-edit-placeholder-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, PageHeaderComponent, SectionCardComponent],
  templateUrl: './financial-transaction-edit-placeholder.page.html',
  styleUrl: './financial-transaction-edit-placeholder.page.scss',
})
export class FinancialTransactionEditPlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  readonly transactionId = this.route.snapshot.paramMap.get('id') ?? '';
}
