import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthFacade } from './auth.facade';
import { UserRole } from './auth.models';

export function roleGuard(roles: UserRole[]): CanActivateFn {
  return () => {
    const facade = inject(AuthFacade);
    const router = inject(Router);

    return facade.restore().pipe(
      map((ok) => {
        const user = facade.session.user();
        return ok && user?.roles.some((role) => roles.includes(role))
          ? true
          : router.createUrlTree(['/403']);
      }),
    );
  };
}
