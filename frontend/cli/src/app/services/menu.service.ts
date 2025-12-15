import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserContextService } from './user-context.service';
import { 
  MenuSection, 
  MenuItem, 
  MENU_CONFIG, 
  SHARED_MENU_ITEMS,
  getMenuSectionsForRoles,
  getAllMenuItems 
} from '../config/menu.config';
import { Role } from '../inicio-sesion/auth.service';

/**
 * Estado del menú lateral
 */
export interface SidebarState {
  isOpen: boolean;
  isMobile: boolean;
}

/**
 * Servicio para gestionar el estado y contenido del menú lateral
 * 
 * Características:
 * - Menú dinámico basado en roles del usuario
 * - Estado de apertura/cierre del sidebar
 * - Gestión de secciones colapsadas
 * - Badges de notificaciones dinámicos
 * - Responsive (mobile/desktop)
 */
@Injectable({
  providedIn: 'root'
})
export class MenuService {
  
  // Estado del sidebar
  private sidebarStateSubject = new BehaviorSubject<SidebarState>({
    isOpen: true,
    isMobile: false
  });
  
  public sidebarState$ = this.sidebarStateSubject.asObservable();
  
  // Badges de notificaciones por item
  private badgesSubject = new BehaviorSubject<Map<string, number>>(new Map());
  public badges$ = this.badgesSubject.asObservable();

  // Secciones de menú visibles según roles del usuario
  public menuSections$: Observable<MenuSection[]>;
  
  // Items compartidos (visibles para todos)
  public sharedItems$: Observable<MenuItem[]>;

  constructor(private userContextService: UserContextService) {
    
    // Calcular secciones de menú basadas en los roles del usuario
    this.menuSections$ = this.userContextService.userContext$.pipe(
      map(context => {
        if (!context.isAuthenticated) {
          return [];
        }
        
        let sections = getMenuSectionsForRoles(context.allRoles);
        
        // TODO: Refactorizar jerarquía de roles - La jerarquía MEDICO < ADMINISTRADOR no tiene sentido
        // Solución temporal hardcodeada: Ocultar paneles específicos cuando el usuario primario es ADMINISTRADOR
        if (context.primaryRole?.toUpperCase() === 'ADMINISTRADOR') {
          sections = sections.filter(section => 
            section.id !== 'medico' && section.id !== 'gestion'
          );
        }
        
        return sections;
      })
    );

    // Items compartidos (siempre visibles cuando está autenticado)
    this.sharedItems$ = this.userContextService.userContext$.pipe(
      map(context => context.isAuthenticated ? SHARED_MENU_ITEMS : [])
    );

    // Detectar tamaño de pantalla
    this.detectScreenSize();
    this.setupResizeListener();
  }

  /**
   * Alterna el estado de apertura del sidebar
   */
  toggleSidebar(): void {
    const currentState = this.sidebarStateSubject.value;
    this.sidebarStateSubject.next({
      ...currentState,
      isOpen: !currentState.isOpen
    });
  }

  /**
   * Abre el sidebar
   */
  openSidebar(): void {
    const currentState = this.sidebarStateSubject.value;
    this.sidebarStateSubject.next({
      ...currentState,
      isOpen: true
    });
  }

  /**
   * Cierra el sidebar
   */
  closeSidebar(): void {
    const currentState = this.sidebarStateSubject.value;
    this.sidebarStateSubject.next({
      ...currentState,
      isOpen: false
    });
  }

  /**
   * Actualiza el badge de notificaciones de un item
   * @param itemRoute Ruta del item
   * @param count Cantidad de notificaciones
   */
  updateBadge(itemRoute: string, count: number): void {
    const currentBadges = this.badgesSubject.value;
    const newBadges = new Map(currentBadges);
    
    if (count > 0) {
      newBadges.set(itemRoute, count);
    } else {
      newBadges.delete(itemRoute);
    }
    
    this.badgesSubject.next(newBadges);
  }

  /**
   * Obtiene el badge de un item
   * @param itemRoute Ruta del item
   * @returns Cantidad de notificaciones o 0
   */
  getBadge(itemRoute: string): number {
    return this.badgesSubject.value.get(itemRoute) || 0;
  }

  /**
   * Observable combinado de secciones con badges actualizados y filtrado por rol primario
   */
  getMenuSectionsWithBadges(): Observable<MenuSection[]> {
    return combineLatest([this.menuSections$, this.badges$, this.userContextService.userContext$]).pipe(
      map(([sections, badges, userContext]) => {
        const isSuperAdmin = userContext.primaryRole?.toUpperCase() === 'SUPERADMIN';
        const isAdmin = userContext.primaryRole?.toUpperCase() === 'ADMINISTRADOR';
        
        return sections.map(section => ({
          ...section,
          items: section.items
            .filter(item => {
              // Si el item no requiere rol primario, siempre se muestra
              if (!item.requiresPrimaryRole) {
                return true;
              }
              
              // Si requiere rol primario, verificar que el usuario tenga ese rol como primario
              if (!userContext || !userContext.primaryRole) {
                return false;
              }
              
              return userContext.primaryRole.toUpperCase() === section.role.toUpperCase();
            })
            .map(item => {
              const badgeCount = item.route ? badges.get(item.route) : undefined;
              
              // Personalizar label y route según rol para "Centros de Atención"
              let label = item.label;
              let route = item.route;
              
              if (item.route === '/centrosAtencion') {
                if (isSuperAdmin) {
                  label = 'Gestión de Centros';
                  route = '/centrosAtencion'; // Lista de todos los centros
                  console.log('🔧 MenuService: SUPERADMIN - Route:', route);
                } else if (isAdmin) {
                  label = 'Mi Centro';
                  const tenantId = userContext.centroAtencionId;
                  route = tenantId ? `/centrosAtencion/${tenantId}` : '/centrosAtencion';
                }
              }
              
              return {
                ...item,
                label: label,
                route: route,
                badge: badgeCount && badgeCount > 0 ? {
                  value: badgeCount,
                  color: item.badge?.color || 'danger'
                } : item.badge
              };
            })
        }));
      })
    );
  }

  /**
   * Detecta el tamaño de pantalla inicial
   */
  private detectScreenSize(): void {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const currentState = this.sidebarStateSubject.value;
      this.sidebarStateSubject.next({
        ...currentState,
        isMobile,
        isOpen: !isMobile // En mobile, sidebar cerrado por defecto
      });
    }
  }

  /**
   * Configura listener para cambios de tamaño de pantalla
   */
  private setupResizeListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        const isMobile = window.innerWidth < 768;
        const currentState = this.sidebarStateSubject.value;
        
        // Solo actualizar si cambió el estado mobile/desktop
        if (currentState.isMobile !== isMobile) {
          this.sidebarStateSubject.next({
            ...currentState,
            isMobile,
            isOpen: !isMobile
          });
        }
      });
    }
  }

  /**
   * Obtiene todas las rutas accesibles por el usuario
   * @returns Observable con array de rutas
   */
  getAccessibleRoutes(): Observable<string[]> {
    return this.menuSections$.pipe(
      map(sections => {
        const routes: string[] = [];
        sections.forEach(section => {
          section.items.forEach(item => {
            if (item.route) {
              routes.push(item.route);
            }
          });
        });
        return routes;
      })
    );
  }

  /**
   * Verifica si una ruta es accesible por el usuario
   * @param route Ruta a verificar
   * @returns Observable<boolean>
   */
  isRouteAccessible(route: string): Observable<boolean> {
    return this.getAccessibleRoutes().pipe(
      map(routes => routes.includes(route))
    );
  }
}
