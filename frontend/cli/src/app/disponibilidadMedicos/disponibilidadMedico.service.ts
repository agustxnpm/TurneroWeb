import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { DisponibilidadMedico } from "./disponibilidadMedico";
import { DataPackage } from "../data.package";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: "root",
})
export class DisponibilidadMedicoService {
  private url = environment.production ? `${environment.apiUrl}/disponibilidades-medico` : "rest/disponibilidades-medico";

  constructor(private http: HttpClient) {}

  /** Obtiene todas las disponibilidades */
  all(): Observable<DataPackage<DisponibilidadMedico[]>> {
    return this.http.get<DataPackage<DisponibilidadMedico[]>>(this.url);
  }

  /** Obtiene una disponibilidad por ID */
  get(id: number): Observable<DataPackage<DisponibilidadMedico>> {
    return this.http.get<DataPackage<DisponibilidadMedico>>(
      `${this.url}/${id}`
    );
  }

  /** Crea una nueva disponibilidad */
  create(
    disponibilidad: DisponibilidadMedico
  ): Observable<DataPackage<DisponibilidadMedico>> {
    return this.http.post<DataPackage<DisponibilidadMedico>>(
      this.url,
      disponibilidad
    );
  }

  /** Actualiza una disponibilidad existente */
  update(
    id: number,
    disponibilidad: DisponibilidadMedico
  ): Observable<DataPackage<DisponibilidadMedico>> {
    return this.http.put<DataPackage<DisponibilidadMedico>>(
      `${this.url}/${id}`,
      disponibilidad
    );
  }

  /** Elimina una disponibilidad por ID */
  remove(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  /** Disponibilidades por staff médico */
  byStaffMedico(
    staffMedicoId: number
  ): Observable<DataPackage<DisponibilidadMedico[]>> {
    return this.http.get<DataPackage<DisponibilidadMedico[]>>(
      `${this.url}/staffMedico/${staffMedicoId}`
    );
  }

  /** Disponibilidades por médico ID */
  byMedico(medicoId: number): Observable<DataPackage<DisponibilidadMedico[]>> {
    return this.http.get<DataPackage<DisponibilidadMedico[]>>(
      `${this.url}/medico/${medicoId}`
    );
  }

  /**
   * Obtiene disponibilidades paginadas con filtros y ordenamiento
   * @param page Número de página (0-based)
   * @param size Tamaño de página
   * @param filters Objeto con filtros opcionales: staffMedico, especialidad, dia
   * @param sortBy Campo para ordenar
   * @param sortDir Dirección del ordenamiento ('asc' o 'desc')
   */
  getPaged(
    page: number,
    size: number,
    filters?: { staffMedico?: string; especialidad?: string; dia?: string },
    sortBy?: string,
    sortDir?: "asc" | "desc"
  ): Observable<
    DataPackage<{
      content: DisponibilidadMedico[];
      totalPages: number;
      totalElements: number;
      currentPage: number;
    }>
  > {
    let params = `page=${page}&size=${size}`;

    if (filters?.staffMedico?.trim()) {
      params += `&staffMedico=${encodeURIComponent(
        filters.staffMedico.trim()
      )}`;
    }
    if (filters?.especialidad?.trim()) {
      params += `&especialidad=${encodeURIComponent(
        filters.especialidad.trim()
      )}`;
    }
    if (filters?.dia?.trim()) {
      params += `&dia=${encodeURIComponent(filters.dia.trim())}`;
    }
    if (sortBy?.trim()) {
      params += `&sortBy=${encodeURIComponent(sortBy.trim())}`;
    }
    if (sortDir) {
      params += `&sortDir=${sortDir}`;
    }

    return this.http.get<
      DataPackage<{
        content: DisponibilidadMedico[];
        totalPages: number;
        totalElements: number;
        currentPage: number;
      }>
    >(`${this.url}/page?${params}`);
  }

  /** @deprecated Use getPaged instead */
  byPage(page: number, size: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(
      `${this.url}/page?page=${page - 1}&size=${size}`
    );
  }

  /** Resetear todas las disponibilidades */
  reset(): Observable<any> {
    return this.http.post(`${this.url}/reset`, {});
  }
}
