import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, Observable } from "rxjs";
import { Operador } from "./operador";
import { DataPackage } from "../data.package";
import { ResultsPage } from "../results-page";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: "root",
})
export class OperadorService {
  private url = environment.production ? `${environment.apiUrl}/operadores` : "rest/operadores";

  constructor(private http: HttpClient) {}

  /** Obtiene todos los operadores */
  all(): Observable<DataPackage<Operador[]>> {
    return this.http.get<DataPackage<Operador[]>>(this.url);
  }

  /** Obtiene un operador por ID */
  get(id: number): Observable<DataPackage<Operador>> {
    return this.http.get<DataPackage<Operador>>(`${this.url}/${id}`);
  }

  /** Crea un nuevo operador */
  create(operador: Operador): Observable<DataPackage<Operador>> {
    return this.http.post<DataPackage<Operador>>(this.url, operador);
  }

  /** Actualiza un operador existente */
  update(id: number, operador: Operador): Observable<DataPackage<Operador>> {
    return this.http.put<DataPackage<Operador>>(`${this.url}/${id}`, operador);
  }

  /** Elimina un operador por ID */
  remove(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  /** Obtiene operadores por página */
  byPage(page: number, size: number): Observable<DataPackage<ResultsPage>> {
    return this.http.get<DataPackage<ResultsPage>>(
      `${this.url}/page?page=${page - 1}&size=${size}`
    );
  }

  /**
   * Obtiene operadores paginados con filtros y ordenamiento avanzado
   * @param page Número de página (1-based)
   * @param size Tamaño de página
   * @param nombre Filtro por nombre (opcional, búsqueda parcial)
   * @param email Filtro por email (opcional, búsqueda parcial)
   * @param estado Filtro por estado: 'activo', 'inactivo' o undefined para todos
   * @param sortBy Campo para ordenar (opcional)
   * @param sortDir Dirección del orden: 'asc' o 'desc' (default: 'asc')
   * @returns Observable con DataPackage que contiene la página de resultados
   */
  findByPage(
    page: number,
    size: number,
    nombre?: string,
    email?: string,
    estado?: string,
    sortBy?: string,
    sortDir: string = 'asc'
  ): Observable<DataPackage<ResultsPage>> {
    // Construir parámetros de consulta
    let params = `page=${page - 1}&size=${size}`;

    if (nombre && nombre.trim()) {
      params += `&nombre=${encodeURIComponent(nombre.trim())}`;
    }
    if (email && email.trim()) {
      params += `&email=${encodeURIComponent(email.trim())}`;
    }
    if (estado && estado.trim()) {
      params += `&estado=${encodeURIComponent(estado.trim())}`;
    }
    if (sortBy && sortBy.trim()) {
      params += `&sortBy=${encodeURIComponent(sortBy.trim())}&sortDir=${sortDir}`;
    }

    return this.http.get<DataPackage<ResultsPage>>(`${this.url}/page?${params}`);
  }

  /** Verifica si un operador existe por DNI */
  existsByDni(dni: number): Observable<boolean> {
    return this.http
      .get<DataPackage<boolean>>(`${this.url}/existsByDni/${dni}`)
      .pipe(map((res) => res.data || false));
  }

  /** Busca un operador por DNI */
  findByDni(dni: number): Observable<DataPackage<Operador>> {
    return this.http.get<DataPackage<Operador>>(`${this.url}/dni/${dni}`);
  }

  /** Busca un operador por username y obtiene su ID */
  findByUsername(
    username: string
  ): Observable<DataPackage<{ operadorId: number }>> {
    return this.http.get<DataPackage<{ operadorId: number }>>(
      `${this.url}/by-username/${username}`
    );
  }

  /** Busca un operador por email */
  findByEmail(email: string): Observable<DataPackage<Operador>> {
    return this.http.get<DataPackage<Operador>>(`${this.url}/by-email/${encodeURIComponent(email)}`);
  }

  /** Crea un operador desde el perfil de administrador con auditoría */
  createByAdmin(operador: Operador): Observable<DataPackage<Operador>> {
    return this.http.post<DataPackage<Operador>>(`${this.url}/create-by-admin`, operador);
  }
}
