import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideCalendarDays,
  LucideContactRound,
  LucideFileUp,
  LucideIcon,
  LucideLayoutDashboard,
  LucideMenu,
  LucideSettings,
  LucideShieldAlert,
  LucideUserCog,
  LucideUsersRound,
} from '@lucide/angular';
import { AuthFacade } from '../../core/auth/auth.facade';
import { isAdmin, isMasterAdmin, primaryEstablishment, roleLabel, UserRole } from '../../core/auth/auth.models';
import { MfaRepository } from '../../core/mfa/mfa.repository';
import { MfaStore } from '../../core/mfa/mfa.store';
import { LogoComponent } from '../../shared/ui/ui.components';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
  requiresMasterMfa?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LucideLayoutDashboard, roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Pacientes', path: '/pacientes', icon: LucideUsersRound, roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Citas', path: '/citas', icon: LucideCalendarDays, roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Importaciones CRED', path: '/importaciones', icon: LucideFileUp, roles: ['ADMIN'] },
  { label: 'Recordatorios', path: '/recordatorios', icon: LucideBell, roles: ['ADMIN', 'ESTABLISHMENT_OPERATOR'] },
  { label: 'Contactos', path: '/contactos', icon: LucideContactRound, roles: ['ADMIN'] },
  { label: 'Usuarios', path: '/usuarios', icon: LucideUserCog, roles: ['ADMIN'] },
  { label: 'Configuración', path: '/configuracion', icon: LucideSettings, roles: ['ADMIN'] },
  { label: 'Seguridad', path: '/seguridad', icon: LucideShieldAlert, roles: ['ADMIN'], requiresMasterMfa: true },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent, LucideMenu, NgComponentOutlet, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  readonly auth = inject(AuthFacade);
  private readonly mfaRepository = inject(MfaRepository);
  readonly mfa = inject(MfaStore);
  readonly sidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly user = this.auth.session.user;
  readonly visibleNav = computed(() => {
    const user = this.user();
    return navItems.filter((item) => item.roles.some((role) => user?.roles.includes(role))
      && (!item.requiresMasterMfa || (isMasterAdmin(user) && this.mfa.enrolled())));
  });
  readonly roleText = computed(() => roleLabel(this.user()?.roles[0]));
  readonly establishmentText = computed(() => primaryEstablishment(this.user())?.name ?? '');
  readonly microredText = computed(() => primaryEstablishment(this.user())?.microred?.name ?? '');
  readonly redText = computed(() => primaryEstablishment(this.user())?.red?.name ?? '');
  readonly admin = computed(() => isAdmin(this.user()));
  readonly initials = computed(() => {
    const name = this.user()?.displayName || this.user()?.email || 'CA';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  constructor() {
    if (isMasterAdmin(this.user())) {
      this.mfaRepository.status().subscribe({
        next: (status) => this.mfa.setStatus(status),
        error: () => this.mfa.clear(),
      });
    }
  }

  toggleSidebar(): void {
    if (globalThis.matchMedia?.('(max-width: 820px)').matches) {
      const nextOpen = !this.sidebarOpen();
      this.sidebarOpen.set(nextOpen);

      if (nextOpen) {
        this.sidebarCollapsed.set(false);
      }

      return;
    }

    this.sidebarOpen.set(false);
    this.sidebarCollapsed.update((value) => !value);
  }

  closeSidebarOnNavigation(): void {
    if (globalThis.matchMedia?.('(max-width: 820px)').matches) {
      this.sidebarOpen.set(false);
    }
  }
}
