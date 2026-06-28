import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';

@Component({
  selector: 'app-financial-transaction-form-placeholder-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, PageHeaderComponent, SectionCardComponent],
  templateUrl: './financial-transaction-form-placeholder.page.html',
  styleUrl: './financial-transaction-form-placeholder.page.scss',
})
export class FinancialTransactionFormPlaceholderPage {}
