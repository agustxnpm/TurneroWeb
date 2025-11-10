import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PacienteService } from '../../pacientes/paciente.service';
import { ModalService } from '../modal.service';
import { Router } from '@angular/router';

/**
 * Interfaz para los datos del formulario de completar perfil
 */
export interface CompleteProfileData {
  dni: number;
  telefono: string;
  fechaNacimiento: string; // Formato YYYY-MM-DD
  obraSocialId?: number;
}

/**
 * Modal para completar el perfil de usuarios registrados con Google
 * 
 * Este componente se muestra automáticamente después del primer login con Google
 * para solicitar datos obligatorios que no se obtienen de Google (DNI, teléfono, fecha de nacimiento)
 */
@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.css']
})
export class CompleteProfileComponent implements OnInit {
  
  profileForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  
  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private modalService: ModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Inicializa el formulario reactivo con validaciones
   */
  private initializeForm(): void {
    this.profileForm = this.fb.group({
      dni: ['', [
        Validators.required,
        Validators.min(1000000),
        Validators.max(99999999)
      ]],
      telefono: ['', [
        Validators.required,
        Validators.pattern(/^[0-9\-\+\s\(\)]{8,20}$/), // Formato flexible para teléfonos
        Validators.minLength(8)
      ]],
      fechaNacimiento: ['', [
        Validators.required,
        this.dateValidator.bind(this)
      ]],
      obraSocialId: [null] // Opcional
    });
  }

  /**
   * Validador personalizado para la fecha de nacimiento
   * Verifica que la fecha sea válida
   */
  private dateValidator(control: any): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;

    const today = new Date();
    const birthDate = new Date(value);
    
    // Verificar que la fecha no sea futura
    if (birthDate > today) {
      return { futureDate: true };
    }

    // Calcular edad para verificar edad máxima razonable
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Verificar edad máxima razonable (120 años)
    if (age > 120) {
      return { tooOld: true };
    }

    return null;
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getErrorMessage(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }

    switch (fieldName) {
      case 'dni':
        if (control.errors['pattern'] || control.errors['min'] || control.errors['max']) {
          return 'El DNI debe tener entre 7 y 9 dígitos';
        }
        break;
      
      case 'telefono':
        if (control.errors['pattern'] || control.errors['minLength']) {
          return 'Ingrese un teléfono válido';
        }
        break;
      
      case 'fechaNacimiento':
        if (control.errors['futureDate'] || control.errors['tooOld'] ) {
          return 'Por favor, verifique la fecha de nacimiento';
        }
        break;
    }

    return 'Campo inválido';
  }

  /**
   * Maneja el envío del formulario
   */
  onSubmit(): void {
    if (this.profileForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formData = this.profileForm.value;
    
    // Convertir la fecha al formato esperado por el backend (si es necesario)
    const profileData: CompleteProfileData = {
      dni: parseInt(formData.dni),
      telefono: formData.telefono,
      fechaNacimiento: formData.fechaNacimiento, // Ya está en formato YYYY-MM-DD del input type="date"
      obraSocialId: formData.obraSocialId || null
    };

    this.pacienteService.completeProfile(profileData).subscribe({
      next: (response) => {
        console.log('✅ Perfil completado exitosamente:', response);
        
        // Cerrar el modal y navegar al dashboard
        this.modalService.close();
        
        // Pequeño delay para asegurar que el modal se cierra antes de navegar
        setTimeout(() => {
          this.router.navigate(['/paciente-dashboard']);
        }, 100);
      },
      error: (error) => {
        console.error('❌ Error al completar perfil:', error);
        this.isSubmitting = false;
        
        // Extraer mensaje de error del backend
        if (error.error?.status_text) {
          this.errorMessage = error.error.status_text;
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Error al completar el perfil. Por favor, intente nuevamente.';
        }
      }
    });
  }

  /**
   * Intenta cerrar el modal (se puede prevenir si es obligatorio)
   */
  onCancel(): void {
    // En este caso, NO permitimos cancelar porque el perfil debe completarse
    this.modalService.alert(
      'Perfil Incompleto',
      'Debe completar su perfil antes de continuar. Estos datos son necesarios para utilizar el sistema.'
    );
  }

  /**
   * Obtiene la fecha máxima permitida (hoy)
   * Para evitar que se seleccionen fechas futuras
   */
  getMaxDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
