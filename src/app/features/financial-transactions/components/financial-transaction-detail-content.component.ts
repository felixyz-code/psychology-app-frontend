import { Component, inject, input } from '@angular/core';

import { AuthStore } from '../../../core/auth/auth.store';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import {
  FinancialTransactionCategory,
  FinancialTransactionResponse,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../models/financial-transaction.models';
import {
  formatFinancialAmount,
  formatFinancialDateTime,
  getFinancialTransactionCategoryLabel,
  getFinancialTransactionStatusLabel,
  getFinancialTransactionStatusVariant,
  getFinancialTransactionTypeLabel,
  getFinancialTransactionTypeVariant,
  getPaymentMethodLabel,
} from '../utils/financial-transaction-presenters';

@Component({
  selector: 'app-financial-transaction-detail-content',
  standalone: true,
  imports: [SectionCardComponent, StatusBadgeComponent],
  templateUrl: './financial-transaction-detail-content.component.html',
  styleUrl: './financial-transaction-detail-content.component.scss',
})
export class FinancialTransactionDetailContentComponent {
  private readonly authStore = inject(AuthStore);

  readonly transaction = input.required<FinancialTransactionResponse>();

  getTypeLabel(type: FinancialTransactionType): string {
    return getFinancialTransactionTypeLabel(type);
  }

  getTypeVariant(type: FinancialTransactionType): StatusBadgeVariant {
    return getFinancialTransactionTypeVariant(type);
  }

  getStatusLabel(status: FinancialTransactionStatus): string {
    return getFinancialTransactionStatusLabel(status);
  }

  getStatusVariant(status: FinancialTransactionStatus): StatusBadgeVariant {
    return getFinancialTransactionStatusVariant(status);
  }

  getCategoryLabel(category: FinancialTransactionCategory): string {
    return getFinancialTransactionCategoryLabel(category);
  }

  getPaymentMethodLabel(paymentMethod: PaymentMethod): string {
    return getPaymentMethodLabel(paymentMethod);
  }

  formatAmount(amount: string, currency: string): string {
    return formatFinancialAmount(amount, currency);
  }

  formatDateTime(value: string): string {
    return formatFinancialDateTime(value);
  }

  getCreatedByLabel(createdById: string): string {
    const currentUser = this.authStore.user();

    if (currentUser && currentUser.id === createdById) {
      return currentUser.name;
    }

    return createdById ? 'Usuario del sistema' : 'Registrado en el sistema';
  }

  getPatientRelationLabel(patientId: string | null): string {
    return patientId ? 'Paciente asociado' : 'No disponible';
  }

  getAppointmentRelationLabel(appointmentId: string | null): string {
    return appointmentId ? 'Cita asociada' : 'No disponible';
  }
}
