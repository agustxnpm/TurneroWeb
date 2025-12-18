import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from '../../environments/environment';

// Estructura de respuesta estándar
export interface DataPackage<T = any> {
  data: T;
  status_code: number;
  status_text: string;
}

@Injectable({ providedIn: "root" })
export class RecuperarContrasenaService {
  private base = environment.production 
    ? `${environment.apiUrl}/auth`
    : "rest/api/auth";
  constructor(private http: HttpClient) {}

  /**
   * Solicita el envío de email de recuperación
   */
  requestReset(email: string): Observable<DataPackage<any>> {
    return this.http.post<DataPackage<any>>(`${this.base}/forgot-password`, { email });
  }

  /**
   * Valida un token de recuperación
   */
  validateResetToken(token: string): Observable<DataPackage<any>> {
    return this.http.get<DataPackage<any>>(`${this.base}/validate-reset-token?token=${token}`);
  }

  /**
   * Cambia la contraseña usando el token
   */
  resetPassword(token: string, newPassword: string): Observable<DataPackage<any>> {
    return this.http.post<DataPackage<any>>(`${this.base}/reset-password`, { token, newPassword });
  }

  /**
   * Obtiene info de expiración de tokens
   */
  getResetTokenInfo(): Observable<DataPackage<any>> {
    return this.http.get<DataPackage<any>>(`${this.base}/reset-token-info`);
  }
}
