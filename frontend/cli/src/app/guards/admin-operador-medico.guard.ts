import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService, Role } from '../inicio-sesion/auth.service';
import { UserContextService } from '../services/user-context.service';

@Injectable({
  providedIn: 'root'
})
export class AdminOperadorMedicoGuard implements CanActivate {
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
      this.router.navigate(['/ingresar']);
      return false;
    }

    // Verificar si tiene rol de admin, operador o médico usando el UserContextService
    return this.userContextService.hasAnyRole([Role.ADMINISTRADOR, Role.OPERADOR, Role.MEDICO]);
  }
}
