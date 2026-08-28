import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthFacade } from './auth.facade';

export const authGuard: CanActivateFn = () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);

  return facade.restore().pipe(map((ok) => (ok ? true : router.createUrlTree(['/login']))));
};
