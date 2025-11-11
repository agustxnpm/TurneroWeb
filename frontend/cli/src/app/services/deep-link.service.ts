import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { DataPackage } from '../data.package';
import { AuthService } from '../inicio-sesion/auth.service';
import { environment } from '../../environments/environment';

/**
 * Interfaz para la respuesta de validación de deep link
 */
export interface DeepLinkResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    email: string;
    fullName: string;
  };
  context: {
    turnoId?: number;
    medicoId?: number;
    medicoNombre?: string;
    especialidadId?: number;
    especialidadNombre?: string;
    centroAtencionId?: number;
    centroAtencionNombre?: string;
    tipo?: string;
  };
}

/**
 * Servicio para gestión de deep links (enlaces profundos)
 * Permite a los usuarios acceder a rutas específicas desde enlaces externos
 * con autenticación automática y contexto pre-establecido
 */
@Injectable({
  providedIn: 'root'
})
export class DeepLinkService {
  private url = environment.production ? `${environment.apiUrl}/deep-links` : 'rest/deep-links';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  /**
   * Valida un token de deep link y establece la sesión del usuario
   * 
   * @param token Token de deep link recibido por email
   * @returns Observable con la respuesta de validación
   */
  validateDeepLink(token: string): Observable<DataPackage<DeepLinkResponse>> {
    return this.http.post<DataPackage<DeepLinkResponse>>(
      `${this.url}/validate`,
      { token }
    ).pipe(
      tap(response => {
        if (response.status_code === 200 && response.data) {
          // Guardar tokens en sessionStorage
          this.setSession(response.data.tokens);
          
          // Guardar contexto para pre-selección en la agenda
          if (response.data.context) {
            this.saveContext(response.data.context);
          }
        }
      })
    );
  }

  /**
   * Establece la sesión del usuario con los tokens recibidos
   * 
   * @param tokens Tokens de autenticación
   */
  private setSession(tokens: DeepLinkResponse['tokens']): void {
    // Guardar access token
    sessionStorage.setItem('access_token', tokens.accessToken);
    
    // Guardar refresh token
    sessionStorage.setItem('refresh_token', tokens.refreshToken);
    
    // Guardar datos del usuario (sin role, ya que está en el JWT)
    const userData = {
      email: tokens.email,
      fullName: tokens.fullName
    };
    sessionStorage.setItem('user_data', JSON.stringify(userData));
    
    // Marcar último acceso
    sessionStorage.setItem('last_activity', Date.now().toString());
    
    // Notificar cambio de autenticación usando el método público del AuthService
    // El AuthService detectará automáticamente el cambio cuando se llame a isAuthenticated()
  }

  /**
   * Guarda el contexto del turno para pre-selección
   * 
   * @param context Contexto del turno
   */
  private saveContext(context: DeepLinkResponse['context']): void {
    // TODO: Implementar pre-selección de filtros basados en contexto del turno
    // Por ahora solo guarda el contexto pero no se utiliza para filtros automáticos
    sessionStorage.setItem('turno_context', JSON.stringify(context));
  }

  /**
   * Obtiene el contexto guardado del turno
   * 
   * @returns Contexto del turno o null si no existe
   */
  getContext(): DeepLinkResponse['context'] | null {
    // TODO: Implementar uso del contexto para filtros automáticos en agenda
    const contextStr = sessionStorage.getItem('turno_context');
    if (contextStr) {
      try {
        return JSON.parse(contextStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Limpia el contexto guardado
   */
  clearContext(): void {
    sessionStorage.removeItem('turno_context');
  }

  /**
   * Verifica si hay un contexto de turno guardado
   * 
   * @returns true si hay contexto guardado
   */
  hasContext(): boolean {
    // TODO: Usar este método para determinar si aplicar filtros automáticos
    return sessionStorage.getItem('turno_context') !== null;
  }
}
