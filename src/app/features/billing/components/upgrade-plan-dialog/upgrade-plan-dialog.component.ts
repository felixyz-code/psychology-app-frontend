import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { QuotaExceededDetails } from '../../../../core/billing/billing.models';

export interface UpgradePlanDialogData {
  details: QuotaExceededDetails;
}

@Component({
  selector: 'app-upgrade-plan-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './upgrade-plan-dialog.component.html',
  styleUrl: './upgrade-plan-dialog.component.scss',
})
export class UpgradePlanDialogComponent {
  readonly data = inject<UpgradePlanDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<UpgradePlanDialogComponent>);
  private readonly router = inject(Router);

  getResourceLabel(resource: string): string {
    switch (resource?.toUpperCase()) {
      case 'THERAPISTS':
        return 'Terapeutas Profesionales';
      case 'BRANCHES':
        return 'Sedes / Sucursales Clínicas';
      case 'NOTIFICATIONS':
        return 'Notificaciones y Recordatorios Mensuales';
      case 'PATIENTS':
        return 'Pacientes Registrados';
      default:
        return resource || 'Capacidad Operativa';
    }
  }

  getResourceIcon(resource: string): string {
    switch (resource?.toUpperCase()) {
      case 'THERAPISTS':
        return 'groups';
      case 'BRANCHES':
        return 'apartment';
      case 'NOTIFICATIONS':
        return 'notifications_active';
      case 'PATIENTS':
        return 'person';
      default:
        return 'lock';
    }
  }

  goToBilling(): void {
    this.dialogRef.close('navigate_to_billing');
    void this.router.navigate(['/billing']);
  }

  close(): void {
    this.dialogRef.close();
  }
}
