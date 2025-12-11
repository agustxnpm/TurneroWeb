import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../inicio-sesion/auth.service';
import { UserContextService } from '../services/user-context.service';

/**
 * Guard para proteger acceso a centros de atención con lógica multi-tenant
 * 
 * Reglas:
 * - SUPERADMIN: Puede acceder a cualquier centro (crear, ver, editar)
 * - ADMINISTRADOR: Solo puede acceder a SU centro asignado (solo ver/configurar)
 * - Otros roles: Acceso denegado
 * 
 * Uso en rutas:
 * - /centrosAtencion/new -> Solo SUPERADMIN
 * - /centrosAtencion/:id -> SUPERADMIN (cualquier ID) o ADMIN (solo su ID)
 */
@Injectable({
  providedIn: 'root'
})
export class CentroAtencionAccessGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
    private userContextService: UserContextService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    
    //DESARROLLO: acceso libre a todas las rutas
    //return true; // quitar esta línea para activar la protección de rutas

    //PRODUCCION: rutas protegidas

    // 1. Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      console.warn('🚫 CentroAtencionAccessGuard: Usuario no autenticado');
      this.router.navigate(['/ingresar']);
      return false;
    }

    const isSuperAdmin = this.userContextService.isSuperAdmin;
    const isAdmin = this.userContextService.isAdmin;
    const userCentroId = this.userContextService.tenantId;
    const requestedCentroId = route.params['id'];

    // 2. SUPERADMIN: Acceso total (crear, ver, editar cualquier centro)
    if (isSuperAdmin) {
      console.log('✅ CentroAtencionAccessGuard: SUPERADMIN - Acceso permitido');
      return true;
    }

    // 3. Ruta de creación (/centrosAtencion/new): Solo SUPERADMIN
    if (requestedCentroId === 'new') {
      console.warn('🚫 CentroAtencionAccessGuard: Solo SUPERADMIN puede crear centros');
      this.router.navigate(['/']);
      return false;
    }

    // 4. ADMINISTRADOR: Solo puede acceder a SU centro
    if (isAdmin) {
      // Verificar que el admin tenga un centro asignado
      if (!userCentroId) {
        console.error('🚫 CentroAtencionAccessGuard: ADMIN sin centro asignado');
        this.router.navigate(['/']);
        return false;
      }

      // Convertir a números para comparación precisa
      const requestedId = parseInt(requestedCentroId, 10);
      
      // Verificar que está intentando acceder a SU centro
      if (userCentroId === requestedId) {
        console.log(`✅ CentroAtencionAccessGuard: ADMIN accediendo a su centro (ID: ${userCentroId})`);
        return true;
      } else {
        console.warn(`🚫 CentroAtencionAccessGuard: ADMIN intentando acceder a centro no autorizado (Su centro: ${userCentroId}, Solicitado: ${requestedId})`);
        // Redirigir a SU centro en lugar de denegar completamente
        this.router.navigate(['/centrosAtencion', userCentroId]);
        return false;
      }
    }

    // 5. Otros roles: Acceso denegado
    console.warn('🚫 CentroAtencionAccessGuard: Acceso denegado - requiere rol SUPERADMIN o ADMINISTRADOR');
    this.router.navigate(['/']);
    return false;
  }
}
