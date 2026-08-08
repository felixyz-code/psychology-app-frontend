import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorPolicyInterceptor } from './core/interceptors/error-policy.interceptor';
import { TenantContextStore } from './core/tenant-context/tenant-context.store';
import { TenantStateInvalidationCoordinator } from './core/tenant-context/tenant-state-invalidation.coordinator';
import { tenantStateInterceptor } from './core/tenant-context/tenant-state.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => {
      inject(TenantStateInvalidationCoordinator);
      return inject(TenantContextStore).bootstrap();
    }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, tenantStateInterceptor, errorPolicyInterceptor]),
    ),
  ],
};
