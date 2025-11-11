import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';
import { environment } from '../../environments/environment';

// Interfaces para el sistema de auditoría
export interface AuditLog {
  id: number;
  entityType?: string;
  entityId?: number;
  action: string;
  performedBy: string;
  performedAt: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  oldValues?: string;
  newValues?: string;
  reason?: string;
  turno?: any; // Para compatibilidad con logs de turnos
}

export interface AuditPage {
  content: AuditLog[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
  sortBy: string;
  sortDir: string;
}

export interface AuditQueryParams {
  page?: number;
  size?: number;
  entidad?: string;
  usuario?: string;
  tipoAccion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  sortBy?: string;
  sortDir?: string;
}

interface AuditStatistics {
  turnosCreados: number;
  turnosConfirmados: number;
  turnosCancelados: number;
  turnosReagendados: number;
  turnosModificados: number;
  totalAcciones: number;
}

interface UserActivityStat {
  user: string;
  totalActions: number;
  actionBreakdown: { [action: string]: number };
}

interface DashboardStatistics extends AuditStatistics {
  actionStatistics: any[];
  userStatistics: any[];
}

/**
 * Servicio para gestionar consultas de auditoría del sistema TurneroWeb.
 *
 * Proporciona métodos para consultar logs de auditoría con filtros avanzados,
 * paginación y ordenamiento. Todas las respuestas están tipadas usando
 * DataPackage<T> para mantener consistencia con el resto de la aplicación.
 *
 * @example
 * // Consulta básica con paginación
 * const params: AuditQueryParams = { page: 0, size: 20 };
 * this.auditService.getAuditLogs(params).subscribe(response => {
 *   console.log('Página actual:', response.data.currentPage);
 *   console.log('Total de elementos:', response.data.totalElements);
 *   console.log('Logs:', response.data.content);
 * });
 *
 * @example
 * // Consulta con filtros y ordenamiento
 * const params: AuditQueryParams = {
 *   entidad: 'MEDICO',
 *   usuario: 'admin',
 *   tipoAccion: 'CREATE',
 *   fechaDesde: '2024-01-01T00:00:00',
 *   fechaHasta: '2024-12-31T23:59:59',
 *   page: 0,
 *   size: 10,
 *   sortBy: 'performedAt',
 *   sortDir: 'DESC'
 * };
 * this.auditService.getAuditLogs(params).subscribe(response => {
 *   // Procesar respuesta paginada
 * });
 */
@Injectable({
  providedIn: 'root'
})
export class AuditService {

  private baseUrl = environment.production ? `${environment.apiUrl}/audit` : 'rest/audit';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene logs de auditoría con filtros avanzados, paginación y ordenamiento
   * @param params Parámetros de consulta para filtrar, paginar y ordenar
   * @returns Observable con la respuesta tipada usando DataPackage<AuditPage>
   */
  getAuditLogs(params: AuditQueryParams): Observable<DataPackage<AuditPage>> {
    let httpParams = new HttpParams();

    // Paginación
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }

    // Filtros
    if (params.entidad && params.entidad.trim()) {
      httpParams = httpParams.set('entidad', params.entidad.trim());
    }
    if (params.usuario && params.usuario.trim()) {
      httpParams = httpParams.set('usuario', params.usuario.trim());
    }
    if (params.tipoAccion && params.tipoAccion.trim()) {
      httpParams = httpParams.set('tipoAccion', params.tipoAccion.trim());
    }
    if (params.fechaDesde) {
      httpParams = httpParams.set('fechaDesde', params.fechaDesde);
    }
    if (params.fechaHasta) {
      httpParams = httpParams.set('fechaHasta', params.fechaHasta);
    }

    // Ordenamiento
    if (params.sortBy && params.sortBy.trim()) {
      httpParams = httpParams.set('sortBy', params.sortBy.trim());
    }
    if (params.sortDir && (params.sortDir === 'ASC' || params.sortDir === 'DESC')) {
      httpParams = httpParams.set('sortDir', params.sortDir);
    }

