import { capabilityGuard } from '../../core/guards/capability.guard';
import { financialTransactionsRoutes } from './financial-transactions.routes';

describe('financial transaction routes', () => {
  it('requires finance.manage only for direct mutation pages', () => {
    expect(financialTransactionsRoutes.find((route) => route.path === 'new')).toMatchObject({
      canActivate: [capabilityGuard],
      data: { requiredCapability: 'finance.manage' },
    });
    expect(financialTransactionsRoutes.find((route) => route.path === ':id/edit')).toMatchObject({
      canActivate: [capabilityGuard],
      data: { requiredCapability: 'finance.manage' },
    });
  });

  it('keeps list and detail available under the parent finance.read guard', () => {
    expect(financialTransactionsRoutes.find((route) => route.path === '')?.canActivate).toBeUndefined();
    expect(financialTransactionsRoutes.find((route) => route.path === ':id')?.canActivate).toBeUndefined();
  });
});
