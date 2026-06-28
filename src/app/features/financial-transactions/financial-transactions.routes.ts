import { Routes } from '@angular/router';

export const financialTransactionsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/financial-transactions-list.page').then((m) => m.FinancialTransactionsListPage),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/financial-transaction-form-placeholder.page').then(
        (m) => m.FinancialTransactionFormPlaceholderPage
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/financial-transaction-detail-placeholder.page').then(
        (m) => m.FinancialTransactionDetailPlaceholderPage
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/financial-transaction-edit-placeholder.page').then(
        (m) => m.FinancialTransactionEditPlaceholderPage
      ),
  },
];
