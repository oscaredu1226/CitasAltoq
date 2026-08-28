# Arquitectura frontend

CITAS ALTOQ es una aplicación Angular 22 standalone, organizada por capacidades y conectada al backend Spring Boot real mediante `environment.apiBaseUrl`.

## Capas

- `core/config`: fuente central de configuración de API.
- `core/auth`: login real, restauración de sesión con `/api/me`, store de sesión, interceptor Bearer, `authGuard` y `roleGuard`.
- `core/http`: `PageResponse`, `ApiProblem`, mapeo de errores y trazabilidad `X-Request-ID`.
- `shared/ui`: componentes visuales reutilizables para logo, encabezado de página, badges, cards, paginación, alertas y empty states.
- `shared/utils`: mappers de estado, fecha LocalDate/OffsetDateTime y enmascaramiento de teléfono.
- `layout/shell`: sidebar, header, usuario actual, rol traducido y navegación según autorización efectiva.
- `features/*`: pantallas, repositorios HTTP y lógica de presentación por dominio funcional.

Cada vista y componente Angular se mantiene en archivos separados `.ts`, `.html` y `.css`. Los estilos globales conservan únicamente tokens, layout base y utilidades visuales compartidas para evitar duplicación.

## Autenticación

El login llama `POST /api/auth/login`, guarda el `accessToken` con expiración y consulta inmediatamente `GET /api/me`. Los roles y scopes visibles se obtienen siempre desde `/api/me`; no se extraen del JWT.

La sesión usa `sessionStorage` por defecto. Si el usuario marca "Recordarme", usa `localStorage`. Los componentes no acceden directamente al almacenamiento.

## Interceptores

`requestTracingInterceptor` agrega `X-Request-ID` a requests del backend. `authInterceptor` agrega `Authorization: Bearer <token>` a requests API cuando existe sesión, excepto en login. No se define manualmente `Content-Type` para `FormData`.

## Roles y scopes

Los roles válidos son `ADMIN` y `ESTABLISHMENT_OPERATOR`. El administrador ve navegación global y módulos administrativos. El operador solo ve Dashboard, Pacientes, Citas, Importaciones CRED y Recordatorios, con su scope de establecimiento mostrado en el header.

## Importación CRED

La nueva importación acepta `.xlsx`, envía el archivo real al preview, conserva el mismo `File`, y al aplicar usa exactamente `preview.fileChecksum`, `preview.scopeFingerprint` y el mismo scope. El apply se trata como aceptación asíncrona y se hace polling con `GET /api/cred/imports/{batchId}` hasta `COMPLETED` o `FAILED`.

## Decisiones visuales

El diseño replica el lenguaje de los mockups con sidebar fija, header institucional, cards, tablas, badges y paneles limpios. El branding visible se reemplazó por CITAS ALTOQ y un logo temporal propio hecho con CSS, sin usar EDIF MISTI como marca visible.
