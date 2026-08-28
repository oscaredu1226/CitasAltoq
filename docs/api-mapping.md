# Mapeo API

| Vista frontend | Endpoint real | Método | Rol | Observaciones |
| --- | --- | --- | --- | --- |
| Login | `/api/auth/login` | POST | Público | Devuelve access token Bearer. |
| Restaurar usuario | `/api/me` | GET | Autenticado | Fuente real de roles y scopes. |
| Dashboard KPIs | `/api/cred/patients` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Usa `page=0&size=1` para totales. |
| Dashboard citas | `/api/cred/appointments` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Compone totales con `status`, `scheduledDate` y `confirmationStatus`. |
| Dashboard recordatorios | `/api/cred/reminders` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Usa total disponible; no filtra por status porque no existe. |
| Dashboard estado operativo | `/api/cred/operations/status` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Reemplaza gráfica global de recordatorios. |
| Pacientes | `/api/cred/patients` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Filtros reales: documento, historia clínica, scope, activo, page, size. |
| Detalle paciente | `/api/cred/patients/{id}` | GET | ADMIN, ESTABLISHMENT_OPERATOR | No inventa apoderado. |
| Historial paciente | `/api/cred/patients/{id}/appointments` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Origen derivado de campos reales. |
| Contacto de paciente | `/api/contacts/{guardianContactId}` | GET | ADMIN | Operador no llama este endpoint. |
| Citas | `/api/cred/appointments` | GET | ADMIN, ESTABLISHMENT_OPERATOR | La cita muestra solo fecha; no hay hora en `scheduledDate`. |
| Detalle cita | `/api/cred/appointments/{id}` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Incluye `appointment` y `reminder`. |
| Resolver paciente | `/api/cred/patients/{id}` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Cache local por UUID, sin endpoint batch inventado. |
| Recordatorios | `/api/cred/reminders` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Filtros visuales de estado/paciente son locales. |
| Importaciones | `/api/cred/imports` | GET | ADMIN, ESTABLISHMENT_OPERATOR | Historial read-only paginado. |
| Detalle importación | `/api/cred/imports/{id}` | GET | ADMIN, ESTABLISHMENT_OPERATOR | No muestra issues históricos porque el DTO no los expone. |
| Scope importación | `/api/cred/imports/scopes` | POST | ADMIN, ESTABLISHMENT_OPERATOR | Preparado en repositorio para análisis de scope. |
| Preview importación | `/api/cred/imports/preview` | POST | ADMIN, ESTABLISHMENT_OPERATOR | Multipart `.xlsx`, query scope opcional. |
| Apply importación | `/api/cred/imports/apply` | POST | ADMIN, ESTABLISHMENT_OPERATOR | Envía `expectedChecksum` y `expectedScopeFingerprint`. |
| Contactos | `/api/contacts` | GET, POST | ADMIN | Teléfono enmascarado en tabla. |
| Editar contacto | `/api/contacts/{id}` | PUT | ADMIN | No existe DELETE. |
| Desactivar contacto | `/api/contacts/{id}/deactivate` | PATCH | ADMIN | Acción no destructiva. |
| Consentimiento WhatsApp | `/api/contacts/{id}/whatsapp-consent` | PUT | ADMIN | Estados `UNKNOWN`, `OPTED_IN`, `OPTED_OUT`. |
| Usuarios | `/api/admin/users` | GET, POST | ADMIN | Solo roles `ADMIN` y `ESTABLISHMENT_OPERATOR`. |
| Editar usuario | `/api/admin/users/{id}` | PUT | ADMIN | Perfil y estado. |
| Autorización usuario | `/api/admin/users/{id}/authorization` | PUT | ADMIN | Rol y scope atómicos. |
| Restablecer contraseña | `/api/admin/users/{id}/password` | PUT | ADMIN | No hay recuperación pública. |
| Configuración | `/api/cred/operations/status` | GET | ADMIN | Pantalla informativa; no hay switches editables. |
