import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, Observable } from "rxjs";
import { Paciente } from "./paciente";
import { PreferenciaHoraria } from "./preferencia-horaria";
import { DataPackage } from "../data.package";
import { ResultsPage } from "../results-page";

@Injectable({
  providedIn: "root",
})
export class PacienteService {
  private url = "rest/pacientes";

  constructor(private http: HttpClient) {}

  /** Obtiene todos los pacientes */
  all(): Observable<DataPackage<Paciente[]>> {
    return this.http.get<DataPackage<Paciente[]>>(this.url);
  }

  /** Obtiene un paciente por ID */
  get(id: number): Observable<DataPackage<Paciente>> {
    return this.http.get<DataPackage<Paciente>>(`${this.url}/${id}`);
  }

  /** Crea un nuevo paciente */
  create(paciente: Paciente): Observable<DataPackage<Paciente>> {
    return this.http.post<DataPackage<Paciente>>(this.url, paciente);
  }

  /** Crea un nuevo paciente por administrador */
  createByAdmin(paciente: Paciente): Observable<DataPackage<Paciente>> {
    return this.http.post<DataPackage<Paciente>>(
      `${this.url}/create-by-admin`,
      paciente
    );
  }

  /** Crea un nuevo paciente por operador */
  createByOperator(paciente: Paciente): Observable<DataPackage<Paciente>> {
    return this.http.post<DataPackage<Paciente>>(
      `${this.url}/create-by-operator`,
      paciente
    );
  }

  /** Actualiza un paciente existente */
  update(id: number, paciente: Paciente): Observable<DataPackage<Paciente>> {
    return this.http.put<DataPackage<Paciente>>(`${this.url}/${id}`, paciente);
  }

