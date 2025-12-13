import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EspecialidadService } from './especialidad.service';
import { Especialidad } from './especialidad';
import { ModalService } from '../modal/modal.service';
import { DataPackage } from '../data.package';

@Component({
  selector: 'app-especialidad-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './especialidad-detail.component.html',
  styleUrl: './especialidad-detail.component.css'
})
export class EspecialidadDetailComponent {
  especialidad: Especialidad = { id: 0, nombre: '', descripcion: '' };
  modoEdicion = false;
  esNuevo = false;
  
  // Propiedades para navegación de retorno desde centro de atención
  returnUrl: string | null = null;
  centroId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private especialidadService: EspecialidadService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    this.get();
  }

  get(): void {
    const path = this.route.snapshot.routeConfig?.path;
    
    // Capturar parámetros de retorno desde centro de atención
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const centroIdParam = this.route.snapshot.queryParamMap.get('centroId');
    this.centroId = centroIdParam ? +centroIdParam : null;

    if (path === 'especialidades/new') {
      this.modoEdicion = true;
      this.esNuevo = true;
      this.especialidad = {
        id: 0,
        nombre: '',
        descripcion: ''
      } as Especialidad;
    } else if (path === 'especialidades/:id') {
      this.modoEdicion = this.route.snapshot.queryParamMap.get('edit') === 'true';
      this.esNuevo = false;

      const idParam = this.route.snapshot.paramMap.get('id');
      if (!idParam) {
        console.error('El ID proporcionado no es válido.');
        return;
      }

      const id = Number(idParam);
      if (isNaN(id)) {
        console.error('El ID proporcionado no es un número válido.');
        return;
      }

      this.especialidadService.get(id).subscribe({
        next: (dataPackage) => {
          this.especialidad = <Especialidad>dataPackage.data;
        },
        error: (err) => {
          console.error('Error al obtener la especialidad:', err);
          alert('No se pudo cargar la especialidad. Intente nuevamente.');
        }
      });
    } else {
      console.error('Ruta no reconocida.');
    }
  }

  save(): void {
    if (this.esNuevo) {
      // Para creación, no enviar el ID (el backend lo genera)
      const especialidadParaCrear = {
        nombre: this.especialidad.nombre,
        descripcion: this.especialidad.descripcion
      };
      
      this.especialidadService.create(especialidadParaCrear as Especialidad).subscribe({
        next: (response: DataPackage<Especialidad>) => {
          // Verificar status_code del body (no el HTTP status)
          if (response.status_code && response.status_code !== 200) {
            const errorMsg = response.status_text || 'Error al crear la especialidad';
            this.modalService.alert('Error', errorMsg);
            return;
          }
          
          const especialidadCreada = response.data;
          this.modalService.alert('Éxito', 'Especialidad creada correctamente');
          
          // Si hay returnUrl, navegar de vuelta al centro con la especialidad preseleccionada
          if (this.returnUrl && this.centroId) {
            this.router.navigate([this.returnUrl], {
              queryParams: { 
                activeTab: 'especialidades',
                especialidadId: especialidadCreada.id
              }
            });
          } else {
            this.router.navigate(['/especialidades']);
          }
        },
        error: (error) => {
          console.error('Error al crear la especialidad:', error);
          const errorMsg = error?.error?.status_text || 'Error al crear la especialidad.';
          this.modalService.alert('Error', errorMsg);
        }
      });
    } else {
      this.especialidadService.update(this.especialidad.id, this.especialidad).subscribe({
        next: () => {
          this.modalService.alert('Éxito', 'Especialidad actualizada correctamente');
          this.router.navigate(['/especialidades']);
        },
        error: (error) => {
          console.error('Error al actualizar la especialidad:', error);
          this.modalService.alert('Error', 'Error al actualizar la especialidad.');
        }
      });
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

  cancelar(): void {
    if (!this.esNuevo) {
      // Si estamos editando una especialidad existente, solo salimos del modo edición
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        queryParamsHandling: 'merge'
      });
      this.modoEdicion = false;
    } else {
      // Si hay returnUrl, volver al centro de atención
      if (this.returnUrl && this.centroId) {
        this.router.navigate([this.returnUrl], {
          queryParams: { activeTab: 'especialidades' }
        });
      } else {
        // Si es una nueva especialidad, volvemos al listado
        this.router.navigate(['/especialidades']);
      }
    }
  }

  confirmDelete(): void {
    this.modalService
      .confirm(
        'Eliminar especialidad',
        'Confirmar eliminación',
        `¿Está seguro que desea eliminar la especialidad ${this.especialidad.nombre}?`
      )
      .then(() => this.remove())
      .catch(() => {});
  }

  remove(): void {
    if (!this.especialidad.id) return;

    this.especialidadService.remove(this.especialidad.id).subscribe({
      next: () => {
        this.modalService.alert('Éxito', 'Especialidad eliminada correctamente');
        this.router.navigate(['/especialidades']);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al eliminar la especialidad.';
        this.modalService.alert('Error', msg);
        console.error('Error al eliminar especialidad:', err);
      }
    });
  }

  allFieldsEmpty(): boolean {
    return !this.especialidad?.nombre && !this.especialidad?.descripcion;
  }

  goBack(): void {
    if (this.returnUrl && this.centroId) {
      this.router.navigate([this.returnUrl], {
        queryParams: { activeTab: 'especialidades' }
      });
    } else {
      this.router.navigate(['/especialidades']);
    }
  }
}