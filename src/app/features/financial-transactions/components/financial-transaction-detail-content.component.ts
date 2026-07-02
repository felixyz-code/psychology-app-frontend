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
    const labels: Record<FinancialTransactionType, string> = {
      INCOME: 'Ingreso',
      EXPENSE: 'Egreso',
      ADJUSTMENT: 'Ajuste',
      REFUND: 'Reembolso',
    };

    return labels[type];
  }

  getTypeVariant(type: FinancialTransactionType): StatusBadgeVariant {
    const variants: Record<FinancialTransactionType, StatusBadgeVariant> = {
      INCOME: 'success',
      EXPENSE: 'danger',
      ADJUSTMENT: 'warning',
      REFUND: 'primary',
    };

    return variants[type];
  }

  getStatusLabel(status: FinancialTransactionStatus): string {
    const labels: Record<FinancialTransactionStatus, string> = {
      PENDING: 'Pendiente',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };

    return labels[status];
  }

  getStatusVariant(status: FinancialTransactionStatus): StatusBadgeVariant {
    const variants: Record<FinancialTransactionStatus, StatusBadgeVariant> = {
      PENDING: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };

    return variants[status];
  }

  getCategoryLabel(category: FinancialTransactionCategory): string {
    const labels: Record<FinancialTransactionCategory, string> = {
      SESSION: 'Sesion',
      ASSESSMENT: 'Evaluacion',
      MANUAL: 'Manual',
      RENT: 'Renta',
      UTILITIES: 'Servicios',
      SUPPLIES: 'Insumos',
      SOFTWARE: 'Software',
      SALARY: 'Salario',
      OTHER: 'Otro',
    };

    return labels[category];
  }

  getPaymentMethodLabel(paymentMethod: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      TRANSFER: 'Transferencia',
      CHECK: 'Cheque',
      OTHER: 'Otro',
    };

    return labels[paymentMethod];
  }

  formatAmount(amount: string, currency: string): string {
    const parsedAmount = Number(amount);

    if (Number.isNaN(parsedAmount)) {
      return `${amount} ${currency}`.trim();
    }

    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsedAmount);
  }

  formatDateTime(value: string): string {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }

    return parsedDate.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
