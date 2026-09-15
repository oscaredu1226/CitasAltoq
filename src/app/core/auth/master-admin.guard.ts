import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isMasterAdmin } from './auth.models';
import { SessionStore } from './session.store';

export const masterAdminGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  return isMasterAdmin(session.user()) ? true : router.parseUrl('/403');
};
