import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import {
  CreateFinancialTransactionDto,
  FinancialTransactionCategory,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';

@Component({
  selector: 'app-financial-transaction-form-placeholder-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PageHeaderComponent,
    SectionCardComponent,
  ],
  templateUrl: './financial-transaction-form-placeholder.page.html',
  styleUrl: './financial-transaction-form-placeholder.page.scss',
})
export class FinancialTransactionFormPlaceholderPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly router = inject(Router);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly transactionTypes: FinancialTransactionType[] = ['INCOME', 'EXPENSE', 'ADJUSTMENT', 'REFUND'];
  readonly transactionStatuses: FinancialTransactionStatus[] = ['PENDING', 'COMPLETED', 'CANCELLED'];
  readonly transactionCategories: FinancialTransactionCategory[] = [
    'SESSION',
    'ASSESSMENT',
    'MANUAL',
    'RENT',
    'UTILITIES',
    'SUPPLIES',
    'SOFTWARE',
    'SALARY',
    'OTHER',
  ];
  readonly paymentMethods: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER'];

  readonly transactionForm = this.formBuilder.group({
    type: ['INCOME' as FinancialTransactionType, [Validators.required]],
    status: ['PENDING' as FinancialTransactionStatus],
    category: ['' as FinancialTransactionCategory | ''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['MXN', [Validators.maxLength(10)]],
    concept: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    occurredAt: [this.getCurrentDateTimeLocalValue(), [Validators.required]],
    dueDate: [''],
    paymentMethod: ['' as PaymentMethod | ''],
    patientId: ['', [Validators.maxLength(64)]],
    appointmentId: ['', [Validators.maxLength(64)]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const rawValue = this.transactionForm.getRawValue();
    const payload: CreateFinancialTransactionDto = {
      type: rawValue.type,
      status: rawValue.status,
      amount: rawValue.amount,
      currency: this.normalizeOptionalText(rawValue.currency) ?? undefined,
      concept: rawValue.concept.trim(),
      occurredAt: this.toIsoString(rawValue.occurredAt),
      category: this.normalizeOptionalEnum(rawValue.category),
      description: this.normalizeOptionalText(rawValue.description) ?? undefined,
      dueDate: this.normalizeOptionalDate(rawValue.dueDate),
      paymentMethod: this.normalizeOptionalEnum(rawValue.paymentMethod),
      patientId: this.normalizeOptionalText(rawValue.patientId) ?? undefined,
      appointmentId: this.normalizeOptionalText(rawValue.appointmentId) ?? undefined,
      notes: this.normalizeOptionalText(rawValue.notes) ?? undefined,
    };

    this.financialTransactionsService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/financial-transactions']);
        },
        error: () => {
          this.errorMessage.set('No fue posible crear la transaccion financiera.');
        },
      });
  }

  hasRequiredError(
    controlName: 'type' | 'amount' | 'concept' | 'occurredAt'
  ): boolean {
    const control = this.transactionForm.controls[controlName];
    return control.touched && control.hasError('required');
  }

  hasMinAmountError(): boolean {
    const control = this.transactionForm.controls.amount;
    return control.touched && control.hasError('min');
  }

  cancel(): void {
    void this.router.navigate(['/financial-transactions']);
  }

  getTypeLabel(type: FinancialTransactionType): string {
    const labels: Record<FinancialTransactionType, string> = {
      INCOME: 'Ingreso',
      EXPENSE: 'Egreso',
      ADJUSTMENT: 'Ajuste',
      REFUND: 'Reembolso',
    };

    return labels[type];
  }

  getStatusLabel(status: FinancialTransactionStatus): string {
    const labels: Record<FinancialTransactionStatus, string> = {
      PENDING: 'Pendiente',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };

    return labels[status];
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

  private normalizeOptionalText(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private normalizeOptionalEnum<T extends string>(value: T | ''): T | undefined {
    return value || undefined;
  }

  private normalizeOptionalDate(value: string): string | undefined {
    return value ? this.toIsoString(value) : undefined;
  }

  private toIsoString(value: string): string {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toISOString();
  }

  private getCurrentDateTimeLocalValue(): string {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }
}
