import { Role } from '../inicio-sesion/auth.service';

/**
 * Interfaz para un item individual del menú
 */
export interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  action?: () => void;
  badge?: {
    value: number | string;
    color: 'primary' | 'danger' | 'warning' | 'success' | 'info';
  };
  divider?: boolean;
  description?: string;
  children?: MenuItem[];
  requiresPrimaryRole?: boolean; // Si true, solo se muestra cuando el usuario tiene el rol de la sección como rol primario
}

/**
 * Interfaz para una sección del menú asociada a un rol
 */
export interface MenuSection {
  id: string;
  label: string;
  icon: string;
  role: Role;
  order: number; // Para ordenar secciones
  items: MenuItem[];
}

/**
 * Configuración centralizada del menú por roles
 * 
 * IMPORTANTE: Las secciones se mostrarán solo si el usuario tiene el rol correspondiente
 * según userContext.allRoles (incluyendo roles heredados).
 */
export const MENU_CONFIG: MenuSection[] = [

  // ========================================
  // SECCIÓN: PACIENTE
  // ========================================
  {
    id: 'paciente',
    label: 'Panel de Paciente',
    icon: 'personal_injury',
    role: Role.PACIENTE,
    order: 1,
    items: [
      {
        label: 'Mi Dashboard',
        route: '/paciente-dashboard',
        icon: 'dashboard',
        description: 'Panel principal del paciente'
      },
      {
        label: 'Mi Agenda',
        route: '/paciente-agenda',
        icon: 'calendar_month',
        description: 'Ver mis turnos programados'
      },
      {
        label: 'Mi Historial',
        route: '/paciente-historial',
        icon: 'history',
        description: 'Ver historial de atenciones médicas'
      },
      {
        label: 'Mis Notificaciones',
        route: '/paciente-notificaciones',
        icon: 'notifications',
        description: 'Notificaciones y alertas',
        badge: {
          value: 0, // Se actualiza dinámicamente
          color: 'danger'
        }
      },
      {
        label: 'Mi Perfil',
        route: '/paciente-perfil',
        icon: 'account_circle',
        description: 'Datos personales y configuración',
        requiresPrimaryRole: true // Solo visible si el usuario es PACIENTE como rol primario
      },
      {
        label: 'Lista de Espera',
        route: '/lista-espera-form',
        icon: 'schedule',
        description: 'Agregarme a lista de espera de pacientes'
      }
    ]
  },

  // ========================================
  // SECCIÓN: MÉDICO
  // ========================================
  {
    id: 'medico',
    label: 'Panel de Médico',
    icon: 'medical_services',
    role: Role.MEDICO,
    order: 2,
    items: [
      {
        label: 'Mi Dashboard',
        route: '/medico-dashboard',
        icon: 'dashboard',
        description: 'Panel principal del médico'
      },
      {
        label: 'Mis Horarios',
        route: '/medico-horarios',
        icon: 'schedule',
        description: 'Gestionar disponibilidad'
      },
      {
        label: 'Estadísticas',
        route: '/medico-estadisticas',
        icon: 'bar_chart',
        description: 'Métricas y reportes'
      },
      {
        label: 'Sobreturnos',
        route: '/turnos/new',
        icon: 'event_busy',
        description: 'Registrar sobreturno manual (fuera de agenda)'
      },
      {
        label: 'Mi Perfil',
        route: '/medico-perfil',
        icon: 'account_circle',
        description: 'Datos profesionales',
        requiresPrimaryRole: true // Solo visible si el usuario es MEDICO como rol primario
      }
    ]
  },

  // ========================================
  // SECCIÓN: OPERADOR
  // ========================================
  {
    id: 'operador',
    label: 'Panel de Operador',
    icon: 'admin_panel_settings',
    role: Role.OPERADOR,
    order: 3,
    items: [
      {
        label: 'Mi Dashboard',
        route: '/operador-dashboard',
        icon: 'dashboard',
        description: 'Panel principal del operador'
      },
      {
        label: 'Gestión de Turnos',
        route: '/turnos',
        icon: 'event',
        description: 'Administrar turnos del sistema'
      },
      {
        label: 'Sobreturnos',
        route: '/turnos/new',
        icon: 'event_busy',
        description: 'Registrar sobreturno manual (fuera de agenda)'
      },
      {
        label: 'Pacientes',
        route: '/pacientes',
        icon: 'group',
        description: 'Gestionar pacientes'
      },
      {
        label: 'Mi Perfil',
        route: '/operador-perfil',
        icon: 'account_circle',
        description: 'Configuración personal',
        requiresPrimaryRole: true // Solo visible si el usuario es OPERADOR como rol primario
      },
      /*  {
         label: 'Solicitar Turno',
         route: '/turnos/new',
         icon: 'add_box',
         description: 'Reservar un nuevo turno médico'
       } */
      {
        label: 'Agenda de turnos',
        route: '/agenda',
        icon: 'event_note',
        description: 'Reservar un nuevo turno médico'
      },
      {
        label: 'Lista de Espera',
        route: '/lista-espera',
        icon: 'pending_actions',
        description: 'Gestionar lista de espera de pacientes'
      },
      {
        label: 'Estadísticas Lista Espera', // 👈 NUEVO
        route: '/lista-espera-estadisticas',
        icon: 'trending_up',
        description: 'Métricas y análisis de lista de espera'
      }
    ]
  },


  // ========================================
  // SECCIÓN: ADMINISTRADOR
  // ========================================
  {
    id: 'administrador',
    label: 'Panel de Administración',
    icon: 'shield',
    role: Role.ADMINISTRADOR,
    order: 4,
    items: [
      {
        label: 'Dashboard',
        route: '/admin-dashboard',
        icon: 'dashboard',
        description: 'Panel de control administrativo'
      },
      {
        label: 'Panel Auditoria',
        route: '/turnos/audit-dashboard',
        icon: 'policy',
        description: 'Panel de control administrativo'
      },

      {
        label: 'Centros de Atención',
        route: '/centrosAtencion',
        icon: 'local_hospital',
        description: 'Gestionar centros médicos'
      },
      {
        label: 'Consultorios',
        route: '/consultorios',
        icon: 'meeting_room',
        description: 'Administrar consultorios'
      },
      {
        label: 'Especialidades',
        route: '/especialidades',
        icon: 'medical_information',
        description: 'Gestionar especialidades médicas'
      },
      {
        label: 'Médicos',
        route: '/medicos',
        icon: 'medical_services',
        description: 'Administrar médicos'
      },
      {
        label: 'Staff Médico',
        route: '/staffMedico',
        icon: 'badge',
        description: 'Asignaciones y vinculaciones'
      },
      {
        label: 'Disponibilidad',
        route: '/disponibilidades-medico',
        icon: 'event_available',
        description: 'Horarios disponibles'
      },
      {
        label: 'Esquemas de Turno',
        route: '/esquema-turno',
        icon: 'calendar_view_month',
        description: 'Configurar esquemas'
      },
      {
        label: 'Obras Sociales',
        route: '/obraSocial',
        icon: 'health_and_safety',
        description: 'Gestionar obras sociales'
      },
      {
        label: 'Operadores',
        route: '/operadores',
        icon: 'support_agent',
        description: 'Operadores',
      },
      {
        label: 'Gestionar Admins',
        route: '/admin/users',
        icon: 'admin_panel_settings',
        description: 'Crear y administrar cuentas de administrador'
      },
      {
        label: 'Estadísticas Lista Espera',
        route: '/lista-espera-estadisticas',
        icon: 'trending_up',
        description: 'Métricas y análisis de lista de espera'
      },
      {
        label: 'Metricas',
        route: '/dashboard-gestion',
        icon: 'leaderboard',
        description: 'Métricas y análisis de gestión'
      },
      {
        label: 'Encuestas',
        route: '/admin/gestion-encuestas',
        icon: 'assignment',
        description: 'Crear y gestionar encuestas para pacientes'
      },
      {
        divider: true,
        label: '',
        icon: ''
      },
      {
        label: 'Mi Perfil',
        route: '/admin-perfil',
        icon: 'account_circle',
        description: 'Perfil de administrador',
        requiresPrimaryRole: true // Solo visible si el usuario es ADMINISTRADOR como rol primario
      }

    ]
  },

  // ========================================
  // SECCIÓN: GESTIÓN GENERAL (solo para OPERADOR)
  // ========================================
  // Esta sección solo se muestra para usuarios con rol OPERADOR
  // Los administradores ya tienen estas opciones en su panel principal
  {
    id: 'gestion',
    label: 'Gestión General',
    icon: 'apartment',
    role: Role.OPERADOR, // Solo para operadores
    order: 6, // Después del panel de operador
    items: [
      {
        label: 'Centros de Atención',
        route: '/centrosAtencion',
        icon: 'local_hospital',
        description: 'Ver centros médicos'
      },
      {
        label: 'Consultorios',
        route: '/consultorios',
        icon: 'meeting_room',
        description: 'Ver consultorios'
      },
      {
        label: 'Especialidades',
        route: '/especialidades',
        icon: 'medical_information',
        description: 'Ver especialidades'
      }
    ]
  }
];

