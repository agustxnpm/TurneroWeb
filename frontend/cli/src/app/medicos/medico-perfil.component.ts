import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MedicoService } from './medico.service';
import { Medico } from './medico';
import { AuthService, ChangePasswordRequest } from '../inicio-sesion/auth.service';
import { StaffMedicoService } from '../staffMedicos/staffMedico.service';

interface ConfiguracionNotificaciones {
  emailTurnos: boolean;
  emailCancelaciones: boolean;
  emailRecordatorios: boolean;
  smsNotificaciones: boolean;
}

interface CambioPassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-medico-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './medico-perfil.component.html',
  styleUrl: './medico-perfil.component.css'
})
export class MedicoPerfilComponent implements OnInit {
  medicoActual: Medico | null = null;
  cargando = true;
  
  // Profile editing properties
  editandoPerfil = false;
  perfilForm: FormGroup;
  cargandoGuardado = false;
  
  // Password form properties
  passwordForm: FormGroup;
  cargandoCambioPassword = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  // Notifications
  configuracionNotificaciones: ConfiguracionNotificaciones = {
    emailTurnos: true,
    emailCancelaciones: true,
    emailRecordatorios: true,
    smsNotificaciones: false
  };
  
  // Particles for background animation
  particles: Array<{x: number, y: number}> = [];

  constructor(
    private router: Router,
    private medicoService: MedicoService,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private staffMedicoService: StaffMedicoService
  ) {
    this.initializeParticles();
    this.passwordForm = this.initializePasswordForm();
    this.perfilForm = this.initializePerfilForm();
  }

  async ngOnInit() {
    // Asegurar que staffMedicoId esté disponible en localStorage
    await this.getOrFetchStaffMedicoId();
    this.cargarDatosMedico();
    this.cargarConfiguracionNotificaciones();
  }

