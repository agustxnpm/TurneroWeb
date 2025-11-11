import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl = environment.production 
    ? `${environment.apiUrl}/config`
    : '/rest/config';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token'); // Asume que el token se almacena como 'access_token' en localStorage
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  getResumenTurnos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/resumen/turnos`, { headers: this.getAuthHeaders() });
  }

  getResumenNotificaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/resumen/notificaciones`, { headers: this.getAuthHeaders() });
  }

  updateConfig(update: { clave: string, valor: any }): Observable<string> {
    return this.http.post(`${this.apiUrl}/update`, update, {
      headers: this.getAuthHeaders(),
      responseType: 'text'
    });
  }
  resetDefaults(): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-defaults`, {}, { headers: this.getAuthHeaders() });
  }

  getUltimaMod(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ultima-mod`, { headers: this.getAuthHeaders() });
  }
}