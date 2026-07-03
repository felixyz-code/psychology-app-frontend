import { Component, inject } from '@angular/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReportCatalogCardComponent } from '../components/report-catalog-card.component';
import { ReportsCatalogService } from '../services/reports-catalog.service';

@Component({
  selector: 'app-reports-home-page',
  standalone: true,
  imports: [PageHeaderComponent, ReportCatalogCardComponent],
  templateUrl: './reports-home.page.html',
  styleUrl: './reports-home.page.scss',
})
export class ReportsHomePage {
  private readonly reportsCatalogService = inject(ReportsCatalogService);

  readonly reports = this.reportsCatalogService.getReports();
}
