import { Injectable } from '@angular/core';
import { CentroAtencion } from './centroAtencion';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CentroAtencionService {

  private centrosAtencionUrl = environment.production ? `${environment.apiUrl}/centrosAtencion` : 'rest/centrosAtencion';

  constructor(private http: HttpClient) {}

  all(): Observable<DataPackage> {
    return this.http.get<DataPackage>(this.centrosAtencionUrl);
  }

  get(id: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.centrosAtencionUrl}/${id}`);
  }

  save(centroAtencion: CentroAtencion): Observable<DataPackage> {
    return centroAtencion.id 
      ? this.http.put<DataPackage>(this.centrosAtencionUrl, centroAtencion)
      : this.http.post<DataPackage>(this.centrosAtencionUrl, centroAtencion);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.centrosAtencionUrl}/${id}`);
  }

  byPage(page: number, size: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.centrosAtencionUrl}/page?page=${page-1}&size=${size}`);
  }

  search(searchTerm: string): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.centrosAtencionUrl}/search/${searchTerm}`);
  }

  getAll(): Observable<{ data: CentroAtencion[] }> {
    return this.http.get<{ data: CentroAtencion[] }>(this.centrosAtencionUrl);
  }
}