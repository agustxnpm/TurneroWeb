import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';
import { CentroEspecialidad } from './centro-especialidad';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CentroEspecialidadService {
  private baseUrl = environment.production ? `${environment.apiUrl}/centrosAtencion` : 'rest/centrosAtencion';

  constructor(private http: HttpClient) {}

  // Obtener todas las relaciones centro-especialidad
  all(): Observable<DataPackage<CentroEspecialidad[]>> {
    return this.http.get<DataPackage<CentroEspecialidad[]>>(`${this.baseUrl}/centro-especialidad`);
  }

  // Obtener especialidades disponibles para un centro específico
  getEspecialidadesPorCentro(centroId: number): Observable<DataPackage<CentroEspecialidad[]>> {
    return this.http.get<DataPackage<CentroEspecialidad[]>>(`${this.baseUrl}/centro/${centroId}`);
  }

  // Obtener centros que tienen una especialidad específica
  getCentrosPorEspecialidad(especialidadId: number): Observable<DataPackage<CentroEspecialidad[]>> {
    return this.http.get<DataPackage<CentroEspecialidad[]>>(`${this.baseUrl}/especialidad/${especialidadId}`);
  }

  // Crear nueva relación centro-especialidad
  add(centroEspecialidad: CentroEspecialidad): Observable<DataPackage<CentroEspecialidad>> {
    return this.http.post<DataPackage<CentroEspecialidad>>(`${this.baseUrl}`, centroEspecialidad);
  }

  // Eliminar relación centro-especialidad
  delete(id: number): Observable<DataPackage<any>> {
    return this.http.delete<DataPackage<any>>(`${this.baseUrl}/${id}`);
  }
}
