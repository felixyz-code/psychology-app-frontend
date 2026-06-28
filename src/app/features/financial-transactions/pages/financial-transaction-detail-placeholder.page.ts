import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';

@Component({
  selector: 'app-financial-transaction-detail-placeholder-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, PageHeaderComponent, SectionCardComponent],
  templateUrl: './financial-transaction-detail-placeholder.page.html',
  styleUrl: './financial-transaction-detail-placeholder.page.scss',
})
export class FinancialTransactionDetailPlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  readonly transactionId = this.route.snapshot.paramMap.get('id') ?? '';
}
