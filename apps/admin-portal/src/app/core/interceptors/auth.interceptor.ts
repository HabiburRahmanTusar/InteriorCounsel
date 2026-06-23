import { HttpInterceptorFn } from '@angular/common/http';

import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';

/**
 * Attaches the Bearer access token to every outgoing request.
 * Skips auth endpoints (login, refresh, forgot/reset password).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh-token') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  if (isAuthEndpoint) {
    return next(req);
  }

  const token = auth.accessToken();
  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);
};