/**
 * Configuración de funcionalidades compartidas que no dependen de roles específicos
 * (se muestran a todos los usuarios autenticados)
 */
export const SHARED_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Inicio',
    route: '/',
    icon: 'home',
    description: 'Página principal'
  }
];

/**
 * Helper para obtener secciones de menú para un conjunto de roles
 * @param userRoles Roles del usuario actual
 * @returns Secciones de menú filtradas y ordenadas
 */
export function getMenuSectionsForRoles(userRoles: Role[]): MenuSection[] {
  return MENU_CONFIG
    .filter(section => userRoles.includes(section.role))
    .sort((a, b) => a.order - b.order);
}

/**
 * Helper para obtener todos los items de menú sin duplicados
 * (útil para búsqueda o navegación global)
 * @param userRoles Roles del usuario actual
 * @returns Lista de items únicos
 */
export function getAllMenuItems(userRoles: Role[]): MenuItem[] {
  const sections = getMenuSectionsForRoles(userRoles);
  const itemsMap = new Map<string, MenuItem>();

  sections.forEach(section => {
    section.items.forEach(item => {
      if (item.route && !itemsMap.has(item.route)) {
        itemsMap.set(item.route, item);
      }
    });
  });

  return Array.from(itemsMap.values());
}

/**
 * Helper para verificar si una ruta está en el menú del usuario
 * @param route Ruta a verificar
 * @param userRoles Roles del usuario
 * @returns true si el usuario tiene acceso a esa ruta según el menú
 */
export function isRouteInUserMenu(route: string, userRoles: Role[]): boolean {
  const allItems = getAllMenuItems(userRoles);
  return allItems.some(item => item.route === route);
}
