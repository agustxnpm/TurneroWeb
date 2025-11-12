import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DataPackage } from '../data.package';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private base = environment.production 
    ? `${environment.apiUrl}/admin-dashboard`
    : 'rest/admin-dashboard';

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

  getMetricasCalidad(params?: { fechaDesde?: string, fechaHasta?: string, centroId?: number, consultorioId?: number, staffMedicoId?: number, especialidadId?: number }): Observable<DataPackage<any>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        const v = (params as any)[k];
        if (v !== undefined && v !== null && v !== '' && v !== 'null') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<DataPackage<any>>(`${this.base}/metricas-calidad`, { params: httpParams });
  }

  getMetricasPredictivas(params?: { fechaDesde?: string, fechaHasta?: string }): Observable<DataPackage<any>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        const v = (params as any)[k];
        if (v !== undefined && v !== null && v !== '' && v !== 'null') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<DataPackage<any>>(`${this.base}/metricas-predictivas`, { params: httpParams });
  }

  getComentarios(params?: { fechaDesde?: string, fechaHasta?: string }): Observable<DataPackage<string[]>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        const v = (params as any)[k];
        if (v !== undefined && v !== null && v !== '' && v !== 'null') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<DataPackage<string[]>>(`${this.base}/detalle/comentarios`, { params: httpParams });
  }
}
