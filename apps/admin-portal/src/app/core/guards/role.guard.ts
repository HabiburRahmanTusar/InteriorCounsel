import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Factory that builds a role-guard for one or more allowed roles.
 * Usage: roleGuard('admin', 'hr')
 */
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.currentRole();

    if (role && allowedRoles.includes(role)) {
      return true;
    }

    if (role === 'employee') {
      return router.createUrlTree(['/attendance']);
    }
    return router.createUrlTree(['/dashboard']);
  };
}
