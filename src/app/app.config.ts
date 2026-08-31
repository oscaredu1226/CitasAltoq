import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, TitleStrategy } from '@angular/router';
import { AppTitleStrategy } from './core/config/app-title.strategy';
import { authInterceptor } from './core/auth/auth.interceptor';
import { requestTracingInterceptor } from './core/http/request-tracing.interceptor';
import { mfaInterceptor } from './core/mfa/mfa.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([requestTracingInterceptor, authInterceptor, mfaInterceptor])),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ]
};
