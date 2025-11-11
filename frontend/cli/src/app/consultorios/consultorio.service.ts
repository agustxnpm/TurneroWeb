import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DataPackage } from '../data.package';
import { Consultorio, HorarioConsultorio } from './consultorio';
import { ResultsPage } from '../results-page';

@Injectable({
  providedIn: 'root'
})
export class ConsultorioService {
  private url = environment.production 
    ? `${environment.apiUrl}/consultorios`
    : 'rest/consultorios';

  constructor(private http: HttpClient) {}

  /** Obtiene todos los consultorios */
  getAll(): Observable<DataPackage<Consultorio[]>> {
    return this.http.get<DataPackage<Consultorio[]>>(this.url);
  }

  /** Consulta un consultorio por ID */
  getById(id: number): Observable<DataPackage<Consultorio>> {
    return this.http.get<DataPackage<Consultorio>>(`${this.url}/${id}`);
  }

  /** Crea un nuevo consultorio */
  create(consultorio: Consultorio): Observable<DataPackage<Consultorio>> {
    return this.http.post<DataPackage<Consultorio>>(this.url, consultorio);
  }

  /** Actualiza un consultorio existente */
  update(id: number, consultorio: Consultorio): Observable<DataPackage<Consultorio>> {
    return this.http.put<DataPackage<Consultorio>>(`${this.url}/${id}`, consultorio);
  }

  /** Elimina un consultorio */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** Lista los consultorios de un Centro de Atención específico */
  listByCentro(centroNombre: string): Observable<DataPackage<Consultorio[]>> {
    return this.http.get<DataPackage<Consultorio[]>>(
      `${this.url}/${encodeURIComponent(centroNombre)}/listar`
    );
  }

  /** Obtiene los consultorios asociados a un centro de atención por ID */
  getByCentroAtencion(centroId: number) {
    return this.http.get<DataPackage<Consultorio[]>>(
    `${this.url}/centrosAtencion/${centroId}/consultorios`
    );
  }

  /** Actualiza los horarios semanales de un consultorio */
  updateHorarios(consultorioId: number, horarios: HorarioConsultorio[]): Observable<DataPackage<Consultorio>> {
    // Primero obtenemos el consultorio actual
    return new Observable(observer => {
      this.getById(consultorioId).subscribe({
        next: (consultorioResponse) => {
          // Actualizamos el consultorio con los nuevos horarios
          const consultorioActualizado = {
            ...consultorioResponse.data,
            horariosSemanales: horarios
          };
          
          // Enviamos la actualización completa
          this.update(consultorioId, consultorioActualizado).subscribe({
            next: (response) => observer.next(response),
            error: (error) => observer.error(error)
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  byPage(page: number, size: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/page?page=${page-1}&size=${size}`);
  }
}