import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DataPackage } from '../data.package';
import { StaffMedico } from './staffMedico';
import { ResultsPage } from '../results-page';

@Injectable({
  providedIn: 'root'
})
export class StaffMedicoService {
  private url = environment.production 
    ? `${environment.apiUrl}/staff-medico`
    : 'rest/staff-medico';

  constructor(private http: HttpClient) { }

  /** Obtiene todos los staff médicos */
  all(): Observable<DataPackage<StaffMedico[]>> {
    return this.http.get<DataPackage<StaffMedico[]>>(this.url);
  }

  /** Obtiene un staff médico por ID */
  get(id: number): Observable<DataPackage<StaffMedico>> {
    return this.http.get<DataPackage<StaffMedico>>(`${this.url}/${id}`);
  }

  /** Obtiene todos los staff médicos de un médico específico */
  getByMedicoId(medicoId: number): Observable<DataPackage<StaffMedico[]>> {
    return this.http.get<DataPackage<StaffMedico[]>>(`${this.url}/medico/${medicoId}`);
  }

  /** Crea un nuevo staff médico */
  create(staffMedico: StaffMedico): Observable<DataPackage<StaffMedico>> {
    return this.http.post<DataPackage<StaffMedico>>(this.url, staffMedico);
  }

  /** Actualiza un staff médico existente */
  update(id: number, staffMedico: StaffMedico): Observable<DataPackage<StaffMedico>> {
    return this.http.put<DataPackage<StaffMedico>>(`${this.url}/${id}`, staffMedico);
  }

  /** Elimina un staff médico por ID */
  remove(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

    /** Paginación de especialidades */
  byPage(page: number, size: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/page?page=${page - 1}&size=${size}`);
  }

  /**
   * Búsqueda, filtro y ordenamiento paginado de staff médicos
   * @param page Número de página (0-based)
   * @param size Tamaño de página
   * @param medico Filtro por nombre, apellido o DNI del médico (opcional)
   * @param especialidad Filtro por nombre de especialidad (opcional)
   * @param centro Filtro por nombre de centro de atención (opcional)
   * @param consultorio Filtro por nombre o ID de consultorio (opcional)
   * @param sortBy Campo para ordenar (opcional, default: id)
   * @param sortDir Dirección del ordenamiento (asc/desc, default: asc)
   * @returns Observable con datos paginados
   */
  findByPage(
    page: number,
    size: number,
    medico?: string,
    especialidad?: string,
    centro?: string,
    consultorio?: string,
    sortBy?: string,
    sortDir?: string
  ): Observable<DataPackage<ResultsPage>> {
    let params = `page=${page}&size=${size}`;

    if (medico?.trim()) params += `&medico=${encodeURIComponent(medico.trim())}`;
    if (especialidad?.trim()) params += `&especialidad=${encodeURIComponent(especialidad.trim())}`;
    if (centro?.trim()) params += `&centro=${encodeURIComponent(centro.trim())}`;
    if (consultorio?.trim()) params += `&consultorio=${encodeURIComponent(consultorio.trim())}`;
    if (sortBy?.trim()) params += `&sortBy=${encodeURIComponent(sortBy.trim())}`;
    if (sortDir?.trim()) params += `&sortDir=${encodeURIComponent(sortDir.trim())}`;

    return this.http.get<DataPackage<ResultsPage>>(`${this.url}/page?${params}`);
  }


  /** Búsqueda de staff médicos */
  search(term: string): Observable<DataPackage<StaffMedico[]>> {
    return this.http.get<DataPackage<StaffMedico[]>>(`${this.url}/search/${term}`);
  }

 /** Staff médicos asociados a un centro de atención */
getByCentroAtencion(centroId: number): Observable<DataPackage<StaffMedico[]>> {
  return this.http.get<DataPackage<StaffMedico[]>>(`${this.url}/centrosAtencion/${centroId}/staffMedico`);
}

  /** Staff médicos NO asociados a un centro de atención */
  getDisponibles(centroId: number): Observable<StaffMedico[]> {
    return this.http.get<any>(`${this.url}/centrosAtencion/${centroId}/staff/disponibles`)
      .pipe(
        map(res => res.data || [])
      );
  }

  /** Asociar staff médico a centro de atención */
  asociar(centroId: number, staffMedicoId: number) {
    return this.http.post(`${this.url}/centrosAtencion/${centroId}/staff/${staffMedicoId}`, {});
  }

  /** Desasociar staff médico de centro de atención */
  desasociar(centroId: number, staffMedicoId: number) {
    return this.http.delete(`${this.url}/centrosAtencion/${centroId}/staff/${staffMedicoId}`);
  }

  // ==================== MÉTODOS PARA GESTIÓN DE PORCENTAJES ====================

  /** Actualizar porcentajes de médicos de un centro */
  actualizarPorcentajes(centroId: number, medicosConPorcentaje: StaffMedico[]): Observable<DataPackage<any>> {
    return this.http.put<DataPackage<any>>(`${this.url}/centrosAtencion/${centroId}/medicos/porcentajes`, medicosConPorcentaje);
  }

  /** Obtener total de porcentajes asignados en un centro */
  getTotalPorcentajes(centroId: number): Observable<DataPackage<number>> {
    return this.http.get<DataPackage<number>>(`${this.url}/centrosAtencion/${centroId}/medicos/porcentajes/total`);
  }

  /** Validar porcentajes de médicos de un centro */
  validarPorcentajes(centroId: number, medicosConPorcentaje: StaffMedico[]): Observable<DataPackage<boolean>> {
    return this.http.post<DataPackage<boolean>>(`${this.url}/centrosAtencion/${centroId}/medicos/porcentajes/validar`, medicosConPorcentaje);
  }

  /** Obtener médicos con porcentajes de un centro */
  getMedicosConPorcentajes(centroId: number): Observable<DataPackage<StaffMedico[]>> {
    return this.http.get<DataPackage<StaffMedico[]>>(`${this.url}/centrosAtencion/${centroId}/medicos/conPorcentajes`);
  }
}