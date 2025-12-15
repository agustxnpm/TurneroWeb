import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserContextService } from '../services/user-context.service';

/**
 * Guard que redirige a /centrosAtencion/{id} basado en el centroAtencionId del usuario
 * Usado para la ruta /mi-centro que permite a OPERADORES y ADMINISTRADORES
 * acceder directamente a la gestión centralizada de su centro
 */
@Injectable({
  providedIn: 'root'
})
export class MiCentroRedirectGuard implements CanActivate {

  constructor(
    private userContextService: UserContextService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const context = this.userContextService.getCurrentContext();
    const centroAtencionId = context.centroAtencionId;

    if (!centroAtencionId) {
      console.warn('⚠️ Usuario sin centroAtencionId asignado, redirigiendo a home');
      this.router.navigate(['/']);
      return false;
    }

    console.log(`✅ Redirigiendo a centro de atención ID: ${centroAtencionId}`);
    this.router.navigate(['/centrosAtencion', centroAtencionId]);
    return false; // Retornar false para cancelar la navegación original y usar la redirección
  }
}
