import { HttpContextToken } from '@angular/common/http';

export type TenantHttpMode = 'PUBLIC' | 'IDENTITY_ONLY' | 'TENANT_OPTIONAL' | 'TENANT_REQUIRED';

export const TENANT_HTTP_MODE = new HttpContextToken<TenantHttpMode>(() => 'TENANT_REQUIRED');

export const TENANT_ORGANIZATION_ID = new HttpContextToken<string | null>(() => null);
