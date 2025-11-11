import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';

@Injectable({ providedIn: 'root' })
export class EncuestaAdminService {
  private baseUrl = 'rest/admin/encuestas';
  private centrosUrl = 'rest/centrosAtencion'; // A ajustar según 
  private especialidadesUrl = 'rest/especialidades'; //  ajustar según 

  constructor(private http: HttpClient) { }

  // === PREGUNTAS ===
  listarPreguntas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/preguntas`);
  }

  crearPregunta(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/preguntas`, payload);
  }

  actualizarPregunta(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/preguntas/${id}`, payload);
  }

  eliminarPregunta(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/preguntas/${id}`);
  }

  // === PLANTILLAS ===
  listarPlantillas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/plantillas`);
  }

  crearPlantilla(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/plantillas`, payload);
  }

  actualizarPlantilla(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/plantillas/${id}`, payload);
  }

  eliminarPlantilla(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/plantillas/${id}`);
  }

  // === ASOCIACIONES ===
  agregarPreguntaAPlantilla(plantillaId: number, preguntaId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/plantillas/${plantillaId}/preguntas/${preguntaId}`, null);
  }

  removerPreguntaDePlantilla(plantillaId: number, preguntaId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/plantillas/${plantillaId}/preguntas/${preguntaId}`);
  }

  desasignarPlantilla(plantillaId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/plantillas/${plantillaId}/desasignar`, null);
  }

  asignarPlantillaACentro(plantillaId: number, centroId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/plantillas/${plantillaId}/asignar-centro/${centroId}`, null);
  }

  asignarPlantillaAEspecialidad(plantillaId: number, espId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/plantillas/${plantillaId}/asignar-especialidad/${espId}`, null);
  }

  // === CATÁLOGOS ===
  listarCentrosAtencion(): Observable<any> {
    return this.http.get(this.centrosUrl);
  }

  listarEspecialidades(): Observable<any> {
    return this.http.get(this.especialidadesUrl);
  }
  buscarCentrosPorNombre(term: string): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.centrosUrl}/search/${term}`);
  }

  buscarEspecialidadesPorNombre(term: string): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.especialidadesUrl}/search/${term}`);
  }
}