  private cargarDatosMedico() {
    const medicoId = this.getMedicoIdFromSession();
    
    if (!medicoId || medicoId === 0) {
      console.error('No se pudo obtener el ID del médico');
      this.router.navigate(['/login']);
      return;
    }
    
    this.medicoService.findById(medicoId).subscribe({
      next: (medico) => {
        this.medicoActual = medico;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del médico:', error);
        this.cargando = false;
        if (error.status === 404) {
          alert('No se encontraron los datos del médico. Verifique su sesión.');
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private cargarConfiguracionNotificaciones() {
    // TODO: Implementar carga de configuración desde el backend
    // Por ahora usamos valores por defecto
    const configGuardada = localStorage.getItem('notificacionesMedico');
    if (configGuardada) {
      try {
        this.configuracionNotificaciones = JSON.parse(configGuardada);
      } catch (e) {
        console.error('Error al cargar configuración de notificaciones:', e);
      }
    }
  }

  // Notifications
  guardarConfiguracionNotificaciones() {
    // TODO: Implementar guardado en el backend
    localStorage.setItem('notificacionesMedico', JSON.stringify(this.configuracionNotificaciones));
    alert('Configuración de notificaciones guardada');
  }

  // Navigation and actions
  volver() {
    this.router.navigate(['/medico-dashboard']);
  }

  editarPerfil() {
    if (!this.medicoActual) {
      alert('Error: No hay datos del médico para editar');
      return;
    }
    
    // Llenar el formulario con los datos actuales
    this.perfilForm.patchValue({
      nombre: this.medicoActual.nombre || '',
      apellido: this.medicoActual.apellido || '',
      dni: this.medicoActual.dni || '',
      matricula: this.medicoActual.matricula || '',
      email: this.medicoActual.email || '',
      telefono: this.medicoActual.telefono || ''
    });
    
    // Activar modo edición
    this.editandoPerfil = true;
  }

  guardarPerfil() {
    if (!this.perfilForm.valid || this.cargandoGuardado) {
      return;
    }

    const medicoId = this.getMedicoIdFromSession();
    if (!medicoId || medicoId === 0) {
      alert('Error: No se pudo obtener la información del médico');
      return;
    }

    this.cargandoGuardado = true;

    // Preparar datos para el backend - manejar valores nulos/vacíos correctamente
    const emailValue = this.perfilForm.get('email')?.value?.trim();
    const telefonoValue = this.perfilForm.get('telefono')?.value?.trim();
    
    const datosActualizados = {
      id: medicoId,
      nombre: this.perfilForm.get('nombre')?.value?.trim() || '',
      apellido: this.perfilForm.get('apellido')?.value?.trim() || '',
      dni: this.perfilForm.get('dni')?.value?.trim() || '',
      email: emailValue || this.medicoActual?.email || '',
      telefono: telefonoValue || this.medicoActual?.telefono || '',
      matricula: this.perfilForm.get('matricula')?.value?.trim() || '',
      // Mantener las especialidades existentes
      especialidades: this.medicoActual?.especialidades || []
    };

    console.log('Datos a enviar al backend:', datosActualizados);

    // Llamar al servicio para actualizar
    this.medicoService.update(medicoId, datosActualizados).subscribe({
      next: (response) => {
        console.log('Perfil actualizado:', response);
        
        // Actualizar el objeto medicoActual con los nuevos datos
        if (this.medicoActual) {
          this.medicoActual.nombre = datosActualizados.nombre;
          this.medicoActual.apellido = datosActualizados.apellido;
          this.medicoActual.dni = datosActualizados.dni;
          this.medicoActual.email = datosActualizados.email;
          this.medicoActual.telefono = datosActualizados.telefono;
          this.medicoActual.matricula = datosActualizados.matricula;
        }
        
        // Salir del modo edición
        this.editandoPerfil = false;
        this.cargandoGuardado = false;
        
        alert('Perfil actualizado exitosamente');
      },
      error: (error) => {
        console.error('Error al actualizar perfil:', error);
        this.cargandoGuardado = false;
        
        let mensajeError = 'Error al actualizar el perfil';
        if (error?.error?.message) {
          mensajeError = error.error.message;
        } else if (typeof error?.error === 'string') {
          mensajeError = error.error;
        }
        
        alert(`Error: ${mensajeError}`);
      }
    });
  }

  cancelarEdicion() {
    // Confirmar cancelación si hay cambios sin guardar
    if (this.perfilForm.dirty) {
      const confirmar = confirm('¿Estás seguro de cancelar? Se perderán los cambios no guardados.');
      if (!confirmar) {
        return;
      }
    }
    
    // Salir del modo edición y resetear formulario
    this.editandoPerfil = false;
    this.perfilForm.reset();
    this.cargandoGuardado = false;
  }

  // Utility methods
  tieneEspecialidades(): boolean {
    return this.medicoActual?.especialidades != null && this.medicoActual.especialidades.length > 0;
  }

  getEspecialidades() {
    return this.medicoActual?.especialidades || [];
  }

  private getMedicoIdFromSession(): number {
    console.log('=== DEBUG getMedicoIdFromSession (Perfil) ===');
    
    // Recopilar datos del localStorage
    const datos = {
      staffMedicoId: localStorage.getItem('staffMedicoId'),
      medicoId: localStorage.getItem('medicoId'),
      userId: localStorage.getItem('userId'),
      id: localStorage.getItem('id'),
      currentUser: localStorage.getItem('currentUser')
    };
    
    console.log('Datos en localStorage:', datos);
    
    // Intentar obtener ID desde diferentes fuentes
    let id = 0;
    
    // ⚠️ IMPORTANTE: PRIMERO medicoId, NUNCA staffMedicoId para autenticación
    
    // 1. Intentar desde medicoId directo (CORRECTO)
    if (datos.medicoId && datos.medicoId !== 'null') {
      id = parseInt(datos.medicoId, 10);
      console.log('✅ ID obtenido desde medicoId:', id);
    }
    
    // 2. Intentar parsear currentUser JSON
    else if (datos.currentUser && datos.currentUser !== 'null') {
      try {
        const currentUser = JSON.parse(datos.currentUser);
        if (currentUser && currentUser.medicoId) {
          id = parseInt(currentUser.medicoId, 10);
          console.log('✅ ID obtenido desde currentUser.medicoId:', id);
        } else if (currentUser && currentUser.id && currentUser.id !== parseInt(datos.staffMedicoId || '0', 10)) {
          id = parseInt(currentUser.id, 10);
          console.log('✅ ID obtenido desde currentUser.id:', id);
        }
      } catch (e) {
        console.error('Error al parsear currentUser:', e);
      }
    }
    
    // 3. Como ÚLTIMO recurso, otros campos (PERO NO staffMedicoId para auth)
    else if (datos.userId && datos.userId !== 'null') {
      id = parseInt(datos.userId, 10);
      console.log('⚠️ ID obtenido desde userId (fallback):', id);
    }
    
    // NUNCA usar staffMedicoId para autenticación de médico
    if (id === parseInt(datos.staffMedicoId || '0', 10) && id !== 0) {
      console.error('🚨 ALERTA: Se detectó que medicoId === staffMedicoId. Esto puede causar errores!');
      console.error('MedicoId:', id, 'StaffMedicoId:', datos.staffMedicoId);
    }
    
    // Validar que el ID sea válido
    if (!id || isNaN(id) || id <= 0) {
      console.error('No se pudo obtener un ID válido del médico');
      return 0;
    }
    
    console.log('ID final obtenido:', id);
    console.log('=== FIN DEBUG ===');
    
    return id;
  }

  // Helper method to get or fetch staffMedicoId and store it in localStorage
  private getOrFetchStaffMedicoId(): Promise<number | null> {
    return new Promise((resolve) => {
      // First try to get staffMedicoId from localStorage
      const staffMedicoIdStr = localStorage.getItem('staffMedicoId');
      
      if (staffMedicoIdStr && staffMedicoIdStr !== 'null' && staffMedicoIdStr !== '0') {
        const staffMedicoId = parseInt(staffMedicoIdStr, 10);
        if (!isNaN(staffMedicoId) && staffMedicoId > 0) {
          console.log('✅ Found staffMedicoId in localStorage:', staffMedicoId);
          resolve(staffMedicoId);
          return;
        }
      }

      // If not in localStorage, fetch by medicoId
      const medicoId = this.getMedicoIdFromSession();
      if (!medicoId) {
        console.error('❌ No medicoId found to search for staffMedicoId');
        resolve(null);
        return;
      }

      console.log('🔍 Searching for StaffMedico by medicoId:', medicoId);
      
      this.staffMedicoService.all().subscribe({
        next: (response: any) => {
          const staffMedicos = response?.data || [];
          
          // Find all StaffMedicos that belong to this doctor
          const staffMedicosDelMedico = staffMedicos.filter((sm: any) => 
            sm.medico && sm.medico.id === medicoId
          );
          
          if (staffMedicosDelMedico.length > 0) {
            const staffMedicoId = staffMedicosDelMedico[0].id;
            console.log(`✅ Found ${staffMedicosDelMedico.length} StaffMedico records for doctor. Using first one:`, staffMedicoId);
            
            // Store in localStorage for future use
            localStorage.setItem('staffMedicoId', staffMedicoId.toString());
            resolve(staffMedicoId);
          } else {
            console.error('❌ No StaffMedico records found for medicoId:', medicoId);
            resolve(null);
          }
        },
        error: (error: any) => {
          console.error('❌ Error fetching StaffMedicos:', error);
          resolve(null);
        }
      });
    });
  }

  private initializeParticles() {
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight
      });
    }
  }

  // Password form initialization and validation
  private initializePasswordForm(): FormGroup {
    return this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Profile form initialization
  private initializePerfilForm(): FormGroup {
    return this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      dni: ['', [
        Validators.required,
        Validators.pattern(/^\d{7,9}$/),
        Validators.minLength(7),
        Validators.maxLength(9)
      ]],
      matricula: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]], // Email requerido y debe ser válido
      telefono: ['', [Validators.required, Validators.pattern(/^[\d\s\-\+\(\)]{7,15}$/)]] // Teléfono requerido
    });
  }

  private passwordMatchValidator(control: AbstractControl): {[key: string]: boolean} | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (!newPassword || !confirmPassword) {
      return null;
    }
    
    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  // Password methods
  cambiarPassword() {
    if (this.passwordForm.valid && !this.cargandoCambioPassword) {
      this.cargandoCambioPassword = true;
      
      const passwordData: CambioPassword = this.passwordForm.value;
      const medicoId = this.getMedicoIdFromSession();
      
      if (!medicoId || medicoId === 0) {
        alert('Error: No se pudo obtener la información del médico');
        this.cargandoCambioPassword = false;
        return;
      }
      
      // Implementación real del cambio de contraseña
      const changePasswordRequest: ChangePasswordRequest = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      };

      this.authService.changePassword(changePasswordRequest).subscribe({
        next: (response) => {
          if (response.status_code === 200) {
            alert('Contraseña cambiada exitosamente');
            this.resetPasswordForm();
          } else {
            alert('Error: ' + (response.status_text || 'No se pudo cambiar la contraseña'));
          }
          this.cargandoCambioPassword = false;
        },
        error: (error) => {
          console.error('Error al cambiar contraseña:', error);
          let errorMessage = 'Error al cambiar la contraseña. ';
          
          if (error.status === 400) {
            errorMessage += 'Verifique que su contraseña actual sea correcta y que la nueva contraseña cumpla con los requisitos.';
          } else if (error.status === 401) {
            errorMessage += 'Sesión expirada. Por favor, inicie sesión nuevamente.';
            this.router.navigate(['/ingresar']);
          } else {
            errorMessage += 'Por favor, inténtelo de nuevo más tarde.';
          }
          
          alert(errorMessage);
          this.cargandoCambioPassword = false;
        }
      });
    }
  }

  resetPasswordForm() {
    this.passwordForm.reset();
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  toggleCurrentPasswordVisibility() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  getPasswordStrength(password: string): string {
    if (!password) return 'weak';
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score < 3) return 'weak';
    if (score < 5) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(password: string): string {
    const strength = this.getPasswordStrength(password);
    switch (strength) {
      case 'weak': return 'Débil';
      case 'medium': return 'Media';
      case 'strong': return 'Fuerte';
      default: return 'Débil';
    }
  }
}
