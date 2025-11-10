import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MedicoService } from './medico.service';
import { Medico } from './medico';
import { Especialidad } from '../especialidades/especialidad';
import { EspecialidadService } from '../especialidades/especialidad.service';
import { DataPackage } from '../data.package';
import { ModalService } from '../modal/modal.service';
import { AuthService } from '../inicio-sesion/auth.service';

@Component({
  selector: 'app-medico-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './medico-detail.component.html',
  styleUrl: './medico-detail.component.css'
})
export class MedicoDetailComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  medico: Medico = { 
    id: 0, 
    nombre: '', 
    apellido: '', 
    dni: '', 
    email: '',
    telefono: '',
    matricula: '', 
    especialidades: [],
    especialidad: { id: 0, nombre: '', descripcion: '' } // Mantener para compatibilidad
  };
  especialidades: Especialidad[] = [];
  selectedEspecialidad: Especialidad | null = null;
  modoEdicion = false;
  esNuevo = false;

  constructor(
    private medicoService: MedicoService,
    private especialidadService: EspecialidadService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path;
    if (path === "medicos/new") {
      this.modoEdicion = true;
      this.esNuevo = true;
      
      this.especialidadService.all().subscribe({
        next: (dp: DataPackage<Especialidad[]>) => {
          this.especialidades = dp.data;
          
          if (!this.especialidades.length) {
            this.modalService.alert(
              "Error",
              "No hay especialidades cargadas. Debe crear al menos una especialidad antes de registrar un médico."
            );
            this.goBack();
            return;
          }
          
          this.selectedEspecialidad = this.especialidades[0];
          this.medico = {
            id: 0,
            nombre: "",
            apellido: "",
            dni: '',
            email: '',
            telefono: '',
            matricula: "",
            especialidades: [], // Inicializar como array vacío
            especialidad: this.selectedEspecialidad || this.especialidades[0] // Mantener para compatibilidad
          };
        },
        error: (err) => {
          this.modalService.alert(
            "Error",
            "No se pudieron cargar las especialidades. Por favor, intente nuevamente."
          );
          console.error('Error al cargar especialidades:', err);
        }
      });
    } else {
      // Modo edición o vista
      this.especialidadService.all().subscribe({
        next: (dp: DataPackage<Especialidad[]>) => {
          this.especialidades = dp.data;
          
          if (!this.especialidades.length) {
            this.modalService.alert(
              "Error",
              "No hay especialidades cargadas. Debe crear al menos una especialidad."
            );
            this.goBack();
            return;
          }
          
          const id = +this.route.snapshot.paramMap.get('id')!;
          this.medicoService.getById(id).subscribe({
            next: (resp: DataPackage<Medico>) => {
              this.medico = resp.data;
              
              // Asegurar que los campos obligatorios estén inicializados
              if (!this.medico.email) {
                this.medico.email = '';
              }
              if (!this.medico.telefono) {
                this.medico.telefono = '';
              }
              
              // Migración de especialidad única a especialidades múltiples
              if (!this.medico.especialidades) {
                this.medico.especialidades = [];
              }
              
              // Si viene del backend con especialidad única, convertir a array
              if (this.medico.especialidad && this.medico.especialidades.length === 0) {
                this.medico.especialidades = [this.medico.especialidad];
              }
              
              // Si no tiene especialidades pero debería tener al menos una
              if (this.medico.especialidades.length === 0 && this.especialidades.length > 0) {
                this.medico.especialidades = [this.especialidades[0]];
                this.medico.especialidad = this.especialidades[0];
              }
              
              // Verificar que todas las especialidades del médico existen en la lista
              this.medico.especialidades = this.medico.especialidades.filter(espMedico => 
                this.especialidades.some(esp => esp.id === espMedico.id)
              );
              
              // Mantener especialidad principal para compatibilidad
              if (this.medico.especialidades.length > 0) {
                this.medico.especialidad = this.medico.especialidades[0];
              }
            },
            error: (err) => {
              this.modalService.alert(
                "Error",
                "No se pudo cargar la información del médico. Por favor, intente nuevamente."
              );
              console.error('Error al cargar médico:', err);
              this.goBack();
            }
          });
          
          this.route.queryParams.subscribe(params => {
            this.modoEdicion = params['edit'] === 'true';
          });
        },
        error: (err) => {
          this.modalService.alert(
            "Error",
            "No se pudieron cargar las especialidades. Por favor, intente nuevamente."
          );
          console.error('Error al cargar especialidades:', err);
          this.goBack();
        }
      });
    }
  }

  save(): void {
    if (!this.form.valid) {
      this.modalService.alert(
        "Error", 
        "Por favor, complete correctamente todos los campos requeridos."
      );
      return;
    }
    
    if (!this.medico.especialidades || this.medico.especialidades.length === 0) {
      this.modalService.alert(
        "Error", 
        "Debe seleccionar al menos una especialidad."
      );
      return;
    }
    
    const userRole = this.authService.getUserRole();
    let op;

    if (this.medico.id) {
      // Para actualizaciones, siempre usar update
      const medicoParaEnviar = {
        id: this.medico.id,
        nombre: this.medico.nombre,
        apellido: this.medico.apellido,
        dni: this.medico.dni,
        email: this.medico.email,
        telefono: this.medico.telefono,
        matricula: this.medico.matricula,
        especialidades: this.medico.especialidades
      };
      op = this.medicoService.update(this.medico.id, medicoParaEnviar);
    } else {
      // Para creaciones, usar el endpoint correcto según el tipo de usuario
      const userEmail = this.authService.getUserEmail();
      const userData = this.authService.getUserData();
      
      // Preparar el médico con la información de auditoría  
      const medicoToCreate = {
        id: this.medico.id,
        nombre: this.medico.nombre,
        apellido: this.medico.apellido,
        dni: this.medico.dni,
        email: this.medico.email,
        telefono: this.medico.telefono,
        matricula: this.medico.matricula,
        especialidades: this.medico.especialidades,
        performedBy: userEmail || userData?.email || userRole || "UNKNOWN"
      };

      if (userRole === "ADMINISTRADOR") {
        op = this.medicoService.createByAdmin(medicoToCreate);
      } else if (userRole === "OPERADOR") {
        op = this.medicoService.createByOperador(medicoToCreate);
      } else {
        this.modalService.alert(
          "Error",
          "No tienes permisos para crear médicos. Solo administradores y operadores pueden crear médicos."
        );
        return;
      }
    }

    op.subscribe({
      next: (response) => {
        console.log("Respuesta recibida en next:", response);
        
        // Verificar si la respuesta indica un error (status_code diferente de 200)
        if (response.status_code && response.status_code !== 200) {
          const errorMessage = response.status_text || "Error al guardar el médico.";
          this.modalService.alert("Error", errorMessage);
          console.log("Error detectado en respuesta exitosa:", errorMessage);
          return;
        }

        // Si llegamos aquí, es una respuesta exitosa
        const roleText = userRole === "ADMINISTRADOR" ? " por administrador" : 
                        userRole === "OPERADOR" ? " por operador" : "";
        const successMessage = this.esNuevo 
          ? `Médico creado correctamente${roleText}`
          : "Médico actualizado correctamente";
          
        this.modalService.alert("Éxito", successMessage);
        this.router.navigate(['/medicos']);
      },
      error: (err) => {
        console.log("Respuesta recibida en error:", err);
        let errorMessage = "Error al guardar el médico.";
        
        if (err?.error?.status_text) {
          errorMessage = err.error.status_text;
        } else if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.modalService.alert("Error", errorMessage);
        console.error("Error al guardar médico:", err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/medicos']);
  }

  cancelar(): void {
    if (this.medico.id) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        queryParamsHandling: 'merge'
      });
      this.modoEdicion = false;
    } else {
      this.goBack();
    }
  }

  activarEdicion(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: true },
      queryParamsHandling: 'merge'
    });
    this.modoEdicion = true;
  }

  compareEspecialidad(e1: Especialidad, e2: Especialidad): boolean {
    return e1 && e2 ? e1.id === e2.id : e1 === e2;
  }

  confirmDelete(): void {
    this.modalService
      .confirm(
        'Eliminar médico',
        'Confirmar eliminación',
        `¿Está seguro que desea eliminar al médico ${this.medico.nombre} ${this.medico.apellido}?`
      )
      .then(() => this.remove())
      .catch(() => {});
  }

  remove(): void {
    if (!this.medico.id) return;

    this.medicoService.delete(this.medico.id).subscribe({
      next: () => {
        this.modalService.alert('Éxito', 'Médico eliminado correctamente');
        this.goBack();
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo eliminar el médico. Puede que tenga registros asociados.';
        this.modalService.alert('Error', msg);
        console.error('Error al eliminar médico:', err);
      }
    });
  }

  // Métodos para manejar múltiples especialidades
  addEspecialidad(): void {
    if (this.selectedEspecialidad) {
      // Verificar que no esté ya agregada
      const yaExiste = this.medico.especialidades.some(esp => esp.id === this.selectedEspecialidad!.id);
      if (!yaExiste) {
        this.medico.especialidades.push(this.selectedEspecialidad);
        // Actualizar especialidad principal para compatibilidad
        if (this.medico.especialidades.length === 1) {
          this.medico.especialidad = this.selectedEspecialidad;
        }
      }
      this.selectedEspecialidad = null;
    }
  }

  removeEspecialidad(especialidad: Especialidad): void {
    const index = this.medico.especialidades.findIndex(esp => esp.id === especialidad.id);
    if (index > -1) {
      this.medico.especialidades.splice(index, 1);
      // Actualizar especialidad principal para compatibilidad
      if (this.medico.especialidades.length > 0) {
        this.medico.especialidad = this.medico.especialidades[0];
      } else {
        this.medico.especialidad = { id: 0, nombre: '', descripcion: '' };
      }
    }
  }

  getAvailableEspecialidades(): Especialidad[] {
    return this.especialidades.filter(esp => 
      !this.medico.especialidades.some(medicoEsp => medicoEsp.id === esp.id)
    );
  }
}
