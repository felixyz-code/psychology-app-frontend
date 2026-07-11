import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { HttpErrorPolicyService } from '../errors/http-error-policy.service';

export const errorPolicyInterceptor: HttpInterceptorFn = (req, next) => {
  const errorPolicy = inject(HttpErrorPolicyService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        errorPolicy.handle(error, req.url);
      }

      return throwError(() => error);
    })
  );
};
