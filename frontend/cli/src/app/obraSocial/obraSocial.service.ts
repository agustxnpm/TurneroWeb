import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ObraSocial } from './obraSocial';
import { DataPackage } from '../data.package';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ObraSocialService {
  private url = environment.production ? `${environment.apiUrl}/obra-social` : 'rest/obra-social';

  constructor(private http: HttpClient) {}

  /** Obtiene todas las obras sociales */
  all(): Observable<DataPackage<ObraSocial[]>> {
    return this.http.get<DataPackage<ObraSocial[]>>(this.url);
  }

  /** Obtiene una obra social por ID */
  get(id: number): Observable<DataPackage<ObraSocial>> {
    return this.http.get<DataPackage<ObraSocial>>(`${this.url}/${id}`);
  }

  /** Crea una nueva obra social */
  create(obraSocial: ObraSocial): Observable<DataPackage<ObraSocial>> {
    return this.http.post<DataPackage<ObraSocial>>(this.url, obraSocial);
  }

  /** Actualiza una obra social existente */
  update(id: number, obraSocial: ObraSocial): Observable<DataPackage<ObraSocial>> {
    return this.http.put<DataPackage<ObraSocial>>(`${this.url}/${id}`, obraSocial);
  }

  /** Elimina una obra social por ID */
  remove(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  /** Paginación de obras sociales */
  byPage(page: number, size: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.url}/page?page=${page - 1}&size=${size}`);
  }

  /**
   * Búsqueda avanzada paginada de obras sociales
   * @param page Número de página (1-indexed)
   * @param size Cantidad de elementos por página
   * @param nombre Filtro por nombre de la obra social (opcional)
   * @param codigo Filtro por código de la obra social (opcional)
   * @param sortBy Campo por el cual ordenar (opcional)
   * @param sortDir Dirección del ordenamiento: asc|desc (opcional)
   * @returns Observable con DataPackage conteniendo página de obras sociales
   */
  byPageAdvanced(
    page: number,
    size: number,
    nombre?: string,
    codigo?: string,
    sortBy?: string,
    sortDir?: string
  ): Observable<DataPackage> {
    let params = new HttpParams()
      .set('page', (page - 1).toString())
      .set('size', size.toString());

    if (nombre && nombre.trim()) {
      params = params.set('nombre', nombre.trim());
    }
    if (codigo && codigo.trim()) {
      params = params.set('codigo', codigo.trim());
    }
    if (sortBy && sortBy.trim()) {
      params = params.set('sortBy', sortBy.trim());
    }
    if (sortDir && sortDir.trim()) {
      params = params.set('sortDir', sortDir.trim());
    }

    return this.http.get<DataPackage>(`${this.url}/page`, { params });
  }

  /** Búsqueda de obras sociales */
  search(term: string): Observable<DataPackage<ObraSocial[]>> {
    return this.http.get<DataPackage<ObraSocial[]>>(`${this.url}/search/${term}`);
  }
}