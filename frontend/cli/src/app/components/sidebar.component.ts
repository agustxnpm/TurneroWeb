import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MenuService } from '../services/menu.service';
import { UserContextService, UserContext } from '../services/user-context.service';
import { AuthService } from '../inicio-sesion/auth.service';
import { MenuSection, MenuItem } from '../config/menu.config';

/**
 * Componente del menú lateral (sidebar) dinámico basado en roles
 * 
 * Características:
 * - Menú adaptativo según roles del usuario
 * - Colapso/expansión de secciones
 * - Badges de notificaciones
 * - Responsive (mobile/desktop)
 * - Highlighting de ruta activa
 * - Mini-sidebar estilo Google Gemini cuando está colapsado
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  animations: [
    // Puedes agregar animaciones Angular aquí si lo deseas
  ]
})
export class SidebarComponent implements OnInit, OnDestroy {
  
  @Output() toggleSidebar = new EventEmitter<void>();
  
  public userContext$!: Observable<UserContext | null>;
  public menuSectionsWithBadges$!: Observable<MenuSection[]>;
  
  private subscriptions: Subscription[] = [];
  private currentRoute = '';

  constructor(
    public menuService: MenuService,
    private userContextService: UserContextService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Inicializar observables
    this.userContext$ = this.userContextService.userContext$;
    this.menuSectionsWithBadges$ = this.menuService.getMenuSectionsWithBadges();
    
    // Suscribirse a cambios de ruta para highlight
    const routeSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        
        // En mobile, cerrar sidebar después de navegar
        this.menuService.sidebarState$.subscribe(state => {
          if (state.isMobile && state.isOpen) {
            this.menuService.closeSidebar();
          }
        }).unsubscribe();
      });
    
    this.subscriptions.push(routeSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Verifica si una ruta está activa
   */
  isActiveRoute(route?: string): boolean {
    if (!route) return false;
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  /**
   * Maneja el click en un item del menú
   */
  onItemClick(): void {
    // Cerrar sidebar en mobile después de un pequeño delay
    setTimeout(() => {
      this.menuService.sidebarState$.subscribe(state => {
        if (state.isMobile) {
          this.menuService.closeSidebar();
        }
      }).unsubscribe();
    }, 100);
  }

  /**
   * Emite evento para toggle del sidebar (controla el parent)
   */
  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  /**
   * Cierra la sesión
   */
  logout(): void {
    this.authService.logout();
  }

  /**
   * Obtiene el nombre display del rol
   */
  getRoleDisplay(role: string): string {
    const roleMap: Record<string, string> = {
      'PACIENTE': 'Paciente',
      'MEDICO': 'Médico',
      'OPERADOR': 'Operador',
      'ADMINISTRADOR': 'Administrador'
    };
    return roleMap[role] || role;
  }
}
