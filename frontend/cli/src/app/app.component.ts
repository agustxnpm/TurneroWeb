import { Component, OnInit, OnDestroy } from "@angular/core";
import {
  RouterOutlet,
  Router,
  NavigationEnd,
  RouterLink,
} from "@angular/router";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { CommonModule } from "@angular/common";
import { filter, map, combineLatest } from "rxjs/operators";
import { NotificacionService } from "./services/notificacion.service";
import { Subscription, Observable } from "rxjs";
import { AuthService, Role } from "./inicio-sesion/auth.service";
import { UserContextService, UserContext } from "./services/user-context.service";
import { SidebarComponent } from "./components/sidebar.component";
import { MenuService } from "./services/menu.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, NgbDropdownModule, CommonModule, RouterLink, SidebarComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css", 
})
export class AppComponent implements OnInit, OnDestroy {
  title = "CheTurno";
  currentRoute = "";
  patientNotificationCount = 0;
  private subscriptions: Subscription[] = [];
  
  // Control del estado del sidebar
  sidebarOpen = true;

  // Observables reactivos para el estado del usuario
  public userContext$: Observable<UserContext | null>;
  public isAuthenticated$: Observable<boolean>;
  public isAdmin$: Observable<boolean>;
  public isOperador$: Observable<boolean>;
  public isPatient$: Observable<boolean>;
  public isMedico$: Observable<boolean>;
  public userName$: Observable<string>;
  public userRoleDisplay$: Observable<string>;

  constructor(
    private router: Router,
    private notificacionService: NotificacionService,
    private authService: AuthService,
    private userContextService: UserContextService,
    public menuService: MenuService // Inyectado como public para uso en template
  ) {
    // Inicializar observables reactivos
    this.userContext$ = this.userContextService.userContext$;
    this.isAuthenticated$ = this.authService.authState$;
    
    this.isAdmin$ = this.userContext$.pipe(
      map(context => context ? this.userContextService.hasRole(Role.ADMINISTRADOR) : false)
    );
    
    this.isOperador$ = this.userContext$.pipe(
      map(context => context ? this.userContextService.hasRole(Role.OPERADOR) : false)
    );
    
    this.isPatient$ = this.userContext$.pipe(
      map(context => context ? this.userContextService.hasRole(Role.PACIENTE) : false)
    );
    
    this.isMedico$ = this.userContext$.pipe(
      map(context => context ? this.userContextService.hasRole(Role.MEDICO) : false)
    );
    
    this.userName$ = this.userContext$.pipe(
      map(context => context?.nombre || 'Usuario')
    );
    
    this.userRoleDisplay$ = this.userContext$.pipe(
      map(context => {
        if (!context) return 'Usuario';
        switch (context.primaryRole?.toUpperCase()) {
          case 'ADMINISTRADOR': return 'Administrador';
          case 'PACIENTE': return 'Paciente';
          case 'MEDICO': return 'Médico';
          case 'OPERADOR': return 'Operador';
          default: return 'Usuario';
        }
      })
    );
  }

