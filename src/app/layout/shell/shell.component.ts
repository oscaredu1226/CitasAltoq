import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { isAdmin, primaryScope, roleLabel, UserRole } from '../../core/auth/auth.models';
import { LogoComponent } from '../../shared/ui/ui.components';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '⌂', roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Pacientes', path: '/pacientes', icon: '◉', roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Citas', path: '/citas', icon: '□', roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Importaciones CRED', path: '/importaciones', icon: '⇧', roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Recordatorios', path: '/recordatorios', icon: '◌', roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Contactos', path: '/contactos', icon: '☏', roles: ['ADMIN'] },
  { label: 'Usuarios', path: '/usuarios', icon: '◇', roles: ['ADMIN'] },
  { label: 'Configuración', path: '/configuracion', icon: '⚙', roles: ['ADMIN'] },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  readonly sidebarOpen = signal(false);
  readonly user = this.auth.session.user;
  readonly visibleNav = computed(() => {
    const user = this.user();
    return navItems.filter((item) => item.roles.some((role) => user?.roles.includes(role)));
  });
  readonly roleText = computed(() => roleLabel(this.user()?.roles[0]));
  readonly scopeText = computed(() => {
    const user = this.user();
    const scope = primaryScope(user);
    if (!scope) {
      return '';
    }

    if (isAdmin(user)) {
      return 'Acceso global';
    }

    return [scope.establishment, scope.microred, scope.red].filter(Boolean).join(' · ');
  });
  readonly initials = computed(() => {
    const name = this.user()?.displayName || this.user()?.email || 'CA';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  search(value: string): void {
    const documentNumber = value.trim();
    if (!documentNumber) {
      return;
    }

    void this.router.navigate(['/pacientes'], { queryParams: { documentNumber } });
  }
}
