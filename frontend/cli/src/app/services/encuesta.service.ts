import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EncuestaService {
  private baseUrl = environment.production ? `${environment.apiUrl}/encuestas` : 'rest/encuestas';

  constructor(private http: HttpClient) {}

  getEncuestaForTurno(turnoId: number): Observable<DataPackage<any>> {
    return this.http.get<DataPackage<any>>(`${this.baseUrl}/turno/${turnoId}`);
  }

  isEncuestaPendiente(turnoId: number): Observable<DataPackage<any>> {
    return this.http.get<DataPackage<any>>(`${this.baseUrl}/turno/${turnoId}/pendiente`);
  }

  enviarRespuestas(payload: any): Observable<DataPackage<any>> {
    return this.http.post<DataPackage<any>>(`${this.baseUrl}/responder`, payload);
  }
}
