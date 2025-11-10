import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, ChangePasswordRequest, UpdateProfileRequest } from '../inicio-sesion/auth.service';
import { ModalService } from '../modal/modal.service';

@Component({
  selector: 'app-operador-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './operador-perfil.component.html', 
  styleUrl: './operador-perfil.component.css'
})
export class OperadorPerfilComponent implements OnInit {
  changePasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  systemConfig = {
    notifications: true,
    autoRefresh: true
  };

  userData = {
    nombre: '',
    email: '',
    apellido: '',
    telefono: '',
    dni: ''
  };
  editUserData = {
    nombre: '',
    email: '',
    apellido: '',
    telefono: '',
    dni: ''
  };
  editMode = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    this.loadUserConfig();
    this.loadUserData();
  }

  goBack() {
    this.router.navigate(['/operador-dashboard']);
  }

  getUserRole(): string {
    return this.authService.getUserRole() || 'No disponible';
  }

  loadUserData() {
    // Cargar datos básicos del token JWT
    this.userData.nombre = this.authService.getUserName() || '';
    this.userData.email = this.authService.getUserEmail() || '';
    
    // Intentar cargar datos adicionales del localStorage si existen
    try {
      const currentUserStr = localStorage.getItem('currentUser');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        this.userData.apellido = currentUser.apellido || '';
        this.userData.telefono = currentUser.telefono || '';
        this.userData.dni = currentUser.dni || '';
        // Sobreescribir datos básicos si están en currentUser
        this.userData.nombre = currentUser.nombre || this.userData.nombre;
        this.userData.email = currentUser.email || this.userData.email;
      }
    } catch (error) {
      console.error('Error loading additional user data:', error);
    }
    
    this.editUserData = { ...this.userData };
  }

  editPersonalData() {
    this.editUserData = { ...this.userData };
    this.editMode = true;
  }

  cancelEdit() {
    this.editUserData = { ...this.userData };
    this.editMode = false;
  }

  savePersonalData() {
    // Validar datos antes de enviar
    if (!this.editUserData.nombre || !this.editUserData.email) {
      this.modalService.alert('Error', 'El nombre y el email son obligatorios');
      return;
    }

    // Preparar request para el backend
    const updateRequest: UpdateProfileRequest = {
      nombre: this.editUserData.nombre,
      apellido: this.editUserData.apellido || '',
      email: this.editUserData.email,
      telefono: this.editUserData.telefono || '',
      dni: this.editUserData.dni || ''
    };

    // Llamar al servicio para actualizar en backend
    this.authService.updateProfile(updateRequest).subscribe({
      next: (response) => {
        if (response.status_code === 200) {
          // Actualizar datos locales con la respuesta del servidor
          this.userData = { ...this.editUserData };
          this.editMode = false;
          this.modalService.alert('Éxito', 'Datos personales actualizados correctamente');
        } else {
          this.modalService.alert('Error', response.status_text || 'Error al actualizar los datos');
        }
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.modalService.alert('Error', 'Error al conectar con el servidor');
      }
    });
  }

  changePassword() {
    if (!this.changePasswordForm.currentPassword || 
        !this.changePasswordForm.newPassword || 
        !this.changePasswordForm.confirmPassword) {
      this.modalService.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    if (this.changePasswordForm.newPassword !== this.changePasswordForm.confirmPassword) {
      this.modalService.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (this.changePasswordForm.newPassword.length < 6) {
      this.modalService.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    const request: ChangePasswordRequest = {
      currentPassword: this.changePasswordForm.currentPassword,
      newPassword: this.changePasswordForm.newPassword,
      confirmPassword: this.changePasswordForm.confirmPassword
    };

    this.authService.changePassword(request).subscribe({
      next: () => {
        this.modalService.alert('Éxito', 'Contraseña cambiada correctamente');
        this.changePasswordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
      },
      error: (error) => {
        const message = error?.error?.status_text || 'Error al cambiar la contraseña';
        this.modalService.alert('Error', message);
      }
    });
  }

  saveSystemConfig() {
    localStorage.setItem('operador-config', JSON.stringify(this.systemConfig));
    this.modalService.alert('Éxito', 'Configuración guardada correctamente');
  }

  private loadUserConfig() {
    const savedConfig = localStorage.getItem('operador-config');
    if (savedConfig) {
      this.systemConfig = { ...this.systemConfig, ...JSON.parse(savedConfig) };
    }
  }
}