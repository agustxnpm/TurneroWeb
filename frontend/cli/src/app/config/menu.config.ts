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
    icon: 'fa-user-injured',
    role: Role.PACIENTE,
    order: 1,
    items: [
      {
        label: 'Mi Dashboard',
        route: '/paciente-dashboard',
        icon: 'fa-tachometer-alt',
        description: 'Panel principal del paciente'
      },
      {
        label: 'Mi Agenda',
        route: '/paciente-agenda',
        icon: 'fa-calendar-alt',
        description: 'Ver mis turnos programados'
      },
      {
        label: 'Mis Notificaciones',
        route: '/paciente-notificaciones',
        icon: 'fa-bell',
        description: 'Notificaciones y alertas',
        badge: {
          value: 0, // Se actualiza dinámicamente
          color: 'danger'
        }
      },
      {
        label: 'Mi Perfil',
        route: '/paciente-perfil',
        icon: 'fa-user-circle',
        description: 'Datos personales y configuración',
        requiresPrimaryRole: true // Solo visible si el usuario es PACIENTE como rol primario
      }
    ]
  },

  // ========================================
  // SECCIÓN: MÉDICO
  // ========================================
  {
    id: 'medico',
    label: 'Panel de Médico',
    icon: 'fa-user-md',
    role: Role.MEDICO,
    order: 2,
    items: [
      {
        label: 'Mi Dashboard',
        route: '/medico-dashboard',
        icon: 'fa-tachometer-alt',
        description: 'Panel principal del médico'
      },
      {
        label: 'Mis Horarios',
        route: '/medico-horarios',
        icon: 'fa-clock',
        description: 'Gestionar disponibilidad'
      },
      {
        label: 'Estadísticas',
        route: '/medico-estadisticas',
        icon: 'fa-chart-bar',
        description: 'Métricas y reportes'
      },
      {
        label: 'Mi Perfil',
        route: '/medico-perfil',
        icon: 'fa-user-circle',
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
    icon: 'fa-user-cog',
    role: Role.OPERADOR,
    order: 3,
    items: [
      {
        label: 'Mi Dashboard',
        route: '/operador-dashboard',
        icon: 'fa-tachometer-alt',
        description: 'Panel principal del operador'
      },
      {
        label: 'Gestión de Turnos',
        route: '/turnos',
        icon: 'fa-calendar',
        description: 'Administrar turnos del sistema'
      },
      {
        label: 'Pacientes',
        route: '/pacientes',
        icon: 'fa-users',
        description: 'Gestionar pacientes'
      },
      {
        label: 'Mi Perfil',
        route: '/operador-perfil',
        icon: 'fa-user-circle',
        description: 'Configuración personal',
        requiresPrimaryRole: true // Solo visible si el usuario es OPERADOR como rol primario
      },
     /*  {
        label: 'Solicitar Turno',
        route: '/turnos/new',
        icon: 'fa-calendar-plus',
        description: 'Reservar un nuevo turno médico'
      } */
      {
        label: 'Agenda de turnos',
        route: '/agenda',
        icon: 'fa-calendar-plus',
        description: 'Reservar un nuevo turno médico'
      }
    ]
  },


  // ========================================
  // SECCIÓN: ADMINISTRADOR
  // ========================================
  {
    id: 'administrador',
    label: 'Panel de Administración',
    icon: 'fa-shield-alt',
    role: Role.ADMINISTRADOR,
    order: 4,
    items: [
      {
        label: 'Dashboard',
        route: '/admin-dashboard',
        icon: 'fa-tachometer-alt',
        description: 'Panel de control administrativo'
      },
      {
        label: 'Centros de Atención',
        route: '/centrosAtencion',
        icon: 'fa-hospital',
        description: 'Gestionar centros médicos'
      },
      {
        label: 'Consultorios',
        route: '/consultorios',
        icon: 'fa-door-open',
        description: 'Administrar consultorios'
      },
      {
        label: 'Especialidades',
        route: '/especialidades',
        icon: 'fa-stethoscope',
        description: 'Gestionar especialidades médicas'
      },
      {
        label: 'Médicos',
        route: '/medicos',
        icon: 'fa-user-md',
        description: 'Administrar médicos'
      },
      {
        label: 'Staff Médico',
        route: '/staffMedico',
        icon: 'fa-id-badge',
        description: 'Asignaciones y vinculaciones'
      },
      {
        label: 'Disponibilidad',
        route: '/disponibilidades-medico',
        icon: 'fa-calendar-check',
        description: 'Horarios disponibles'
      },
      {
        label: 'Esquemas de Turno',
        route: '/esquema-turno',
        icon: 'fa-calendar-alt',
        description: 'Configurar esquemas'
      },
      {
        label: 'Obras Sociales',
        route: '/obraSocial',
        icon: 'fa-briefcase-medical',
        description: 'Gestionar obras sociales'
      },
       {
        label: 'Operadores',
        route: '/operadores',
        icon: 'fa-user-circle',
        description: 'Operadores',
      },
      {
        divider: true,
        label: '',
        icon: ''
      },
      {
        label: 'Mi Perfil',
        route: '/admin-perfil',
        icon: 'fa-user-circle',
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
    icon: 'fa-building',
    role: Role.OPERADOR, // Solo para operadores
    order: 6, // Después del panel de operador
    items: [
      {
        label: 'Centros de Atención',
        route: '/centrosAtencion',
        icon: 'fa-hospital',
        description: 'Ver centros médicos'
      },
      {
        label: 'Consultorios',
        route: '/consultorios',
        icon: 'fa-door-open',
        description: 'Ver consultorios'
      },
      {
        label: 'Especialidades',
        route: '/especialidades',
        icon: 'fa-stethoscope',
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
    icon: 'fa-home',
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
