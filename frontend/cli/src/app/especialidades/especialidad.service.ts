// src/app/play-type/play-type.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DataPackage } from '../data.package';
import { Especialidad } from './especialidad';

@Injectable({
  providedIn: 'root'
})
export class EspecialidadService {
  private url = environment.production 
    ? `${environment.apiUrl}/especialidades`
    : 'rest/especialidades';

  constructor(private http: HttpClient) { }

  /** Obtiene todas las especialidades */
  all(): Observable<DataPackage<Especialidad[]>> {
    return this.http.get<DataPackage<Especialidad[]>>(this.url);
  }

  /** Obtiene una especialidad por ID */
  get(id: number): Observable<DataPackage<Especialidad>> {
    return this.http.get<DataPackage<Especialidad>>(`${this.url}/${id}`);
  }

  /** Crea una nueva especialidad */
  create(especialidad: Especialidad): Observable<DataPackage<Especialidad>> {
    return this.http.post<DataPackage<Especialidad>>(this.url, especialidad);
  }

  /** Actualiza una especialidad existente */
  update(id: number, especialidad: Especialidad): Observable<DataPackage<Especialidad>> {
    return this.http.put<DataPackage<Especialidad>>(`${this.url}/${id}`, especialidad);
  }

  /** Elimina una especialidad por ID */
  remove(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  /** Paginación de especialidades */
  byPage(page: number, size: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/page?page=${page - 1}&size=${size}`);
  }

  /** Búsqueda de especialidades */
  search(term: string): Observable<DataPackage<Especialidad[]>> {
    return this.http.get<DataPackage<Especialidad[]>>(`${this.url}/search/${term}`);
  }

  /** Obtiene los consultorios asociados a un centro de atención por ID */
  getByCentroAtencion(centroId: number) {
    return this.http.get<DataPackage<Especialidad[]>>(
      `${this.url}/centrosAtencion/${centroId}/especialidades`
    );
  }

  /** Especialidades asociadas a un centro de atención */
  getAsociadas(centroId: number) {
    return this.http.get<Especialidad[]>(`${this.url}/centrosAtencion/${centroId}/especialidades`);
  }

  /** Especialidades NO asociadas a un centro de atención */
  getDisponibles(centroId: number) {
    return this.http.get<any>(`${this.url}/centrosAtencion/${centroId}/especialidades/disponibles`)
      .pipe(
        map(res => res.data || [])
      );
  }
  /** Asociar especialidad a centro de atención */
  asociar(centroId: number, especialidadId: number) {
    return this.http.post(`${this.url}/centrosAtencion/${centroId}/especialidades/${especialidadId}`, {});
  }

  /** Desasociar especialidad de centro de atención */
  desasociar(centroId: number, especialidadId: number) {
    return this.http.delete(`${this.url}/centrosAtencion/${centroId}/especialidades/${especialidadId}`);
  }
  getByMedico(medicoId: number) {
    return this.http.get<any>(`/especialidades/medicos/${medicoId}/especialidades`);
  }
}
