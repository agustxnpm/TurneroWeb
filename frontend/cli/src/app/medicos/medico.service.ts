import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DataPackage } from '../data.package';
import { Medico, MedicoBasicInfo } from './medico';
import { ResultsPage } from '../results-page';

@Injectable({
  providedIn: 'root'
})
export class MedicoService {
  private url = environment.production 
    ? `${environment.apiUrl}/medicos`
    : 'rest/medicos';

  constructor(private http: HttpClient) {}

  /** 
   * Obtiene todos los médicos según el tipo de usuario:
   * - SUPERADMIN: Todos los médicos globalmente
   * - ADMIN/OPERADOR: Solo médicos de su centro (via StaffMedico)
   * - PACIENTE: Todos los médicos (acceso global para búsqueda)
   * 
   * NOTA: Para ver información básica de TODOS los médicos (para selector),
   * el ADMIN debe usar un endpoint específico de "médicos disponibles".
   * TODO: Implementar endpoint /medicos/disponibles que retorne lista básica
   * (nombre, apellido, matricula) de todos los médicos del sistema.
   */
  getAll(): Observable<DataPackage<Medico[]>> {
    return this.http.get<DataPackage<Medico[]>>(this.url);
  }

  /** Consulta un médico por ID */
  getById(id: number): Observable<DataPackage<Medico>> {
    return this.http.get<DataPackage<Medico>>(`${this.url}/${id}`);
  }

  /** Alias para getById - usado por el dashboard */
  findById(id: number): Observable<Medico> {
    return new Observable(observer => {
      this.getById(id).subscribe({
        next: (response) => {
          if (response && response.data) {
            observer.next(response.data);
          } else {
            observer.error('Médico no encontrado');
          }
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /** Crea un nuevo médico */
  create(medico: Medico): Observable<DataPackage<Medico>> {
    return this.http.post<DataPackage<Medico>>(this.url, medico);
  }

  /** 
   * Crea un nuevo médico por administrador
   * IMPORTANTE: Los médicos son entidades GLOBALES. Al crear un médico:
   * 1. Se registra globalmente en la tabla 'medico'
   * 2. Luego debe asociarse al centro via StaffMedico
   * 
   * TODO: Implementar flujo de aprobación bidireccional
   * - El ADMIN envía solicitud al médico
   * - El médico debe aceptar ser asociado al centro
   * Por ahora, la asociación es directa sin aprobación.
   */
  createByAdmin(medico: Medico): Observable<DataPackage<Medico>> {
    return this.http.post<DataPackage<Medico>>(
      `${this.url}/create-by-admin`,
      medico
    );
  }

  /** Crea un nuevo médico por operador */
  createByOperador(medico: Medico): Observable<DataPackage<Medico>> {
    return this.http.post<DataPackage<Medico>>(
      `${this.url}/create-by-operador`,
      medico
    );
  }

  /** Actualiza un médico existente */
  update(id: number, medico: Medico): Observable<DataPackage<Medico>> {
    return this.http.put<DataPackage<Medico>>(`${this.url}/${id}`, medico);
  }

  /** Elimina un médico */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** Busca médicos por término */
  search(term: string): Observable<DataPackage<Medico[]>> {
    return this.http.get<DataPackage<Medico[]>>(`${this.url}/search/${term}`);
  }

  /** Busca un médico por matrícula */
  findByMatricula(matricula: string): Observable<DataPackage<Medico>> {
    return this.http.get<DataPackage<Medico>>(`${this.url}/matricula/${matricula}`);
  }

  /** Busca un médico por email */
  findByEmail(email: string): Observable<DataPackage<Medico>> {
    return this.http.get<DataPackage<Medico>>(`${this.url}/email/${encodeURIComponent(email)}`);
  }

  /**
   * Obtiene información básica de TODOS los médicos disponibles en el sistema.
   * Retorna solo datos no sensibles (id, nombre, apellido, matricula, especialidades).
   * Útil para selectores al crear StaffMedico.
   * 
   * NOTA: Este endpoint NO filtra por centro - retorna todos los médicos globalmente.
   * 
   * TODO: Implementar flujo de aprobación bidireccional donde el médico
   * debe aceptar la solicitud del centro antes de ser asociado.
   * 
   * @example
   * // En un componente para crear StaffMedico:
   * this.medicoService.getMedicosDisponibles().subscribe({
   *   next: (response) => {
   *     this.medicosDisponibles = response.data;
   *     // Mostrar en un <select> o dropdown
   *   }
   * });
   */
  getMedicosDisponibles(): Observable<DataPackage<MedicoBasicInfo[]>> {
    return this.http.get<DataPackage<MedicoBasicInfo[]>>(`${this.url}/disponibles`);
  }

  /** Paginación */
  byPage(page: number, size: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/page?page=${page - 1}&size=${size}`);
  }

  /**
   * Búsqueda paginada avanzada con filtros y ordenamiento
   * El backend filtra automáticamente según el tipo de usuario:
   * - SUPERADMIN: Todos los médicos
   * - ADMIN/OPERADOR: Solo médicos de su centro (via StaffMedico)
   * - PACIENTE: Todos los médicos (para búsqueda de turnos)
   * 
   * @param page Número de página (0-based)
   * @param size Tamaño de página
   * @param nombre Filtro por nombre (opcional)
   * @param especialidad Filtro por especialidad (opcional)
   * @param estado Filtro por estado (activo/inactivo, opcional)
   * @param sortBy Campo para ordenar (opcional)
   * @param sortDir Dirección del ordenamiento (asc/desc, opcional)
   * @returns Observable con DataPackage<Page<Medico>>
   */
  findByPage(
    page: number,
    size: number,
    nombre?: string,
    especialidad?: string,
    estado?: string,
    sortBy?: string,
    sortDir?: string
  ): Observable<DataPackage<ResultsPage>> {
    // Construir query string con parámetros opcionales
    const params = new URLSearchParams();

    params.append('page', page.toString());
    params.append('size', size.toString());

    if (nombre && nombre.trim()) {
      params.append('nombre', nombre.trim());
    }

    if (especialidad && especialidad.trim()) {
      params.append('especialidad', especialidad.trim());
    }

    if (estado && estado.trim()) {
      params.append('estado', estado.trim());
    }

    if (sortBy && sortBy.trim()) {
      params.append('sortBy', sortBy.trim());
    }

    if (sortDir && sortDir.trim()) {
      params.append('sortDir', sortDir.trim());
    }

    const url = `${this.url}/page?${params.toString()}`;

    return this.http.get<DataPackage<ResultsPage>>(url);
  }
}
