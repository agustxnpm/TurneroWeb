import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface NotificacionDTO {
  id: number;
  pacienteId: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  tipoDescripcion: string;
  tipoCategoria: string;
  leida: boolean;
  fechaCreacion: string;
  fechaLeida?: string;
  turnoId?: number;
  usuarioCreador: string;
  fechaCreacionFormateada?: string;
  fechaLeidaFormateada?: string;
  esNueva: boolean;
  iconoTipo: string;
}

export interface PageNotificacion {
  content: NotificacionDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  private baseUrl = 'rest/notificaciones';
  
  // Subject para el contador de notificaciones no leídas
  private contadorNoLeidasSubject = new BehaviorSubject<number>(0);
  public contadorNoLeidas$ = this.contadorNoLeidasSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las notificaciones de un paciente (paginadas)
   */
  obtenerNotificacionesPorPaciente(pacienteId: number, page: number = 0, size: number = 10): Observable<PageNotificacion> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<PageNotificacion>(`${this.baseUrl}/paciente/${pacienteId}`, { params });
  }

  /**
   * Obtener notificaciones no leídas de un paciente
   */
  obtenerNotificacionesNoLeidas(pacienteId: number): Observable<NotificacionDTO[]> {
    return this.http.get<NotificacionDTO[]>(`${this.baseUrl}/paciente/${pacienteId}/no-leidas`);
  }

  /**
   * Contar notificaciones no leídas de un paciente
   */
  contarNotificacionesNoLeidas(pacienteId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/paciente/${pacienteId}/count-no-leidas`)
      .pipe(
        tap(count => this.contadorNoLeidasSubject.next(count))
      );
  }

  /**
   * Marcar una notificación como leída
   */
  marcarComoLeida(notificacionId: number, pacienteId: number): Observable<void> {
    const params = new HttpParams().set('pacienteId', pacienteId.toString());
    return this.http.put<void>(`${this.baseUrl}/${notificacionId}/marcar-leida`, null, { params })
      .pipe(
        tap(() => {
          // Actualizar contador después de marcar como leída
          this.actualizarContador(pacienteId);
        })
      );
  }

  /**
   * Marcar todas las notificaciones de un paciente como leídas
   */
  marcarTodasComoLeidas(pacienteId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/paciente/${pacienteId}/marcar-todas-leidas`, null)
      .pipe(
        tap(() => {
          // Resetear contador después de marcar todas como leídas
          this.contadorNoLeidasSubject.next(0);
        })
      );
  }

  /**
   * Eliminar una notificación
   */
  eliminarNotificacion(notificacionId: number, pacienteId: number): Observable<void> {
    const params = new HttpParams().set('pacienteId', pacienteId.toString());
    return this.http.delete<void>(`${this.baseUrl}/${notificacionId}`, { params })
      .pipe(
        tap(() => {
          // Actualizar contador después de eliminar
          this.actualizarContador(pacienteId);
        })
      );
  }

  /**
   * Actualizar el contador de notificaciones no leídas
   */
  actualizarContador(pacienteId: number): void {
    this.contarNotificacionesNoLeidas(pacienteId).subscribe();
  }

  /**
   * Formatear fecha para mostrar en la UI
   */
  formatearFecha(fecha: string): string {
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diffTime = Math.abs(ahora.getTime() - fechaObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Hoy ' + fechaObj.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 2) {
      return 'Ayer ' + fechaObj.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays <= 7) {
      return `Hace ${diffDays - 1} días`;
    } else {
      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  /**
   * Obtener clase CSS según el tipo de notificación
   */
  obtenerClaseTipo(tipo: string): string {
    switch (tipo) {
      case 'CONFIRMACION':
        return 'text-success';
      case 'CANCELACION':
        return 'text-danger';
      case 'REAGENDAMIENTO':
        return 'text-warning';
      case 'RECORDATORIO':
        return 'text-info';
      case 'NUEVO_TURNO':
        return 'text-success';
      case 'URGENTE':
        return 'text-danger';
      default:
        return 'text-primary';
    }
  }
}
