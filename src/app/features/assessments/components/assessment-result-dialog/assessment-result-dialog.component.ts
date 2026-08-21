import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import {
  StatusBadgeComponent,
  StatusBadgeVariant,
} from '../../../../shared/components/status-badge/status-badge.component';
import { AssessmentAdministration } from '../../../../core/models/assessment.models';

export interface AssessmentResultDialogData {
  administration: AssessmentAdministration;
}

@Component({
  selector: 'app-assessment-result-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTableModule,
    StatusBadgeComponent,
  ],
  templateUrl: './assessment-result-dialog.component.html',
  styleUrl: './assessment-result-dialog.component.scss',
})
export class AssessmentResultDialogComponent {
  readonly data = inject<AssessmentResultDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AssessmentResultDialogComponent>);

  readonly administration = this.data.administration;
  readonly result = this.administration.result;

  getSeverityVariant(severity?: string | null): StatusBadgeVariant {
    const s = (severity || '').toUpperCase();
    if (s.includes('CRITICAL') || s.includes('SEVERE')) return 'danger';
    if (s.includes('MODERATE')) return 'warning';
    if (s.includes('MILD') || s.includes('MINIMAL')) return 'primary';
    return 'neutral';
  }

  getFlags(): any[] {
    if (!this.result?.flagsJson) return [];
    if (Array.isArray(this.result.flagsJson)) return this.result.flagsJson;
    return [];
  }

  getSubscales(): Array<{
    scaleCode: string;
    scaleName: string;
    rawScore: number;
    normalizedScore?: number | null;
    strataTitle?: string | null;
    severity?: string | null;
  }> {
    if (!this.result?.subscaleScoresJson) return [];
    return Object.values(this.result.subscaleScoresJson).map((val: any) => ({
      scaleCode: val.scaleCode || val.code || '',
      scaleName: val.scaleName || val.name || val.scaleCode || '',
      rawScore: typeof val.rawScore === 'number' ? val.rawScore : Number(val.rawScore || val.score) || 0,
      normalizedScore: val.normalizedScore,
      strataTitle: val.strataTitle,
      severity: val.severity,
    }));
  }

  close(): void {
    this.dialogRef.close();
  }

  print(): void {
    window.print();
  }
}
