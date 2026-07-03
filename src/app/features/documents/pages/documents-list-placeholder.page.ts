import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DocumentsListComponent } from '../components/documents-list.component';

@Component({
  selector: 'app-documents-list-placeholder-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, PageHeaderComponent, DocumentsListComponent],
  templateUrl: './documents-list-placeholder.page.html',
  styleUrl: './documents-list-placeholder.page.scss',
})
export class DocumentsListPlaceholderPage {}
