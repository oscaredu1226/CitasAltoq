import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideCalendarDays,
  LucideContactRound,
  LucideFileUp,
  LucideIcon,
  LucideLayoutDashboard,
  LucideMenu,
  LucideSearch,
  LucideSettings,
  LucideShieldCheck,
  LucideUserCog,
  LucideUsersRound,
} from '@lucide/angular';
import { AuthFacade } from '../../core/auth/auth.facade';
import { isAdmin, organizationLabel, primaryEstablishment, roleLabel, UserRole } from '../../core/auth/auth.models';
import { LogoComponent } from '../../shared/ui/ui.components';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
}

interface NotificationItem {
  label: string;
  detail: string;
  path: string;
  queryParams?: Record<string, string>;
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
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent, LucideMenu, LucideSearch, LucideBell, LucideShieldCheck, NgComponentOutlet, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  readonly sidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly notificationsOpen = signal(false);
  readonly user = this.auth.session.user;
  readonly visibleNav = computed(() => {
    const user = this.user();
    return navItems.filter((item) => item.roles.some((role) => user?.roles.includes(role)));
  });
  readonly roleText = computed(() => roleLabel(this.user()?.roles[0]));
  readonly organizationText = computed(() => organizationLabel(this.user()));
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
  readonly notifications = computed<NotificationItem[]>(() => {
    if (this.admin()) {
      return [
        { label: 'Citas pendientes', detail: 'Revisar confirmaciones del dia', path: '/citas', queryParams: { confirmation: 'PENDING' } },
        { label: 'Recordatorios activos', detail: 'Ver envios pendientes y fallidos', path: '/recordatorios' },
        { label: 'Importaciones CRED', detail: 'Validar ultimas cargas registradas', path: '/importaciones' },
      ];
    }

    return [
      { label: 'Citas pendientes', detail: 'Revisar tu establecimiento asignado', path: '/citas', queryParams: { confirmation: 'PENDING' } },
      { label: 'Recordatorios activos', detail: 'Ver envios pendientes y fallidos', path: '/recordatorios' },
    ];
  });

  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  @HostListener('document:keydown.control.k', ['$event'])
  focusSearchWithControl(event: Event): void {
    this.focusSearch(event);
  }

  @HostListener('document:keydown.meta.k', ['$event'])
  focusSearchWithMeta(event: Event): void {
    this.focusSearch(event);
  }

  @HostListener('document:click')
  closeFloatingMenus(): void {
    this.notificationsOpen.set(false);
  }

  search(value: string): void {
    const documentNumber = value.trim();
    if (!documentNumber) {
      void this.router.navigate(['/pacientes']);
      return;
    }

    void this.router.navigate(['/pacientes'], { queryParams: { documentNumber } });
  }

  toggleSidebar(): void {
    if (globalThis.matchMedia?.('(max-width: 820px)').matches) {
      this.sidebarOpen.update((value) => !value);
      return;
    }

    this.sidebarCollapsed.update((value) => !value);
  }

  closeSidebarOnNavigation(): void {
    if (globalThis.matchMedia?.('(max-width: 820px)').matches) {
      this.sidebarOpen.set(false);
    }
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsOpen.update((value) => !value);
  }

  openNotification(item: NotificationItem): void {
    this.notificationsOpen.set(false);
    void this.router.navigate([item.path], { queryParams: item.queryParams });
  }

  private focusSearch(event: Event): void {
    event.preventDefault();
    this.searchInput?.nativeElement.focus();
    this.searchInput?.nativeElement.select();
  }
}
