import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminManagementService } from '../services/admin-management.service';
import { DataPackage } from '../data.package';
import { UserContextService } from '../services/user-context.service';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { CentroAtencion } from '../centrosAtencion/centroAtencion';

@Component({
  selector: 'app-admin-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-detail.component.html',
  styleUrls: ['./admin-detail.component.css']
})
export class AdminDetailComponent {
  form: any;
  isSubmitting = false;
  
  // Multi-tenant: Control de acceso y selector de centro
  isSuperAdmin: boolean = false;
  centrosDisponibles: CentroAtencion[] = [];
  loadingCentros: boolean = false;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminManagementService,
    public router: Router,
    public route: ActivatedRoute,
    private userContextService: UserContextService,
    private centroAtencionService: CentroAtencionService
  ) {}

  ngOnInit(): void {
    // Verificar si es SUPERADMIN
    this.isSuperAdmin = this.userContextService.isSuperAdmin;
    
    // Configurar formulario
    const formConfig: any = {
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dni: ['', Validators.required],
      telefono: ['']
    };
    
    // Si es SUPERADMIN, agregar campo obligatorio de centro
    if (this.isSuperAdmin) {
      formConfig.centroAtencionId = ['', Validators.required];
    }
    
    this.form = this.fb.group(formConfig);
    
    // Cargar centros disponibles si es SUPERADMIN
    if (this.isSuperAdmin) {
      this.cargarCentrosDisponibles();
    }
    
    const id = this.route.snapshot.params['id'];
    if (id) {
      // Para edición futura: cargar datos
      this.adminService.getAdmin(+id).subscribe({
        next: (pkg: DataPackage) => {
          const data: any = pkg.data;
          this.form.patchValue({
            nombre: data.nombre,
            apellido: data.apellido,
            email: data.email,
            dni: data.dni,
            telefono: data.telefono,
            centroAtencionId: data.centroAtencionId
          });
        }
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    
    const payload: any = {
      nombre: this.form.value.nombre,
      apellido: this.form.value.apellido,
      email: this.form.value.email,
      dni: this.form.value.dni,
      telefono: this.form.value.telefono
      // No enviamos password - el backend lo genera automáticamente
    };
    
    // Backend espera centroId (número) no centroAtencion (objeto)
    if (this.isSuperAdmin && this.form.value.centroAtencionId) {
      payload.centroId = this.form.value.centroAtencionId;
    }
    
    console.log('Payload para crear admin:', payload);
    
    this.adminService.createAdmin(payload).subscribe({
      next: (pkg: DataPackage) => {
        this.isSubmitting = false;
        
        // Verificar el status_code dentro del DataPackage, no el HTTP status
        if (pkg.status_code === 200 || pkg.status_code === 201) {
          alert('Administrador creado exitosamente. Se ha enviado un email con el link de activación y las instrucciones para configurar la contraseña.');
          this.router.navigate(['/admin/users']);
        } else {
          // Mostrar el mensaje de error del backend
          alert(`Error: ${pkg.status_text || 'No se pudo crear el administrador'}`);
        }
      },
      error: (err) => {
        console.error('Error de red creando admin', err);
        this.isSubmitting = false;
        alert('Error de conexión. Por favor, intente nuevamente.');
      }
    });
  }
  
  /**
   * Carga la lista de centros disponibles para asignar al administrador
   */
  private cargarCentrosDisponibles(): void {
    this.loadingCentros = true;
    this.centroAtencionService.all().subscribe({
      next: (dataPackage: DataPackage<CentroAtencion[]>) => {
        this.centrosDisponibles = dataPackage.data;
        this.loadingCentros = false;
      },
      error: (error: any) => {
        console.error('Error al cargar centros:', error);
        this.loadingCentros = false;
        alert('Error al cargar la lista de centros.');
      }
    });
  }
}
