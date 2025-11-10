import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TurnoService } from './turno.service';
import { AuditLog, AuditFilter, AuditPage } from './turno';
import { DataPackage } from '../data.package';
import { TurnoModalComponent } from './turno-modal.component';

@Component({
  selector: 'app-audit-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TurnoModalComponent],
  templateUrl: './audit-dashboard.component.html',
  styleUrls: ['./audit-dashboard.component.css']
})
export class AuditDashboardComponent implements OnInit {

  // === DATOS DEL DASHBOARD ===
  auditStatistics: any = {};
  auditPage: AuditPage | null = null;
  loading: boolean = false;
  turnos: any[] = [];

  // === FILTROS AVANZADOS ===
  filters: AuditFilter = {
    page: 0,
    size: 10,
    sort: 'performedAt,desc'
  };

  // Controles de filtro
  dateFrom: string = '';
  dateTo: string = '';
  selectedAction: string = '';
  selectedUser: string = '';
  selectedEntityType: string = '';

  // === ORDENAMIENTO ===
  sortField: string = 'performedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // === OPCIONES PARA FILTROS ===
  availableActions: string[] = [
    'CREATE', 'UPDATE_STATUS', 'CANCEL', 'CONFIRM',
    'RESCHEDULE', 'COMPLETE', 'DELETE', 'LOGIN', 'LOGOUT'
  ];

  availableEntityTypes: string[] = [
    'TURNO', 'USUARIO', 'OPERADOR', 'CONSULTORIO',
    'CENTRO_ATENCION', 'ESPECIALIDAD', 'MEDICO'
  ];

