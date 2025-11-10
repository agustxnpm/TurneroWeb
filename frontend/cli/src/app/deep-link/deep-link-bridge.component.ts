import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DeepLinkService } from '../services/deep-link.service';
import { TurnoService } from '../turnos/turno.service';

/**
 * Componente puente para procesar enlaces profundos (deep links)
 * Este componente:
 * 1. Recibe un token desde la URL
 * 2. Valida el token con el backend
 * 3. Establece una sesión automática si el token es válido
 * 4. Si el tipo es "CONFIRMACION", confirma automáticamente el turno
 * 5. Redirige al usuario a la página de agenda con mensaje de confirmación
 */
@Component({
  selector: 'app-deep-link-bridge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deep-link-brigde.component.html',
  styleUrl: './deep-link-bridge.component.css'
})
export class DeepLinkBridgeComponent implements OnInit {
  loading = true;
  error = false;
  success = false;
  errorMessage = '';
  confirmingAppointment = false;

  constructor(
    private route: ActivatedRoute,
    private deepLinkService: DeepLinkService,
    private turnoService: TurnoService,
    private router: Router
  ) {}

  ngOnInit() {
    // Obtener token de los query params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];

      if (!token) {
        this.showError('No se proporcionó un token de acceso válido.');
        return;
      }

      // Validar el token
      this.validateToken(token);
    });
  }

  /**
   * Valida el token con el backend
   */
  private validateToken(token: string): void {
    this.deepLinkService.validateDeepLink(token).subscribe({
      next: (response) => {
        if (response.status_code === 200) {
          const context = response.data.context;
          
          // Si el tipo es "CONFIRMACION", confirmar el turno automáticamente
          if (context && context.tipo === 'CONFIRMACION' && context.turnoId) {
            this.confirmarTurno(context.turnoId);
          } else {
            // Para otros tipos, simplemente redirigir a la agenda
            this.showSuccess();
            setTimeout(() => {
              this.router.navigate(['/paciente-agenda']);
            }, 1500);
          }
        } else {
          this.showError(response.status_text || 'Token inválido o expirado.');
        }
      },
      error: (err) => {
        console.error('Error al validar deep link:', err);
        
        let message = 'Ocurrió un error al validar el enlace.';
        if (err.error && err.error.status_text) {
          message = err.error.status_text;
        } else if (err.status === 0) {
          message = 'No se pudo conectar con el servidor. Verifique su conexión.';
        }
        
        this.showError(message);
      }
    });
  }

  /**
   * Confirma un turno automáticamente
   */
  private confirmarTurno(turnoId: number): void {
    this.confirmingAppointment = true;
    
    this.turnoService.confirmar(turnoId).subscribe({
      next: (response) => {
        if (response.status_code === 200) {
          console.log('✅ Turno confirmado exitosamente:', response);
          this.showSuccess();
          
          // Guardar mensaje de confirmación para mostrar en la agenda
          sessionStorage.setItem('turno_confirmado', JSON.stringify({
            turnoId: turnoId,
            mensaje: 'Tu turno ha sido confirmado exitosamente desde el correo electrónico.'
          }));
          
          setTimeout(() => {
            this.router.navigate(['/paciente-dashboard']);
          }, 2000);
        } else {
          this.showError(response.status_text || 'No se pudo confirmar el turno.');
        }
      },
      error: (err) => {
        console.error('❌ Error al confirmar turno:', err);
        
        let message = 'Ocurrió un error al confirmar el turno.';
        if (err.error && err.error.status_text) {
          message = err.error.status_text;
        } else if (err.status === 400) {
          message = 'El turno no puede ser confirmado en este momento.';
        } else if (err.status === 404) {
          message = 'El turno no fue encontrado.';
        }
        
        this.showError(message);
      }
    });
  }

  /**
   * Muestra un mensaje de error
   */
  private showError(message: string): void {
    this.loading = false;
    this.error = true;
    this.success = false;
    this.confirmingAppointment = false;
    this.errorMessage = message;
  }

  /**
   * Muestra un mensaje de éxito
   */
  private showSuccess(): void {
    this.loading = false;
    this.error = false;
    this.success = true;
    this.confirmingAppointment = false;
  }

  /**
   * Redirige al login
   */
  goToLogin(): void {
    this.router.navigate(['/ingresar']);
  }
}
