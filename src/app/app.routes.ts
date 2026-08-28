import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión',
    loadComponent: () => import('./features/auth/presentation/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/presentation/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'pacientes',
        title: 'Pacientes',
        loadComponent: () => import('./features/patients/presentation/patients.page').then((m) => m.PatientsPage),
      },
      {
        path: 'pacientes/:id',
        title: 'Detalle de paciente',
        loadComponent: () => import('./features/patients/presentation/patient-detail.page').then((m) => m.PatientDetailPage),
      },
      {
        path: 'citas',
        title: 'Citas',
        loadComponent: () => import('./features/appointments/presentation/appointments.page').then((m) => m.AppointmentsPage),
      },
      {
        path: 'citas/:id',
        title: 'Detalle de cita',
        loadComponent: () => import('./features/appointments/presentation/appointment-detail.page').then((m) => m.AppointmentDetailPage),
      },
      {
        path: 'importaciones',
        title: 'Importaciones CRED',
        loadComponent: () => import('./features/imports/presentation/imports.page').then((m) => m.ImportsPage),
      },
      {
        path: 'importaciones/nueva',
        title: 'Nueva importación',
        loadComponent: () => import('./features/imports/presentation/import-new.page').then((m) => m.ImportNewPage),
      },
      {
        path: 'importaciones/:id',
        title: 'Detalle de importación',
        loadComponent: () => import('./features/imports/presentation/import-detail.page').then((m) => m.ImportDetailPage),
      },
      {
        path: 'recordatorios',
        title: 'Recordatorios',
        loadComponent: () => import('./features/reminders/presentation/reminders.page').then((m) => m.RemindersPage),
      },
      {
        path: 'contactos',
        title: 'Contactos',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () => import('./features/contacts/presentation/contacts.page').then((m) => m.ContactsPage),
      },
      {
        path: 'usuarios',
        title: 'Usuarios',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () => import('./features/users/presentation/users.page').then((m) => m.UsersPage),
      },
      {
        path: 'configuracion',
        title: 'Configuración',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () => import('./features/operations/presentation/operations.page').then((m) => m.OperationsPage),
      },
      {
        path: '403',
        title: 'Acceso restringido',
        loadComponent: () => import('./features/errors/presentation/forbidden.page').then((m) => m.ForbiddenPage),
      },
      {
        path: '404',
        title: 'Página no encontrada',
        loadComponent: () => import('./features/errors/presentation/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
  { path: '**', redirectTo: '404' },
];