    return this.http.get<DataPackage<AuditPage>>(`${this.baseUrl}/page`, { params: httpParams });
  }

  /**
   * Obtiene logs de auditoría recientes (últimas 24 horas) con paginación
   * @param page Número de página (default: 0)
   * @param size Tamaño de página (default: 20)
   */
  getRecentAuditLogs(page: number = 0, size: number = 20): Observable<DataPackage<AuditPage>> {
    const params: AuditQueryParams = {
      page,
      size,
      sortBy: 'performedAt',
      sortDir: 'DESC'
    };
    return this.getAuditLogs(params);
  }

  /**
   * Obtiene logs de auditoría filtrados por usuario
   * @param usuario Nombre del usuario
   * @param page Número de página (default: 0)
   * @param size Tamaño de página (default: 20)
   */
  getAuditLogsByUser(usuario: string, page: number = 0, size: number = 20): Observable<DataPackage<AuditPage>> {
    const params: AuditQueryParams = {
      usuario,
      page,
      size,
      sortBy: 'performedAt',
      sortDir: 'DESC'
    };
    return this.getAuditLogs(params);
  }

  /**
   * Obtiene logs de auditoría filtrados por tipo de acción
   * @param tipoAccion Tipo de acción (CREATE, UPDATE, DELETE, etc.)
   * @param page Número de página (default: 0)
   * @param size Tamaño de página (default: 20)
   */
  getAuditLogsByAction(tipoAccion: string, page: number = 0, size: number = 20): Observable<DataPackage<AuditPage>> {
    const params: AuditQueryParams = {
      tipoAccion,
      page,
      size,
      sortBy: 'performedAt',
      sortDir: 'DESC'
    };
    return this.getAuditLogs(params);
  }

  /**
   * Obtiene logs de auditoría filtrados por entidad
   * @param entidad Tipo de entidad (MEDICO, PACIENTE, TURNO, etc.)
   * @param page Número de página (default: 0)
   * @param size Tamaño de página (default: 20)
   */
  getAuditLogsByEntity(entidad: string, page: number = 0, size: number = 20): Observable<DataPackage<AuditPage>> {
    const params: AuditQueryParams = {
      entidad,
      page,
      size,
      sortBy: 'performedAt',
      sortDir: 'DESC'
    };
    return this.getAuditLogs(params);
  }

  /**
   * Obtiene logs de auditoría recientes (últimas 24 horas) sin paginación
   * Útil para dashboards o vistas simples
   */
  getRecentLogsSimple(): Observable<any> {
    return this.http.get(`${this.baseUrl}/recientes`);
  }

