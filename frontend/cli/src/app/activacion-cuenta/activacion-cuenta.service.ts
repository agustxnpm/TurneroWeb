import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';
import { environment } from '../../environments/environment';

export interface ActivationRequest {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivacionCuentaService {
  private readonly apiUrl = environment.production ? `${environment.apiUrl}/auth` : 'rest/api/auth';

  constructor(private http: HttpClient) {}

  /**
   * Activa una cuenta de usuario usando el token de activación
   * @param token Token de activación recibido por email
   * @returns Observable con la respuesta del servidor
   */
  activateAccount(token: string): Observable<DataPackage<any>> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const request: ActivationRequest = { token };

    return this.http.post<DataPackage<any>>(`${this.apiUrl}/activate-account`, request, { headers });
  }

  /**
   * Valida si un token de activación es válido
   * @param token Token a validar
   * @returns Observable con la respuesta de validación
   */
  validateActivationToken(token: string): Observable<DataPackage<any>> {
    return this.http.get<DataPackage<any>>(`${this.apiUrl}/validate-activation-token?token=${token}`);
  }

  /**
   * Solicita reenvío del email de activación
   * @param email Email del usuario
   * @returns Observable con la respuesta del servidor
   */
  resendActivationEmail(email: string): Observable<DataPackage<any>> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const request = { email };

    return this.http.post<DataPackage<any>>(`${this.apiUrl}/resend-activation`, request, { headers });
  }
}