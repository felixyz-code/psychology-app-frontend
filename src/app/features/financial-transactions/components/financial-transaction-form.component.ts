import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import {
  CreateFinancialTransactionDto,
  FinancialTransactionCategory,
  FinancialTransactionResponse,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../models/financial-transaction.models';

type FinancialTransactionFormMode = 'create' | 'edit';

@Component({
  selector: 'app-financial-transaction-form',
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
  templateUrl: './financial-transaction-form.component.html',
  styleUrl: './financial-transaction-form.component.scss',
})
export class FinancialTransactionFormComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly hasPatchedInitialValue = signal(false);

  readonly mode = input<FinancialTransactionFormMode>('create');
  readonly initialValue = input<FinancialTransactionResponse | null>(null);
  readonly isSaving = input(false);
  readonly errorMessage = input('');

  readonly formSubmitted = output<CreateFinancialTransactionDto>();
  readonly cancelled = output<void>();

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

  constructor() {
    effect(() => {
      const transaction = this.initialValue();

      if (!transaction || this.hasPatchedInitialValue()) {
        return;
      }

      this.transactionForm.patchValue({
        type: transaction.type,
        status: transaction.status,
        category: transaction.category,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        concept: transaction.concept,
        description: transaction.description ?? '',
        occurredAt: this.toDateTimeLocalValue(transaction.occurredAt),
        dueDate: this.toOptionalDateTimeLocalValue(transaction.dueDate),
        paymentMethod: transaction.paymentMethod ?? '',
        patientId: transaction.patientId ?? '',
        appointmentId: transaction.appointmentId ?? '',
        notes: transaction.notes ?? '',
      });

      this.hasPatchedInitialValue.set(true);
    });
  }

  submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

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

    this.formSubmitted.emit(payload);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  hasRequiredError(controlName: 'type' | 'amount' | 'concept' | 'occurredAt'): boolean {
    const control = this.transactionForm.controls[controlName];
    return control.touched && control.hasError('required');
  }

  hasMinAmountError(): boolean {
    const control = this.transactionForm.controls.amount;
    return control.touched && control.hasError('min');
  }

  getTitle(): string {
    return this.mode() === 'edit' ? 'Editar transaccion financiera' : 'Nueva transaccion financiera';
  }

  getSubtitle(): string {
    return this.mode() === 'edit'
      ? 'Actualiza los campos necesarios respetando el contrato actual del backend.'
      : 'Registra un movimiento financiero consumiendo el contrato exacto del backend.';
  }

  getCardTitle(): string {
    return this.mode() === 'edit' ? 'Editar transaccion' : 'Formulario de transaccion';
  }

  getCardSubtitle(): string {
    return this.mode() === 'edit'
      ? 'Modifica los datos necesarios y conserva los campos opcionales vacios cuando no apliquen.'
      : 'Completa los campos requeridos y agrega datos opcionales solo cuando existan.';
  }

  getSubmitLabel(): string {
    return this.mode() === 'edit' ? 'Guardar cambios' : 'Guardar transaccion';
  }

  getSavingLabel(): string {
    return this.mode() === 'edit' ? 'Guardando cambios...' : 'Guardando transaccion...';
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

  private toDateTimeLocalValue(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private toOptionalDateTimeLocalValue(value: string | null): string {
    return value ? this.toDateTimeLocalValue(value) : '';
  }
}
