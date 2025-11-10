import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DataPackage } from '../data.package';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private base = 'rest/admin-dashboard';

  constructor(private http: HttpClient) { }

  getMetricasBasicas(params?: { fechaDesde?: string, fechaHasta?: string, centroId?: number, consultorioId?: number, staffMedicoId?: number, especialidadId?: number }): Observable<DataPackage<any>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        const v = (params as any)[k];
        // No enviar parámetros null, undefined o string vacío
        if (v !== undefined && v !== null && v !== '' && v !== 'null') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<DataPackage<any>>(`${this.base}/metricas-basicas`, { params: httpParams });
  }

  getMetricasOcupacion(params?: { fechaDesde?: string, fechaHasta?: string, centroId?: number, consultorioId?: number }): Observable<DataPackage<any>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        const v = (params as any)[k];
        // No enviar parámetros null, undefined o string vacío
        if (v !== undefined && v !== null && v !== '' && v !== 'null') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<DataPackage<any>>(`${this.base}/metricas-ocupacion`, { params: httpParams });
  }
}
