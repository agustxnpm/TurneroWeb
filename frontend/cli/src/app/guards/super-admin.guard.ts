import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../inicio-sesion/auth.service';
import { UserContextService } from '../services/user-context.service';

/**
 * Guard para proteger rutas exclusivas de SUPERADMIN
 * 
 * Uso: Rutas como /centros (ABM global) y /admins (gestión multi-tenant)
 * Solo permite acceso si el usuario tiene rol primario SUPERADMIN
 */
@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
    private userContextService: UserContextService
  ) {}

  canActivate(): boolean {
    
    //DESARROLLO: acceso libre a todas las rutas
    //return true; // quitar esta línea para activar la protección de rutas

    //PRODUCCION: rutas protegidas

    // Verificar si está autenticado
    if (!this.authService.isAuthenticated()) {
      console.warn('🚫 SuperAdminGuard: Usuario no autenticado');
      this.router.navigate(['/ingresar']);
      return false;
    }

    // Verificar si tiene rol de SUPERADMIN usando getter inteligente
    if (!this.userContextService.isSuperAdmin) {
      console.warn('🚫 SuperAdminGuard: Acceso denegado - requiere rol SUPERADMIN');
      this.router.navigate(['/home']); // Redirigir a home si no es SUPERADMIN
      return false;
    }

    console.log('✅ SuperAdminGuard: Acceso permitido');
    return true;
  }
}