  /**
   * Obtiene el historial de auditoría de una entidad específica
   * @param entityType Tipo de entidad (TURNO, MEDICO, PACIENTE, etc.)
   * @param entityId ID de la entidad
   */
  getEntityAuditHistory(entityType: string, entityId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/entidad/${entityType}/${entityId}`);
  }

  /**
   * Obtiene estadísticas de auditoría por entidad
   */
  getEntityAuditStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/estadisticas/entidad`);
  }

  /**
   * Obtiene estadísticas completas del dashboard
   */
  getDashboardStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard`);
  }

  /**
   * Obtiene estadísticas de actividad por usuario
   */
  getUserActivityStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/users/activity`);
  }

  /**
   * Obtiene logs de auditoría de un usuario específico (médico)
   */
  getLogsByUser(username: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${username}`);
  }

  /**
   * Obtiene logs de auditoría por acción específica
   */
  getLogsByAction(action: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/action/${action}`);
  }

  /**
   * Obtiene logs de auditoría en un rango de fechas
   */
  getLogsByDateRange(startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    return this.http.get(`${this.baseUrl}/date-range`, { params });
  }

  /**
   * Obtiene el historial de auditoría de un turno específico
   */
  getTurnoAuditHistory(turnoId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/turno/${turnoId}`);
  }

  /**
   * Obtiene estadísticas por acción
   */
  getActionStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/statistics`);
  }

  /**
   * Procesa los datos de auditoría para generar estadísticas de un médico específico
   */
  processMedicoStatistics(logs: any[], medicoUsername: string, period?: string): any {
    const filteredLogs = logs.filter(log => 
      log.performedBy === medicoUsername &&
      (period ? this.isInPeriod(log.performedAt, period) : true)
    );

    const stats = {
      turnosCreados: 0,
      turnosConfirmados: 0,
      turnosCancelados: 0,
      turnosReagendados: 0,
      turnosModificados: 0,
      pacientesAtendidos: new Set(),
      horasTrabajadas: 0,
      periodo: period || 'todos',
      totalAcciones: filteredLogs.length
    };

    filteredLogs.forEach(log => {
      switch (log.action) {
        case 'CREATE':
          stats.turnosCreados++;
          break;
        case 'STATUS_CHANGE':
          if (log.estadoNuevo === 'CONFIRMADO' || log.estadoNuevo === 'COMPLETO') {
            stats.turnosConfirmados++;
            // Estimar 45 minutos por turno confirmado/completado
            stats.horasTrabajadas += 0.75;
          } else if (log.estadoNuevo === 'CANCELADO') {
            stats.turnosCancelados++;
          }
          stats.turnosModificados++;
          break;
        case 'RESCHEDULE':
          stats.turnosReagendados++;
          break;
      }

      // Contar pacientes únicos (si hay datos del turno)
      if (log.turno && log.turno.paciente) {
        stats.pacientesAtendidos.add(log.turno.paciente.id);
      }
    });

    return {
      ...stats,
      pacientesAtendidos: stats.pacientesAtendidos.size,
      tasaCancelacion: stats.turnosCreados > 0 ? 
        (stats.turnosCancelados / stats.turnosCreados * 100).toFixed(2) : 0
    };
  }

  /**
   * Verifica si una fecha está dentro del período especificado
   */
  private isInPeriod(dateTime: string, period: string): boolean {
    const logDate = new Date(dateTime);
    const now = new Date();
    
    switch (period) {
      case 'semana_actual':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6));
        return logDate >= startOfWeek && logDate <= endOfWeek;
      
      case 'mes_actual':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return logDate >= startOfMonth && logDate <= endOfMonth;
      
      case 'trimestre':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
        const endOfQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        return logDate >= startOfQuarter && logDate <= endOfQuarter;
      
      case 'ano_actual':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        return logDate >= startOfYear && logDate <= endOfYear;
      
      default:
        return true;
    }
  }

  /**
   * Genera datos de evolución temporal basados en logs de auditoría
   */
  generateEvolutionData(logs: any[], period: string): any[] {
    const groupedData = new Map();
    const now = new Date();
    
    logs.forEach(log => {
      const logDate = new Date(log.performedAt);
      let key: string;
      
      switch (period) {
        case 'semana_actual':
          key = logDate.toLocaleDateString('es-ES', { weekday: 'short' });
          break;
        case 'mes_actual':
          key = logDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
          break;
        case 'trimestre':
        case 'ano_actual':
          key = logDate.toLocaleDateString('es-ES', { month: 'short' });
          break;
        default:
          key = logDate.toLocaleDateString('es-ES');
      }
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          periodo: key,
          turnosRealizados: 0,
          turnosCancelados: 0,
          pacientesAtendidos: new Set(),
          horasTrabajadas: 0
        });
      }
      
      const dayData = groupedData.get(key);
      
      if (log.action === 'STATUS_CHANGE') {
        if (log.estadoNuevo === 'CONFIRMADO' || log.estadoNuevo === 'COMPLETO') {
          dayData.turnosRealizados++;
          dayData.horasTrabajadas += 0.75;
        } else if (log.estadoNuevo === 'CANCELADO') {
          dayData.turnosCancelados++;
        }
      }
      
      if (log.turno && log.turno.paciente) {
        dayData.pacientesAtendidos.add(log.turno.paciente.id);
      }
    });
    
    // Convertir Set a número
    return Array.from(groupedData.values()).map(data => ({
      ...data,
      pacientesAtendidos: data.pacientesAtendidos.size
    }));
  }
}
