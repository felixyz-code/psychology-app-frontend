import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { FinancialTransactionResponse, FinancialTransactionSummaryDto } from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';
import { FinancialTransactionsListPage } from './financial-transactions-list.page';

describe('FinancialTransactionsListPage', () => {
  let findAll: ReturnType<typeof vi.fn>;
  let findSummary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findAll = vi.fn(() => of([] as FinancialTransactionResponse[]));
    findSummary = vi.fn(() => of(createSummary()));
    TestBed.configureTestingModule({
      providers: [
        { provide: FinancialTransactionsService, useValue: { findAll, findSummary } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
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

  function createPage(): FinancialTransactionsListPage {
    return TestBed.runInInjectionContext(() => new FinancialTransactionsListPage());
  }
});

function createSummary(): FinancialTransactionSummaryDto {
  return { incomeTotal: 0, expenseTotal: 0, adjustmentTotal: 0, refundTotal: 0, netTotal: 0, transactionCount: 0 };
}