  /** Elimina un paciente por ID */
  remove(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  byPage(page: number, size: number): Observable<DataPackage<ResultsPage>> {
    return this.http.get<DataPackage<ResultsPage>>(
      `${this.url}/page?page=${page - 1}&size=${size}`
    );
  }

  /**
   * Obtiene pacientes paginados con búsqueda, filtros y ordenamiento avanzados
   * @param page Número de página (1-based, se convierte a 0-based para el backend)
   * @param size Tamaño de página
   * @param filters Objeto con filtros opcionales: nombreApellido (busca en nombre O apellido), documento, email
   * @param sortBy Campo por el cual ordenar (opcional)
   * @param sortDir Dirección del ordenamiento: 'asc' o 'desc' (default: 'asc')
   * @returns Observable con DataPackage<ResultsPage>
   */
  byPageAdvanced(
    page: number,
    size: number,
    filters?: {
      nombreApellido?: string;
      documento?: string;
      email?: string;
    },
    sortBy?: string,
    sortDir: 'asc' | 'desc' = 'asc'
  ): Observable<DataPackage<ResultsPage>> {
    // Construir query parameters
    const params = new URLSearchParams();

    // Paginación (convertir de 1-based a 0-based)
    params.append('page', (page - 1).toString());
    params.append('size', size.toString());

    // Filtros opcionales
    if (filters) {
      if (filters.nombreApellido?.trim()) {
        // Enviar el parámetro unificado nombreApellido
        params.append('nombreApellido', filters.nombreApellido.trim());
      }
      if (filters.documento?.trim()) {
        params.append('documento', filters.documento.trim());
      }
      if (filters.email?.trim()) {
        params.append('email', filters.email.trim());
      }
    }

    // Ordenamiento
    if (sortBy?.trim()) {
      params.append('sortBy', sortBy.trim());
      params.append('sortDir', sortDir);
    }

    const queryString = params.toString();
    const url = queryString ? `${this.url}/page?${queryString}` : `${this.url}/page`;

    return this.http.get<DataPackage<ResultsPage>>(url);
  }
  /** Búsqueda de pacientes */
  search(term: string): Observable<DataPackage<Paciente[]>> {
    return this.http.get<DataPackage<Paciente[]>>(`${this.url}/search/${term}`);
  }

  /** Verifica si un paciente existe por DNI */
  existsByDni(dni: number): Observable<boolean> {
    return this.http
      .get<DataPackage<boolean>>(`${this.url}/existsByDni/${dni}`)
      .pipe(map((res) => res.data || false));
  }

  /** Busca un paciente por DNI */
  findByDni(dni: number): Observable<DataPackage<Paciente>> {
    return this.http.get<DataPackage<Paciente>>(`${this.url}/dni/${dni}`);
  }

  /** Busca un paciente por email y obtiene su ID */
  findByEmail(email: string): Observable<DataPackage<{ pacienteId: number }>> {
    return this.http.get<DataPackage<{ pacienteId: number }>>(
      `${this.url}/by-email/${email}`
    );
  }

  getObrasSociales(): Observable<
    DataPackage<{ id: number; nombre: string; codigo: string }[]>
  > {
    return this.http.get<
      DataPackage<{ id: number; nombre: string; codigo: string }[]>
    >(`rest/obra-social`);
  }

  /**
   * Sincronización automática del usuario actual como paciente.
   * 
   * Este método garantiza que el usuario autenticado tenga un registro en la tabla pacientes,
   * permitiendo que usuarios multi-rol (MÉDICO, OPERADOR, ADMINISTRADOR) puedan operar
   * en el dashboard de pacientes y sacar turnos.
   * 
   * Características:
   * - Idempotente: puede llamarse múltiples veces sin crear duplicados
   * - Busca por DNI o email del usuario autenticado
   * - Crea registro solo si no existe
   * - Retorna el pacienteId correspondiente
   * 
   * @returns Observable con el pacienteId y datos básicos del paciente sincronizado
   */
  syncCurrentUserAsPaciente(): Observable<DataPackage<{
    pacienteId: number;
    nombre: string;
    apellido: string;
    email: string;
    dni: number;
    sincronizado: boolean;
  }>> {
    return this.http.get<DataPackage<{
      pacienteId: number;
      nombre: string;
      apellido: string;
      email: string;
      dni: number;
      sincronizado: boolean;
    }>>(`${this.url}/sync-current-user`);
  }

  /**
   * Completa el perfil de un usuario registrado con Google
   * 
   * Envía los datos faltantes (DNI, teléfono, fecha de nacimiento) al backend
   * para completar el perfil del usuario autenticado.
   * 
   * @param data Datos del perfil a completar
   * @returns Observable con la respuesta del backend
   */
  completeProfile(data: {
    dni: number;
    telefono: string;
    fechaNacimiento: string;
    obraSocialId?: number | null;
  }): Observable<DataPackage<any>> {
    return this.http.put<DataPackage<any>>(`${this.url}/me/complete-profile`, data);
  }

  // =========================================================================
  // GESTIÓN DE PREFERENCIAS HORARIAS
  // =========================================================================

  /**
   * Obtiene las preferencias horarias del paciente autenticado.
   * 
   * Realiza una petición GET al endpoint /pacientes/me/preferencias que retorna
   * la lista de preferencias configuradas para el usuario actual.
   * 
   * Endpoint: GET /rest/pacientes/me/preferencias
   * Autenticación: Requiere token JWT con rol PACIENTE (o superior en jerarquía)
   * 
   * @returns Observable con DataPackage que contiene el array de PreferenciaHoraria
   */
  getPreferencias(): Observable<DataPackage<PreferenciaHoraria[]>> {
    const url = `${this.url}/me/preferencias`;
    return this.http.get<DataPackage<PreferenciaHoraria[]>>(url);
  }

  /**
   * Añade una nueva preferencia horaria para el paciente autenticado.
   * 
   * Envía una petición POST con los datos de la nueva preferencia. El backend
   * validará los datos, verificará que no haya solapamientos, y retornará
   * la preferencia guardada con su ID asignado.
   * 
   * Endpoint: POST /rest/pacientes/me/preferencias
   * Autenticación: Requiere token JWT con rol PACIENTE (o superior en jerarquía)
   * 
   * Validaciones del backend:
   * - horaDesde debe ser anterior a horaHasta
   * - No puede haber solapamiento con preferencias existentes del mismo día
   * 
   * @param preferencia Objeto PreferenciaHoraria con los datos (sin ID)
   * @returns Observable con DataPackage que contiene la PreferenciaHoraria creada (con ID)
   */
  addPreferencia(preferencia: PreferenciaHoraria): Observable<DataPackage<PreferenciaHoraria>> {
    const url = `${this.url}/me/preferencias`;
    return this.http.post<DataPackage<PreferenciaHoraria>>(url, preferencia);
  }

  /**
   * Elimina una preferencia horaria específica del paciente autenticado.
   * 
   * Envía una petición DELETE al endpoint con el ID de la preferencia. El backend
   * verificará que la preferencia pertenezca al usuario autenticado antes de eliminarla.
   * 
   * Endpoint: DELETE /rest/pacientes/me/preferencias/{id}
   * Autenticación: Requiere token JWT con rol PACIENTE (o superior en jerarquía)
   * 
   * Respuesta del backend:
   * - 204 No Content: Preferencia eliminada correctamente
   * - 404 Not Found: Preferencia no encontrada o no pertenece al usuario
   * 
   * @param id ID de la preferencia horaria a eliminar
   * @returns Observable<void> (sin cuerpo de respuesta en caso de éxito)
   */
  deletePreferencia(id: number): Observable<void> {
    const url = `${this.url}/me/preferencias/${id}`;
    return this.http.delete<void>(url);
  }
}

