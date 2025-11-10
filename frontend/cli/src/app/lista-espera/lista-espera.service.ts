import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';
import { ListaEspera } from './lista-espera.model';

@Injectable({
  providedIn: 'root'
})
export class ListaEsperaService {
  private url = 'rest/lista-espera';

  constructor(private http: HttpClient) { }

  // Métodos CRUD básicos
  getAll(): Observable<DataPackage<ListaEspera[]>> {
    return this.http.get<DataPackage<ListaEspera[]>>(`${this.url}`);
  }

  getById(id: number): Observable<DataPackage<ListaEspera>> {
    return this.http.get<DataPackage<ListaEspera>>(`${this.url}/${id}`);
  }

  create(solicitud: ListaEspera): Observable<DataPackage<ListaEspera>> {
    const payload = { ...solicitud } as any;
    // El backend espera campo medicoPreferidoId según DTO
    if (payload.medicoId !== undefined) {
      payload.medicoPreferidoId = payload.medicoId;
      delete payload.medicoId;
    }
    return this.http.post<DataPackage<ListaEspera>>(`${this.url}`, payload);
  }

  update(id: number, solicitud: ListaEspera): Observable<DataPackage<ListaEspera>> {
    const payload = { ...solicitud } as any;
    if (payload.medicoId !== undefined) {
      payload.medicoPreferidoId = payload.medicoId;
      delete payload.medicoId;
    }
    return this.http.put<DataPackage<ListaEspera>>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<DataPackage<void>> {
    return this.http.delete<DataPackage<void>>(`${this.url}/${id}`);
  }

  // Métodos de búsqueda y filtrado
  getListaEspera(filtros: any): Observable<DataPackage<ListaEspera[]>> {
    let queryParams = '';
    if (filtros) {
      const params = [];
      if (filtros.especialidadId) params.push(`especialidadId=${filtros.especialidadId}`);
      if (filtros.centroAtencionId) params.push(`centroAtencionId=${filtros.centroAtencionId}`);
      if (filtros.medicoId) params.push(`medicoId=${filtros.medicoId}`);
      if (filtros.fechaDesde) params.push(`fechaDesde=${filtros.fechaDesde}`);
      if (filtros.fechaHasta) params.push(`fechaHasta=${filtros.fechaHasta}`);
      if (filtros.estado) params.push(`estado=${filtros.estado}`);
      if (filtros.urgenciaMedica) params.push(`urgenciaMedica=${filtros.urgenciaMedica}`);
      if (params.length > 0) {
        queryParams = '?' + params.join('&');
      }
    }
    return this.http.get<DataPackage<ListaEspera[]>>(`${this.url}/buscar${queryParams}`);
  }

  // Nota: el backend actual (ListaEsperaPresenter) no expone un endpoint '/page'
  // para paginación. El frontend usa '/buscar' con filtros para obtener listas.
  // Esta función queda por compatibilidad pero puede no funcionar si el
  // presenter no implementa '/page'. Usar preferentemente getListaEspera(filtros).
  getPaginated(page: number = 0, size: number = 10): Observable<DataPackage<any>> {
    return this.http.get<DataPackage<any>>(`${this.url}/page?page=${page}&size=${size}`);
  }

  getPendientes(): Observable<DataPackage<ListaEspera[]>> {
    return this.http.get<DataPackage<ListaEspera[]>>(`${this.url}/pendientes`);
  }

  getUrgentes(): Observable<DataPackage<ListaEspera[]>> {
    return this.http.get<DataPackage<ListaEspera[]>>(`${this.url}/urgentes`);
  }

  // Métodos de gestión de estado
  marcarComoResueltaManual(id: number): Observable<DataPackage<ListaEspera>> {
    return this.http.put<DataPackage<ListaEspera>>(`${this.url}/${id}/resolver-manual`, {});
  }

  cancelarExpiradas(): Observable<DataPackage<number>> {
    return this.http.post<DataPackage<number>>(`${this.url}/cancelar-expiradas`, {});
  }

  enviarRecordatorios(diasMinimos: number = 30): Observable<DataPackage<number>> {
    return this.http.post<DataPackage<number>>(`${this.url}/enviar-recordatorios`, { diasMinimos });
  }

  // Métodos de estadísticas
  getEstadisticasGenerales(): Observable<DataPackage<any>> {
    return this.http.get<DataPackage<any>>(`${this.url}/estadisticas`);
  }

  getEstadisticasDemanda(periodo: string = 'mes_actual'): Observable<DataPackage<any>> {
    return this.http.get<DataPackage<any>>(`${this.url}/estadisticas/demanda?periodo=${periodo}`);
  }
}