  ngOnInit() {
    // ========================================
    // INICIALIZAR ESTADO DE AUTENTICACIÓN
    // ========================================
    // IMPORTANTE: Esto debe ejecutarse PRIMERO para que el authStateSubject
    // tenga el valor correcto basado en el token almacenado.
    // Si no se hace aquí, el BehaviorSubject se inicializa con 'false' por defecto
    // y no refleja el estado real de autenticación.
    this.authService.initAuthStatus();

    // Escuchar cambios de ruta para actualizar el estado activo
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;

        // Cargar notificaciones del paciente cuando cambie la ruta si es paciente
        if (this.isPatient()) {
          this.cargarNotificacionesPaciente();
        }
      });

    // Cargar notificaciones iniciales si es paciente
    if (this.isPatient()) {
      this.cargarNotificacionesPaciente();
    }

    // Suscribirse al contador de notificaciones y actualizar badge del menú
    const notificationSub =
      this.notificacionService.contadorNoLeidas$.subscribe(
        (count) => {
          this.patientNotificationCount = count;
          // Actualizar el badge en el menú lateral
          this.menuService.updateBadge('/paciente-notificaciones', count);
        }
      );
    this.subscriptions.push(notificationSub);
  }
  /**
   * Detecta si el usuario actual es operador
   * @deprecated Usar isOperador$ observable para mejor rendimiento
   */
  public isOperador(): boolean {
    return this.userContextService.hasRole(Role.OPERADOR);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private cargarNotificacionesPaciente() {
    const pacienteId = this.getPacienteId();
    if (pacienteId) {
      this.notificacionService.actualizarContador(pacienteId);
    }
  }

  private getPacienteId(): number | null {
    const pacienteId = localStorage.getItem("pacienteId");
    return pacienteId ? parseInt(pacienteId) : null;
  }

  /**
   * @deprecated Usar isAuthenticated$ observable para mejor rendimiento
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * @deprecated Usar isAdmin$ observable para mejor rendimiento
   */
  isAdmin(): boolean {
    return this.userContextService.hasRole(Role.ADMINISTRADOR);
  }

  /**
   * @deprecated Usar isPatient$ observable para mejor rendimiento
   */
  isPatient(): boolean {
    return this.userContextService.hasRole(Role.PACIENTE);
  }

  /**
   * @deprecated Usar isMedico$ observable para mejor rendimiento
   */
  isMedico(): boolean {
    return this.userContextService.hasRole(Role.MEDICO);
  }

  /**
   * @deprecated Usar userName$ observable para mejor rendimiento
   */
  getUserName(): string {
    const context = this.userContextService.getCurrentContext();
    return context?.nombre || "Usuario";
  }

  /**
   * @deprecated Usar userRoleDisplay$ observable para mejor rendimiento
   */
  getUserRoleDisplay(): string {
    const context = this.userContextService.getCurrentContext();
    if (!context) return 'Usuario';
    
    switch (context.primaryRole?.toUpperCase()) {
      case "ADMINISTRADOR":
        return "Administrador";
      case "PACIENTE":
        return "Paciente";
      case "MEDICO":
        return "Médico";
      case "OPERADOR":
        return "Operador";
      default:
        return "Usuario";
    }
  }

  goToLogin(): void {
    this.router.navigate(["/ingresar"]);
  }

  logout(): void {
    this.authService.logout();
  }

  isRouteActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // Método para obtener la ruta del dashboard según el rol del usuario
  getDashboardRoute(): string {
    const role = this.authService.getUserRole();
    switch(role) {
      case 'PACIENTE':
        return '/paciente-dashboard';
      case 'MEDICO':
        return '/medico-dashboard';
      case 'OPERADOR':
        return '/operador-dashboard';
      case 'ADMINISTRADOR':
        return '/admin-dashboard';
      default:
        // Error: no se pudo obtener el rol del usuario
        console.error('Error: No se pudo obtener el rol del usuario. Rol recibido:', role);
        this.handleAuthenticationError('No se pudo determinar el rol del usuario');
        return '/ingresar';
    }
  }

  // Método para navegar al dashboard correspondiente según el rol
  goToDashboard(): void {
    const dashboardRoute = this.getDashboardRoute();
    this.navigateTo(dashboardRoute);
  }

  // Método para manejar errores de autenticación
  private handleAuthenticationError(message: string): void {
    console.error('Error de autenticación:', message);
    
    // Limpiar datos de autenticación
    this.authService.logout();
    
    // Mostrar mensaje de error al usuario
    alert(`Error de autenticación: ${message}. Será redirigido al login.`);
    
    // Redirigir al login
    this.router.navigate(['/ingresar']);
  }

  // Métodos para gestión de notificaciones de auditoría
  hasUnreadNotifications(): boolean {
    // Mock implementation - debería conectarse con el servicio de notificaciones
    const unreadCount = localStorage.getItem("unreadNotifications");
    return unreadCount ? parseInt(unreadCount) > 0 : false;
  }

  getUnreadCount(): number {
    // Mock implementation - debería conectarse con el servicio de notificaciones
    const unreadCount = localStorage.getItem("unreadNotifications");
    return unreadCount ? parseInt(unreadCount) : 0;
  }

  // Método para obtener el contador de notificaciones del paciente
  getPatientNotificationCount(): number {
    if (!this.isPatient()) {
      return 0;
    }
    return this.patientNotificationCount;
  }

  /**
   * Navega al perfil/configuración correspondiente según el rol del usuario
   */
  goToUserProfile() {
    const role = this.authService.getUserRole();
    
    switch(role) {
      case 'PACIENTE':
        this.router.navigate(['/paciente-perfil']);
        break;
      case 'MEDICO':
        this.router.navigate(['/medico-perfil']);
        break;
      case 'OPERADOR':
        this.router.navigate(['/operador-perfil']);
        break;
      case 'ADMINISTRADOR':
        this.router.navigate(['/admin-perfil']);
        break;
      default:
        // Error: no se pudo obtener el rol del usuario
        console.error('Error: No se pudo obtener el rol del usuario para navegación al perfil. Rol recibido:', role);
        this.handleAuthenticationError('No se pudo determinar el rol del usuario para acceder al perfil');
        break;
    }
  }
}