  constructor(
    private turnoService: TurnoService,
    private router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /** Carga todos los datos del dashboard */
  loadDashboardData(): void {
    this.loading = true;

    // Cargar estadísticas y logs paginados en paralelo
    Promise.all([
      this.loadAuditStatistics(),
      this.loadAuditLogs(),
      this.loadUserStatistics(),
      this.loadTurnos()
    ]).finally(() => {
      this.loading = false;
    });
  }

  /** Carga estadísticas de auditoría */
  loadAuditStatistics(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Cargando estadísticas del dashboard...');
      this.turnoService.getDashboardStatistics().subscribe({
        next: (resp) => {
          const response = resp as any;
          console.log('Respuesta de estadísticas del dashboard:', response);
          if ((response.status && response.status === 1) || (response.status_code && response.status_code === 200)) {
            if (typeof response.data === 'object' && response.data !== null) {
              // Formato objeto dashboard
              this.auditStatistics = this.processDashboardStatistics(response.data);
            } else {
              this.auditStatistics = {};
            }
            console.log('Estadísticas procesadas:', this.auditStatistics);
          } else {
            console.warn('Estado de respuesta no exitoso:', response.status || response.status_code);
          }
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar estadísticas del dashboard:', error);
          reject(error);
        }
      });
    });
  }

  /** Carga logs de auditoría paginados con filtros */
  loadAuditLogs(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Cargando logs de auditoría paginados...', this.filters);
      this.turnoService.getAuditLogsPaged(this.filters).subscribe({
        next: (resp) => {
          const response = resp as any;
          console.log('Respuesta de logs paginados:', response);
          if ((response.status && response.status === 1) || (response.status_code && response.status_code === 200)) {
            this.auditPage = response.data || null;
            console.log('Página de auditoría procesada:', this.auditPage);
          } else {
            console.warn('Estado de respuesta no exitoso:', response.status || response.status_code);
            this.auditPage = null;
          }
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar logs paginados:', error);
          this.auditPage = null;
          reject(error);
        }
      });
    });
  }

  /** Carga todos los turnos del sistema */
  loadTurnos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.turnoService.all().subscribe({
        next: (resp) => {
          const response = resp as any;
          if ((response.status && response.status === 1) || (response.status_code && response.status_code === 200)) {
            this.turnos = response.data || [];
            console.log('Turnos cargados:', this.turnos.length);
          } else {
            console.warn('No se pudieron cargar los turnos:', response.status || response.status_code);
          }
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar turnos:', error);
          reject(error);
        }
      });
    });
  }

  /** Carga estadísticas de actividad por usuario */
  loadUserStatistics(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Si no tienes endpoint, simplemente resuelve vacío
      resolve();
    });
  }

  /** Procesa las estadísticas para mostrar (formato array legacy) */
  private processStatistics(data: any[]): any {
    const stats: any = {
      totalAcciones: 0,
      porAccion: {},
      porUsuario: {},
      resumen: {
        totalTurnos: 0,
        turnosModificados: 0,
        turnosCancelados: 0,
        turnosConfirmados: 0
      }
    };

    data.forEach(item => {
      if (Array.isArray(item) && item.length >= 2) {
        const key = item[0];
        const value = item[1];
        if (key.includes('ACTION_')) {
          stats.porAccion[key.replace('ACTION_', '')] = value;
          stats.totalAcciones += value;
        } else if (key.includes('USER_')) {
          stats.porUsuario[key.replace('USER_', '')] = value;
        }
      }
    });
    return stats;
  }

  /** Procesa las estadísticas para mostrar (formato objeto dashboard) */
  private processDashboardStatistics(data: any): any {
    console.log('Procesando estadísticas del dashboard:', data);
    
    const stats: any = {
      totalAcciones: 0,
      porAccion: {},
      porUsuario: {},
      resumen: {},
    };
    
    // Procesar actionStatistics (array de arrays)
    if (Array.isArray(data.actionStatistics)) {
      console.log('Procesando actionStatistics:', data.actionStatistics);
      data.actionStatistics.forEach((item: any) => {
        if (Array.isArray(item) && item.length >= 2) {
          const key = item[0];
          const value = item[1];
          const actionKey = key.replace('ACTION_', '');
          stats.porAccion[actionKey] = value;
          stats.totalAcciones += value;
          console.log(`Acción ${actionKey}: ${value}`);
        }
      });
    }
    
    // Procesar userStatistics (array de arrays)
    if (Array.isArray(data.userStatistics)) {
      console.log('Procesando userStatistics:', data.userStatistics);
      data.userStatistics.forEach((item: any) => {
        if (Array.isArray(item) && item.length >= 2) {
          const key = item[0];
          const value = item[1];
          stats.porUsuario[key] = value;
          console.log(`Usuario ${key}: ${value}`);
        }
      });
    }
    
    // Copiar cualquier otro resumen si existe
    Object.keys(data).forEach(key => {
      if (!['actionStatistics', 'userStatistics'].includes(key)) {
        stats.resumen[key] = data[key];
      }
    });
    
    console.log('Estadísticas procesadas finales:', stats);
    return stats;
  }

  /** Filtra los logs de la página actual (ya filtrados por backend) */
  get auditLogs(): AuditLog[] {
    return this.auditPage?.content || [];
  }

  /** Abre modal con información del turno */
  goToTurnoDetail(turnoId: number): void {
    this.turnoService.get(turnoId).subscribe({
      next: (response: DataPackage<any>) => {
        if (response.status_code === 200) {
          const modalRef = this.modalService.open(TurnoModalComponent, {
            size: 'lg',
            centered: true,
            backdrop: 'static'
          });
          modalRef.componentInstance.turno = response.data;
        } else {
          console.error('Error al obtener información del turno:', response.status_text);
        }
      },
      error: (error: any) => {
        console.error('Error al cargar información del turno:', error);
      }
    });
  }

  /** Navega a la búsqueda avanzada */
  goToAdvancedSearch(): void {
    this.router.navigate(['/turnos/advanced-search']);
  }

  /** Refresca los datos del dashboard */
  refreshData(): void {
    this.loadDashboardData();
  }

  // === MÉTODOS DE FILTRADO Y BÚSQUEDA ===

  /** Aplica los filtros y recarga los datos */
  applyFilters(): void {
    // Actualizar filtros desde controles
    this.filters.action = this.selectedAction || undefined;
    this.filters.user = this.selectedUser || undefined;
    this.filters.entityType = this.selectedEntityType || undefined;
    this.filters.dateFrom = this.dateFrom || undefined;
    this.filters.dateTo = this.dateTo || undefined;
    this.filters.page = 0; // Reset a primera página

    // Actualizar ordenamiento
    this.filters.sort = `${this.sortField},${this.sortDirection}`;

    console.log('Aplicando filtros:', this.filters);
    this.loadAuditLogs();
  }

  /** Limpia todos los filtros */
  clearFilters(): void {
    this.selectedAction = '';
    this.selectedUser = '';
    this.selectedEntityType = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.filters.page = 0;
    this.sortField = 'performedAt';
    this.sortDirection = 'desc';
    this.filters.sort = `${this.sortField},${this.sortDirection}`;

    // Limpiar filtros del objeto
    this.filters.action = undefined;
    this.filters.user = undefined;
    this.filters.entityType = undefined;
    this.filters.dateFrom = undefined;
    this.filters.dateTo = undefined;

    console.log('Filtros limpiados');
    this.loadAuditLogs();
  }

  // === MÉTODOS DE PAGINACIÓN ===

  /** Cambia a la página anterior */
  previousPage(): void {
    if (this.auditPage && this.filters.page! > 0) {
      this.filters.page!--;
      this.loadAuditLogs();
    }
  }

  /** Cambia a la página siguiente */
  nextPage(): void {
    if (this.auditPage && this.filters.page! < this.auditPage.totalPages - 1) {
      this.filters.page!++;
      this.loadAuditLogs();
    }
  }

  /** Cambia a una página específica */
  goToPage(page: number): void {
    if (this.auditPage && page >= 0 && page < this.auditPage.totalPages) {
      this.filters.page = page;
      this.loadAuditLogs();
    }
  }

  /** Cambia el tamaño de página */
  changePageSize(size: number): void {
    this.filters.size = size;
    this.filters.page = 0; // Reset a primera página
    this.loadAuditLogs();
  }

  // === MÉTODOS DE ORDENAMIENTO ===

  /** Ordena por una columna específica */
  sortBy(field: string): void {
    if (this.sortField === field) {
      // Cambiar dirección si es la misma columna
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Nueva columna, orden ascendente por defecto
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filters.sort = `${this.sortField},${this.sortDirection}`;
    this.filters.page = 0; // Reset a primera página
    this.loadAuditLogs();
  }

  /** Obtiene la clase CSS para el indicador de ordenamiento */
  getSortClass(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
  }

  /** Obtiene el icono de ordenamiento para una columna */
  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // === MÉTODOS AUXILIARES ===

  /** Formatea una fecha y hora para mostrar */
  formatDateTime(dateTimeString: string): string {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleString('es-ES');
  }

  /** Obtiene la clase CSS para el tipo de acción */
  getActionClass(action: string): string {
    const classes: any = {
      'CREATE': 'badge bg-info',
      'UPDATE_STATUS': 'badge bg-primary',
      'CANCEL': 'badge bg-danger',
      'CONFIRM': 'badge bg-success',
      'RESCHEDULE': 'badge bg-warning',
      'COMPLETE': 'badge bg-success',
      'DELETE': 'badge bg-dark'
    };
    return classes[action] || 'badge bg-secondary';
  }

  /** Obtiene el icono para el tipo de acción */
  getActionIcon(action: string): string {
    const icons: any = {
      'CREATE': 'fas fa-plus-circle',
      'UPDATE_STATUS': 'fas fa-edit',
      'CANCEL': 'fas fa-times-circle',
      'CONFIRM': 'fas fa-check-circle',
      'RESCHEDULE': 'fas fa-calendar-alt',
      'COMPLETE': 'fas fa-check-double',
      'DELETE': 'fas fa-trash'
    };
    return icons[action] || 'fas fa-question-circle';
  }

  /** Obtiene el icono Material Symbol para el tipo de acción */
  getActionIconMaterial(action: string): string {
    const icons: any = {
      'CREATE': 'add_circle',
      'UPDATE_STATUS': 'edit',
      'CANCEL': 'cancel',
      'CONFIRM': 'check_circle',
      'RESCHEDULE': 'event_repeat',
      'COMPLETE': 'task_alt',
      'DELETE': 'delete',
      'PROGRAMADO': 'event_available',
      'CONFIRMADO': 'check_circle',
      'CANCELADO': 'cancel',
      'ATENDIDO': 'task_alt',
      'AUSENTE': 'event_busy',
      'REPROGRAMADO': 'event_repeat'
    };
    return icons[action] || 'help';
  }

  /** Obtiene la clase del badge para el tipo de acción */
  getActionBadgeClass(action: string): string {
    const classes: any = {
      'CREATE': 'bg-info',
      'UPDATE_STATUS': 'bg-primary',
      'CANCEL': 'bg-danger',
      'CONFIRM': 'bg-success',
      'RESCHEDULE': 'bg-warning',
      'COMPLETE': 'bg-success',
      'DELETE': 'bg-dark',
      'PROGRAMADO': 'bg-warning',
      'CONFIRMADO': 'bg-success',
      'CANCELADO': 'bg-danger',
      'ATENDIDO': 'bg-success',
      'AUSENTE': 'bg-secondary',
      'REPROGRAMADO': 'bg-warning'
    };
    return classes[action] || 'bg-secondary';
  }

  /** Obtiene un array de las claves de un objeto */
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  /** Obtiene el porcentaje de una acción respecto al total */
  getActionPercentage(count: number): number {
    if (this.auditStatistics.totalAcciones === 0) return 0;
    return Math.round((count / this.auditStatistics.totalAcciones) * 100);
  }

  /** Obtiene el porcentaje de turnos respecto al total */
  getTurnoPercentage(count: number): number {
    if (this.totalTurnos === 0) return 0;
    return Math.round((count / this.totalTurnos) * 100);
  }

  /** Obtiene la clase de color para las barras de progreso */
  getProgressBarClass(action: string): string {
    const classes: any = {
      'CREATE': 'bg-info',
      'UPDATE_STATUS': 'bg-primary',
      'CANCEL': 'bg-danger',
      'CONFIRM': 'bg-success',
      'RESCHEDULE': 'bg-warning',
      'COMPLETE': 'bg-success',
      'DELETE': 'bg-dark'
    };
    return classes[action] || 'bg-secondary';
  }

  // === GETTERS PARA PAGINACIÓN ===

  /** Obtiene el rango de elementos mostrados */
  get pageRange(): string {
    if (!this.auditPage) return '';
    const start = this.auditPage.currentPage * this.auditPage.size + 1;
    const end = start + this.auditPage.numberOfElements - 1;
    return `${start}-${end} de ${this.auditPage.totalElements}`;
  }

  /** Genera array de números de página para el paginador */
  get pageNumbers(): number[] {
    if (!this.auditPage) return [];
    const pages: number[] = [];
    const totalPages = this.auditPage.totalPages;
    const currentPage = this.auditPage.currentPage;

    // Mostrar máximo 5 páginas alrededor de la actual
    let start = Math.max(0, currentPage - 2);
    let end = Math.min(totalPages - 1, currentPage + 2);

    // Ajustar para mostrar siempre 5 páginas si es posible
    if (end - start < 4 && totalPages > 4) {
      if (start === 0) {
        end = Math.min(totalPages - 1, start + 4);
      } else if (end === totalPages - 1) {
        start = Math.max(0, end - 4);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // === GETTERS PARA ESTADÍSTICAS DE TURNOS ===

  /** Obtiene el total de turnos */
  get totalTurnos(): number {
    return this.turnos.length;
  }

  /** Obtiene turnos agrupados por estado */
  get turnosPorEstado(): any {
    const estadisticas: any = {};
    
    this.turnos.forEach(turno => {
      const estado = turno.estado || 'SIN_ESTADO';
      estadisticas[estado] = (estadisticas[estado] || 0) + 1;
    });
    
    return estadisticas;
  }

  /** Obtiene turnos por especialidad */
  get turnosPorEspecialidad(): any {
    const estadisticas: any = {};
    
    this.turnos.forEach(turno => {
      const especialidad = turno.especialidadStaffMedico || 'Sin especialidad';
      estadisticas[especialidad] = (estadisticas[especialidad] || 0) + 1;
    });
    
    return estadisticas;
  }

  /** Obtiene turnos por centro de atención */
  get turnosPorCentro(): any {
    const estadisticas: any = {};
    
    this.turnos.forEach(turno => {
      const centro = turno.nombreCentro || 'Sin centro';
      estadisticas[centro] = (estadisticas[centro] || 0) + 1;
    });
    
    return estadisticas;
  }

  /** Método trackBy para optimizar el renderizado de la tabla */
  trackByLogId(index: number, log: AuditLog): any {
    return log.id || index;
  }

  /** Determina el tipo de entidad afectada por el log */
  getEntityType(log: AuditLog): string {
    // Usar entityType directamente del backend
    if (log.entityType) {
      return log.entityType;
    }

    // Fallback: Si tiene turno, es una entidad TURNO
    if (log.turno && log.turno.id) {
      return 'TURNO';
    }

    // Para otros tipos de entidades, intentar inferir del contexto
    // Esto podría expandirse basado en la lógica del backend
    if (log.oldValues || log.newValues) {
      // Intentar determinar el tipo basado en las propiedades
      const values = log.oldValues || log.newValues;
      if (values && typeof values === 'object') {
        if ('nombre' in values && 'especialidades' in values) return 'MEDICO';
        if ('nombre' in values && 'direccion' in values) return 'CENTRO_ATENCION';
        if ('numero' in values && 'piso' in values) return 'CONSULTORIO';
        if ('dni' in values && 'obraSocial' in values) return 'PACIENTE';
      }
    }

    return 'DESCONOCIDO';
  }
}
