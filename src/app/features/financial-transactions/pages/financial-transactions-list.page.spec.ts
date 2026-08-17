import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  FinancialTransactionResponse,
  FinancialTransactionSummaryDto,
} from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';
import { FinancialTransactionsListPage } from './financial-transactions-list.page';
import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';

describe('FinancialTransactionsListPage', () => {
  let findAll: ReturnType<typeof vi.fn>;
  let findSummary: ReturnType<typeof vi.fn>;
  let capabilities: WritableSignal<string[]>;
  let openDialog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findAll = vi.fn(() => of([] as FinancialTransactionResponse[]));
    findSummary = vi.fn(() => of(createSummary()));
    capabilities = signal(['finance.manage', 'finance.read', 'finance.summary_read']);
    openDialog = vi.fn(() => ({ afterClosed: () => of(false) }));
    TestBed.configureTestingModule({
      imports: [FinancialTransactionsListPage],
      providers: [
        provideRouter([]),
        { provide: FinancialTransactionsService, useValue: { findAll, findSummary } },
        { provide: MatDialog, useValue: { open: openDialog } },
        {
          provide: TenantContextStore,
          useValue: {
            hasCapability: (capability: string) => capabilities().includes(capability),
          },
        },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('uses the same applied filters for list and summary refreshes', () => {
    const page = createPage();
    page.filtersForm.patchValue({ type: 'INCOME', from: '2026-07-01', to: '2026-07-31' });

    page.applyFilters();

    expect(findAll).toHaveBeenLastCalledWith(page.appliedFilters());
    expect(findSummary).toHaveBeenLastCalledWith(page.appliedFilters());
  });

  it('clears filters and settles the failed source loading state', () => {
    findSummary.mockReturnValue(throwError(() => new Error('Unavailable')));
    const page = createPage();

    expect(page.isSummaryLoading()).toBe(false);
    expect(page.summaryErrorMessage()).toBe('No fue posible cargar el resumen financiero.');

    page.clearFilters();

    expect(page.appliedFilters()).toEqual({});
    expect(findAll).toHaveBeenLastCalledWith({});
    expect(findSummary).toHaveBeenLastCalledWith({});
  });

  it('loads the list and summary when both read capabilities are present', () => {
    createPage();

    expect(findAll).toHaveBeenCalledOnce();
    expect(findSummary).toHaveBeenCalledOnce();
  });

  it('loads the list without requesting or failing the unauthorized summary', () => {
    capabilities.set(['finance.read']);

    const page = createPage();

    expect(findAll).toHaveBeenCalledOnce();
    expect(findSummary).not.toHaveBeenCalled();
    expect(page.isSummaryLoading()).toBe(false);
    expect(page.summary()).toBeNull();
    expect(page.summaryErrorMessage()).toBe('');
  });

  it('blocks mutation affordances without finance.manage and retains them when granted', () => {
    capabilities.set(['finance.read']);
    const page = createPage();

    expect(page.canManage()).toBe(false);
    page.openDeleteDialog(createTransaction());
    expect(openDialog).not.toHaveBeenCalled();

    capabilities.set(['finance.manage', 'finance.read']);
    expect(page.canManage()).toBe(true);
    page.openDeleteDialog(createTransaction());
    expect(openDialog).toHaveBeenCalledOnce();
  });

  it('reactively hides and restores mutation controls from the canonical capability signal', () => {
    capabilities.set(['finance.read', 'finance.summary_read']);
    findAll.mockReturnValue(of([createTransaction()]));
    const fixture = TestBed.createComponent(FinancialTransactionsListPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Registrar movimiento');
    expect(fixture.nativeElement.querySelector('[aria-label^="Editar transaccion"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label^="Eliminar transaccion"]')).toBeNull();

    capabilities.update((current) => [...current, 'finance.manage']);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Registrar movimiento');
    expect(
      fixture.nativeElement.querySelector('[aria-label^="Editar transaccion"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-label^="Eliminar transaccion"]'),
    ).not.toBeNull();
  });

  function createPage(): FinancialTransactionsListPage {
    return TestBed.runInInjectionContext(() => new FinancialTransactionsListPage());
  }
});

function createSummary(): FinancialTransactionSummaryDto {
  return {
    incomeTotal: 0,
    expenseTotal: 0,
    adjustmentTotal: 0,
    refundTotal: 0,
    netTotal: 0,
    transactionCount: 0,
  };
}

function createTransaction(): FinancialTransactionResponse {
  return {
    id: 'transaction-1',
    type: 'INCOME',
    status: 'COMPLETED',
    category: 'SESSION',
    amount: '100.00',
    currency: 'MXN',
    concept: 'Consulta',
    description: null,
    occurredAt: '2026-07-02T18:00:00.000Z',
    dueDate: null,
    paymentMethod: null,
    notes: null,
    patientId: null,
    appointmentId: null,
    createdById: 'user-1',
    createdAt: '2026-07-02T18:00:00.000Z',
    updatedAt: '2026-07-02T18:00:00.000Z',
  };
}
