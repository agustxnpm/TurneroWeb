import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { Router } from "@angular/router";
import {
  fadeInAnimation,
  slideUpAnimation,
  pulseAnimation,
  logoAnimation,
} from "../animations";
import { AuthService, LoginData } from "./auth.service";
import { AgendaService } from "../agenda/agenda.service";
import { TurnoService } from "../turnos/turno.service";
import { ModalService } from "../modal/modal.service";
import { UserContextService } from "../services/user-context.service";
import { SocialAuthService, SocialUser, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { CompleteProfileComponent } from "../modal/complete-profile/complete-profile.component";

interface User {
  email: string;
  password: string;
  name: string;
  role: string;
  roleClass: string;
}

@Component({
  selector: "app-inicio-sesion",
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleSigninButtonModule],
  templateUrl: "./inicio-sesion.component.html",
  styleUrl: "./inicio-sesion.component.css",
  animations: [
    fadeInAnimation,
    slideUpAnimation,
    pulseAnimation,
    logoAnimation,
  ],
})
export class InicioSesionComponent implements OnInit {
  currentStep: "email" | "password" = "email";
  isLoading = false;
  showPassword = false;
  showEmailError = false;
  showPasswordError = false;
  errorMessage = ""; // Mensaje específico de error
  userAccount: User | null = null;
  pulseState = "idle";

  loginData: LoginData = {
    email: "",
    password: "",
    rememberMe: false,
  };


