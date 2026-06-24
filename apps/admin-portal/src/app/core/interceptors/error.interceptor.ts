import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * Translates HTTP errors into domain errors.
 * On 401, attempts to refresh the token; if refresh fails, logs the user out.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return auth.refreshSession().pipe(
          switchMap((tokens) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            auth.clearSession();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
