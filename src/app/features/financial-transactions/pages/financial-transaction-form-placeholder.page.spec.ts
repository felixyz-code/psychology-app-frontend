import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { CreateFinancialTransactionDto, FinancialTransactionResponse } from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';
import { FinancialTransactionFormPlaceholderPage } from './financial-transaction-form-placeholder.page';

describe('FinancialTransactionFormPlaceholderPage', () => {
  let create: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn();
    navigate = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        { provide: FinancialTransactionsService, useValue: { create } },
        { provide: Router, useValue: { navigate } },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('submits one numeric payload and navigates only after success', () => {
    const pendingRequest = new Subject<FinancialTransactionResponse>();
    create.mockReturnValue(pendingRequest);
    const page = createPage();
    const payload = createPayload();

    page.submit(payload);
    page.submit(payload);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(payload);
    expect(typeof create.mock.calls[0][0].amount).toBe('number');

    pendingRequest.next(createResponse());
    pendingRequest.complete();

    expect(page.isSaving()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/financial-transactions']);
  });

  it('unlocks after an error and permits a retry without navigating prematurely', () => {
    create.mockReturnValueOnce(throwError(() => new Error('Unavailable'))).mockReturnValueOnce(of(createResponse()));
    const page = createPage();

    page.submit(createPayload());

    expect(page.isSaving()).toBe(false);
    expect(page.errorMessage()).toBe('No fue posible crear la transaccion financiera.');
    expect(navigate).not.toHaveBeenCalled();

    page.submit(createPayload());

    expect(create).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/financial-transactions']);
  });

  function createPage(): FinancialTransactionFormPlaceholderPage {
    return TestBed.runInInjectionContext(() => new FinancialTransactionFormPlaceholderPage());
  }
});

function createPayload(): CreateFinancialTransactionDto {
  return { type: 'INCOME', amount: 650.5, concept: 'Sesión clínica', occurredAt: '2026-07-15T16:30:00.000Z' };
}

function createResponse(): FinancialTransactionResponse {
  return { id: 'transaction-1', type: 'INCOME', status: 'COMPLETED', category: 'SESSION', amount: '650.50', currency: 'MXN', concept: 'Sesión clínica', description: null, occurredAt: '2026-07-15T16:30:00.000Z', dueDate: null, paymentMethod: null, notes: null, patientId: null, appointmentId: null, createdById: 'psychologist-1', createdAt: '', updatedAt: '' };
}
