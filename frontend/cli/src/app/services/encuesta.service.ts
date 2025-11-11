import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';

@Injectable({
  providedIn: 'root'
})
export class EncuestaService {
  private baseUrl = 'rest/encuestas';

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
