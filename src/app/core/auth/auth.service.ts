import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { TENANT_HTTP_MODE } from '../tenant-context/tenant-http-context';
import { LoginRequest, LoginResponse } from './auth.models';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly apiUrl = environment.apiUrl;

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const context = new HttpContext().set(TENANT_HTTP_MODE, 'PUBLIC');

    return this.http
      .post<LoginResponse>(this.apiUrl + '/auth/login', credentials, { context })
      .pipe(
        tap((response) => {
          this.authStore.setSession(response.accessToken, response.user);
          this.tenantContextStore.startForIdentity(response.user.id);
        }),
      );
  }

  logout(): void {
    this.tenantContextStore.resetTenantState('logout');
    this.authStore.clearSession();
  }
}