  constructor(
    private router: Router, 
    private authService: AuthService,
    private agendaService: AgendaService,
    private turnoService: TurnoService,
    private modalService: ModalService,
    private userContextService: UserContextService,
    private socialAuthService: SocialAuthService
  ) {
    // Verificar si el usuario ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
      return;
    }

  }

  ngOnInit(): void {
    // Suscribirse al estado de autenticación social
    this.socialAuthService.authState.subscribe((user: SocialUser) => {
      if (user && user.idToken) {
        console.log('Login con Google exitoso. ID Token recibido');
        
        // Activar estado de carga
        this.isLoading = true;
        
        // Llamar al método del AuthService para enviar el token al backend
        this.authService.loginWithGoogle(user.idToken).subscribe({
          next: (response) => {
            console.log('✅ Autenticación con el backend exitosa');
            
            // Guardar userRole en localStorage para compatibilidad con guards existentes
            const role = this.authService.getUserRole();
            if (role) {
              const roleRoute = this.authService.mapRoleToRoute(role);
              localStorage.setItem("userRole", roleRoute);
            }

            // ========================================
            // VERIFICAR SI EL PERFIL ESTÁ COMPLETO
            // ========================================
            const profileCompleted = this.userContextService.isProfileCompleted();
            
            if (!profileCompleted) {
              console.log('⚠️ Perfil incompleto detectado. Mostrando modal de completar perfil...');
              this.isLoading = false;
              
              // Abrir el modal de completar perfil
              const modalRef = this.modalService.open(CompleteProfileComponent, {
                backdrop: 'static',
                keyboard: false
              });
              
              // Cuando el modal se cierre (perfil completado), continuar con el flujo
              modalRef.result.then(
                () => {
                  console.log('✅ Modal cerrado - Perfil completado');
                  this.continuarDespuesDeCompletarPerfil();
                },
                (reason) => {
                  console.log('Modal descartado:', reason);
                  // No se debería llegar aquí ya que el modal no se puede cerrar sin completar
                }
              );
            } else {
              // Perfil completo, continuar con el flujo normal
              this.continuarDespuesDeCompletarPerfil();
            }
          },
          error: (err) => {
            console.error('❌ Error durante el login con Google en el backend:', err);
            this.errorMessage = err.error?.status_text || 'Hubo un problema al iniciar sesión con Google. Por favor, inténtelo de nuevo.';
            this.showPasswordError = true;
            this.isLoading = false;
          }
        });
      }
    });
  }

  /**
   * Continúa con el flujo de redirección después de completar el perfil
   * o si el perfil ya estaba completo
   */
  private continuarDespuesDeCompletarPerfil(): void {
    // ========================================
    // VERIFICAR SI HAY UN TURNO PRE-SELECCIONADO
    // ========================================
    const turnoPreseleccionado = localStorage.getItem('turnoSeleccionadoId');
    
    if (turnoPreseleccionado) {
      console.log('🎯 Turno preseleccionado detectado:', turnoPreseleccionado);
      this.procesarReservaAutomatica(turnoPreseleccionado);
    } else {
      // Flujo normal: redirigir según el rol
      this.authService.redirectByRole();
      this.isLoading = false;
    }
  }

  handleSubmit(form: NgForm): void {
    if (this.currentStep === "email") {
      this.handleEmailSubmit();
    } else if (this.currentStep === "password") {
      this.handlePasswordSubmit();
    }
  }

  private handleEmailSubmit(): void {
    if (!this.validateEmailStep()) {
      return;
    }

    this.isLoading = true;

    // Verificar email en la base de datos
    this.authService.checkEmail(this.loginData.email).subscribe({
      next: (response) => {
        if (response.status_code === 200 && response.data) {
          // Email encontrado, crear objeto de usuario con la información
          this.userAccount = {
            email: response.data.email,
            password: '', // No necesitamos la contraseña aquí
            name: response.data.nombre,
            role: response.data.role,
            roleClass: this.getRoleClass(response.data.role)
          };
          
          this.currentStep = 'password';
          this.isLoading = false;
          
          setTimeout(() => {
            const passwordField = document.getElementById('password');
            if (passwordField) {
              passwordField.focus();
            }
          }, 100);
        } else {
          // Email no encontrado
          this.showEmailError = true;
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error verificando email:', error);
        // Si hay error o email no encontrado, mostrar mensaje de error
        this.showEmailError = true;
        this.isLoading = false;
      }
    });
  }

  private handlePasswordSubmit(): void {
    if (!this.validatePasswordStep()) {
      return;
    }

    this.isLoading = true;

    // Usar el AuthService para hacer login real
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        if (response.status_code === 200) {
          console.log(`Login exitoso:`);

          // Guardar userRole en localStorage para compatibilidad con guards existentes
          const role = this.authService.getUserRole();
          if (role) {
            const roleRoute = this.authService.mapRoleToRoute(role);
            localStorage.setItem("userRole", roleRoute);
          }

          // ========================================
          // VERIFICAR SI HAY UN TURNO PRE-SELECCIONADO
          // ========================================
          const turnoPreseleccionado = localStorage.getItem('turnoSeleccionadoId');
          
          if (turnoPreseleccionado) {
            console.log('🎯 Turno preseleccionado detectado:', turnoPreseleccionado);
            this.procesarReservaAutomatica(turnoPreseleccionado);
          } else {
            // Flujo normal: redirigir según el rol
            this.authService.redirectByRole();
            this.isLoading = false;
          }
        } else {
          // Manejar errores cuando status_code !== 200
          console.error("Error en login:", response.status_text || response.message);
          this.errorMessage = response.status_text || response.message || "Error al iniciar sesión";
          this.showPasswordError = true;
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error("Error en login:", error);
        this.errorMessage = error.message || "Error al iniciar sesión";
        this.showPasswordError = true;
        this.isLoading = false;
      },
    });
  }

  /**
   * Procesa la reserva automática de un turno después del login
   */
  private procesarReservaAutomatica(turnoIdStr: string): void {
    const turnoId = parseInt(turnoIdStr, 10);
    
    // Usar el método del AuthService que busca el pacienteId de forma robusta
    const pacienteId = this.authService.getCurrentPatientId();

    if (!pacienteId) {
      console.error('❌ No se encontró pacienteId después del login');
      this.modalService.alert(
        'Error al Obtener Información',
        'No se pudo recuperar la información del paciente. Por favor, intente reservar el turno manualmente desde su panel de control.'
      );
      localStorage.removeItem('turnoSeleccionadoId');
      this.authService.redirectByRole();
      this.isLoading = false;
      return;
    }

    console.log('📅 Iniciando reserva automática del turno ID:', turnoId, 'para paciente ID:', pacienteId);

    // Obtener todos los eventos usando AgendaService
    this.agendaService.obtenerTodosLosEventos(4).subscribe({
      next: (eventos: any[]) => {
        const slotEncontrado = eventos.find((e: any) => e.id === turnoId);

        if (!slotEncontrado) {
          console.error('❌ No se encontró el turno preseleccionado');
          this.modalService.alert(
            'Turno no disponible',
            'El turno seleccionado ya no está disponible. Por favor, seleccione otro turno desde el calendario.'
          );
          localStorage.removeItem('turnoSeleccionadoId');
          this.router.navigate(['/paciente-dashboard']);
          this.isLoading = false;
          return;
        }

        // Verificar si el slot sigue disponible
        if (slotEncontrado.ocupado) {
          console.warn('⚠️ El turno ya fue reservado por otro usuario');
          this.modalService.alert(
            'Turno ya reservado',
            'Lo sentimos, el turno que seleccionó ya fue reservado por otro usuario. Por favor, seleccione otro turno disponible.'
          );
          localStorage.removeItem('turnoSeleccionadoId');
          this.router.navigate(['/paciente-dashboard']);
          this.isLoading = false;
          return;
        }

        // Construir el TurnoDTO completo con todos los campos requeridos
        const turnoDTO = {
          id: slotEncontrado.id,
          fecha: slotEncontrado.fecha,
          horaInicio: slotEncontrado.horaInicio,
          horaFin: slotEncontrado.horaFin,
          pacienteId: pacienteId,
          staffMedicoId: slotEncontrado.staffMedicoId,
          staffMedicoNombre: slotEncontrado.staffMedicoNombre,
          staffMedicoApellido: slotEncontrado.staffMedicoApellido,
          especialidadStaffMedico: slotEncontrado.especialidadStaffMedico,
          consultorioId: slotEncontrado.consultorioId,
          consultorioNombre: slotEncontrado.consultorioNombre,
          centroId: slotEncontrado.centroId,
          nombreCentro: slotEncontrado.nombreCentro,
          estado: "PROGRAMADO"
        };

        console.log('📤 Enviando reserva automática del turno:', turnoDTO);
        
        // Usar TurnoService para asignar el turno (endpoint correcto: POST /turno/asignar)
        this.turnoService.asignarTurno(turnoDTO).subscribe({
          next: () => {
            console.log('✅ Turno reservado automáticamente con éxito');
            this.modalService.alert(
              '¡Reserva Exitosa!',
              'Su turno ha sido reservado correctamente. Será redirigido a su panel de control.'
            );
            localStorage.removeItem('turnoSeleccionadoId');
            
            // Redirigir después de un pequeño delay para que el usuario vea el modal
            setTimeout(() => {
              this.router.navigate(['/paciente-dashboard']);
              this.isLoading = false;
            }, 2000);
          },
          error: (err: any) => {
            console.error('❌ Error al reservar el turno automáticamente:', err);
            this.modalService.alert(
              'Error en la Reserva',
              'No se pudo reservar el turno automáticamente. Por favor, intente reservarlo manualmente desde su panel de control.'
            );
            localStorage.removeItem('turnoSeleccionadoId');
            this.router.navigate(['/paciente-dashboard']);
            this.isLoading = false;
          }
        });
      },
      error: (err: any) => {
        console.error('❌ Error al obtener información del turno:', err);
        this.modalService.alert(
          'Error de Conexión',
          'No se pudo obtener la información del turno. Por favor, intente reservarlo manualmente desde su panel de control.'
        );
        localStorage.removeItem('turnoSeleccionadoId');
        this.router.navigate(['/paciente-dashboard']);
        this.isLoading = false;
      }
    });
  }

  private validateEmailStep(): boolean {
    this.clearEmailErrors();

    const email = this.loginData.email.trim();

    if (!email) {
      return false;
    }

    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailPattern.test(email.toLowerCase())) {
      return false;
    }

    return true;
  }

  private validatePasswordStep(): boolean {
    this.clearPasswordErrors();

    const password = this.loginData.password;

    if (!password || password.length < 8) {
      return false;
    }

    return true;
  }

  /**
   * Mapea el rol del backend a la clase CSS correspondiente
   * @param role Rol del backend
   * @returns Clase CSS para el rol
   */
  private getRoleClass(role: string): string {
    const roleMapping: { [key: string]: string } = {
      'PACIENTE': 'paciente',
      'MEDICO': 'medico',
      'OPERARIO': 'operador',
      'ADMINISTRADOR': 'admin'
    };
    return roleMapping[role] || 'paciente';
  }


  changeAccount(): void {
    this.currentStep = "email";
    this.userAccount = null;
    this.loginData.password = "";
    this.clearAllErrors();

    // Enfocar el campo de email
    setTimeout(() => {
      const emailField = document.getElementById("email");
      if (emailField) {
        emailField.focus();
      }
    }, 100);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  clearEmailErrors(): void {
    this.showEmailError = false;
  }

  clearPasswordErrors(): void {
    this.showPasswordError = false;
    this.errorMessage = "";
  }

  private clearAllErrors(): void {
    this.clearEmailErrors();
    this.clearPasswordErrors();
  }

  navigateToRegister(): void {
    // Trigger pulse animation
    this.pulseState = "clicked";

    // Navigate after a short delay for the animation
    this.router.navigate(["/registro-usuario"]);
    this.pulseState = "idle";
  }

  forgotEmail(): void {
    // Implementar lógica para recuperar email
    alert("Funcionalidad de recuperar email - Por implementar");
  }

  forgotPassword(): void {
    // Redirigir a la pantalla de recuperación de contraseña
    this.router.navigate(['/recuperar-contrasena']);
  }

  /**
   * Método de logout para uso futuro
   */
  logout(): void {
    this.authService.logout();
  }
}
