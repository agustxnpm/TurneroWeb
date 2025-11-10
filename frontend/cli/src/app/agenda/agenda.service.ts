import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DataPackage } from '../data.package';
import { Agenda } from './agenda';

@Injectable({
  providedIn: 'root',
})
export class AgendaService {
  private url = 'rest/agenda'; // Base URL del backend

  constructor(private http: HttpClient) { }

  get(id: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/${id}`);
  }

  save(agenda: Agenda): Observable<DataPackage> {
    return agenda.id
      ? this.http.put<DataPackage>(this.url, agenda)
      : this.http.post<DataPackage>(this.url, agenda);
  }

  byPage(page: number, size: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/page?page=${page - 1}&size=${size}`);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  search(term: string): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/search/${term}`);
  }

  // --- Métodos adicionales útiles ---

  // Obtener agendas por médico
  byMedico(medicoId: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/medico/${medicoId}`);
  }

  // Obtener agendas por especialidad
  byEspecialidad(especialidadId: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/especialidad/${especialidadId}`);
  }

  // Obtener agendas por centro de atención
  byCentro(centroId: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/centro/${centroId}`);
  }

  // Cambiar estado de una agenda (ejemplo)
  cambiarEstado(id: number, estado: string): Observable<DataPackage> {
    return this.http.patch<DataPackage>(`${this.url}/${id}/estado`, { estado });
  }

  // Obtener todas las agendas (sin paginar)
  getAll(): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/all`);
  }



  // Método para obtener eventos generados desde el backend
  obtenerEventos(esquemaTurnoId: number, semanas: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/eventos?esquemaTurnoId=${esquemaTurnoId}&semanas=${semanas}`);
  }
  // Obtener todos los eventos (con filtros opcionales) - AGENDA PRIVADA
  obtenerTodosLosEventos(semanas: number, filtros?: {
    especialidad?: string;
    staffMedicoId?: number;
    centroId?: number;
    filtrarPorPreferencia?: boolean;
  }): Observable<any[]> {
    let url = `${this.url}/eventos/todos?semanas=${semanas}`;
    
    // Agregar filtros como parámetros de consulta
    if (filtros) {
      if (filtros.especialidad) {
        url += `&especialidad=${encodeURIComponent(filtros.especialidad)}`;
      }
      if (filtros.staffMedicoId) {
        url += `&staffMedicoId=${filtros.staffMedicoId}`;
      }
      if (filtros.centroId) {
        url += `&centroId=${filtros.centroId}`;
      }
      if (filtros.filtrarPorPreferencia === true) {
        url += `&filtrarPorPreferencia=true`;
        console.log('🕐 [AgendaService] Filtrado por preferencias horarias ACTIVADO en agenda privada');
      }
    }
    
    console.log('🌐 Llamando a agenda service:', url);
    return this.http.get<any[]>(url);
  }

  // Método para obtener slots disponibles por médico
  obtenerSlotsDisponiblesPorMedico(staffMedicoId: number, semanas: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/slots-disponibles/${staffMedicoId}?semanas=${semanas}`);
  }

  /**
   * Obtiene la agenda pública sin requerir autenticación
   * @param centroId (opcional) ID del centro de atención para filtrar
   * @param especialidad (opcional) Nombre de la especialidad para filtrar
   * @param staffMedicoId (opcional) ID del staff médico para filtrar
   * @returns Observable con los eventos de la agenda pública
   */
  getAgendaPublica(
    centroId?: number, 
    especialidad?: string, 
    staffMedicoId?: number
  ): Observable<any> {
    let params = new HttpParams();
    
    if (centroId) {
      params = params.append('centroId', centroId.toString());
    }
    if (especialidad) {
      params = params.append('especialidad', especialidad);
    }
    if (staffMedicoId) {
      params = params.append('staffMedicoId', staffMedicoId.toString());
    }
    
    console.log('🌐 [AgendaService] Llamando /publica con params:', params.toString());
    return this.http.get(`${this.url}/publica`, { params });
  }

}