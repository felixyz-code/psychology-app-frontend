import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  CreateFinancialTransactionDto,
  FinancialTransactionResponse,
  FinancialTransactionSummaryDto,
  UpdateFinancialTransactionDto,
} from '../models/financial-transaction.models';
import { FinancialTransactionsService } from './financial-transactions.service';

describe('FinancialTransactionsService', () => {
  let service: FinancialTransactionsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FinancialTransactionsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('gets transactions with inclusive local date boundaries and defined filters only', () => {
    service.findAll({ from: '2026-01-31', to: '2026-02-01', type: 'INCOME' }).subscribe();

    const request = httpTesting.expectOne((request) => request.url === '/api/financial-transactions');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe(new Date(2026, 0, 31).toISOString());
    expect(request.request.params.get('to')).toBe(new Date(2026, 1, 2).toISOString());
    expect(request.request.params.get('type')).toBe('INCOME');
    expect(request.request.params.has('status')).toBe(false);
    request.flush([createTransaction()]);
  });

  it('gets the summary with the same inclusive local date boundaries', () => {
    service.findSummary({ from: '2026-12-31', to: '2026-12-31', status: 'COMPLETED' }).subscribe();

    const request = httpTesting.expectOne((request) => request.url === '/api/financial-transactions/summary');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe(new Date(2026, 11, 31).toISOString());
    expect(request.request.params.get('to')).toBe(new Date(2027, 0, 1).toISOString());
    expect(request.request.params.get('status')).toBe('COMPLETED');
    request.flush(createSummary());
  });

  it('posts the create payload without transforming numeric amounts', () => {
    const payload = createPayload();

    service.create(payload).subscribe();

    const request = httpTesting.expectOne('/api/financial-transactions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(typeof request.request.body.amount).toBe('number');
    request.flush(createTransaction());
  });

  it('patches the supplied update payload', () => {
    const payload: UpdateFinancialTransactionDto = { concept: 'Sesión actualizada', amount: 725 };

    service.update('transaction-1', payload).subscribe();

    const request = httpTesting.expectOne('/api/financial-transactions/transaction-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush({ ...createTransaction(), ...payload, amount: '725' });
  });

  it('deletes a transaction by id', () => {
    service.remove('transaction-1').subscribe();

    const request = httpTesting.expectOne('/api/financial-transactions/transaction-1');
    expect(request.request.method).toBe('DELETE');
    request.flush(createTransaction());
  });

  it('gets one transaction by id for detail and edit flows', () => {
    let result: FinancialTransactionResponse | undefined;

    service.findOne('transaction-1').subscribe((transaction) => (result = transaction));

    const request = httpTesting.expectOne('/api/financial-transactions/transaction-1');
    expect(request.request.method).toBe('GET');
    request.flush(createTransaction());

    expect(result).toEqual(createTransaction());
  });
});

function createPayload(): CreateFinancialTransactionDto {
  return {
    type: 'INCOME',
    status: 'COMPLETED',
    category: 'SESSION',
    amount: 650.5,
    currency: 'MXN',
    concept: 'Sesión clínica',
    occurredAt: '2026-07-15T16:30:00.000Z',
    paymentMethod: 'TRANSFER',
  };
}

function createTransaction(): FinancialTransactionResponse {
  return {
    id: 'transaction-1',
    type: 'INCOME',
    status: 'COMPLETED',
    category: 'SESSION',
    amount: '650.50',
    currency: 'MXN',
    concept: 'Sesión clínica',
    description: null,
    occurredAt: '2026-07-15T16:30:00.000Z',
    dueDate: null,
    paymentMethod: 'TRANSFER',
    notes: null,
    patientId: null,
    appointmentId: null,
    createdById: 'psychologist-1',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}

function createSummary(): FinancialTransactionSummaryDto {
  return {
    incomeTotal: 650.5,
    expenseTotal: 0,
    adjustmentTotal: 0,
    refundTotal: 0,
    netTotal: 650.5,
    transactionCount: 1,
  };
}
