import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EspecialidadService } from './especialidad.service';
import { Especialidad } from './especialidad';
import { ModalService } from '../modal/modal.service';

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
      this.especialidadService.create(this.especialidad).subscribe({
        next: () => {
          this.router.navigate(['/especialidades']);
        },
        error: (error) => {
          console.error('Error al crear la especialidad:', error);
          alert('Error al crear la especialidad.');
        }
      });
    } else {
      this.especialidadService.update(this.especialidad.id, this.especialidad).subscribe({
        next: () => {
          this.router.navigate(['/especialidades']);
        },
        error: (error) => {
          console.error('Error al actualizar la especialidad:', error);
          alert('Error al actualizar la especialidad.');
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
      // Si es una nueva especialidad, volvemos al listado
      this.router.navigate(['/especialidades']);
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
    this.router.navigate(['/especialidades']);
  }
}