import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { branchContextInterceptor } from './core/interceptors/branch-context.interceptor';
import { errorPolicyInterceptor } from './core/interceptors/error-policy.interceptor';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { TenantContextStore } from './core/tenant-context/tenant-context.store';
import { TenantStateInvalidationCoordinator } from './core/tenant-context/tenant-state-invalidation.coordinator';
import { tenantStateInterceptor } from './core/tenant-context/tenant-state.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    provideAppInitializer(() => {
      inject(TenantStateInvalidationCoordinator);
      return inject(TenantContextStore).bootstrap();
    }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        branchContextInterceptor,
        tenantStateInterceptor,
        errorPolicyInterceptor,
      ]),
    ),
  ],
};
