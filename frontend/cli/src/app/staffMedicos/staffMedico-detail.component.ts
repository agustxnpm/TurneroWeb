import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StaffMedicoService } from './staffMedico.service';
import { StaffMedico } from './staffMedico';
import { CentroAtencion } from '../centrosAtencion/centroAtencion';
import { Medico } from '../medicos/medico';
import { Especialidad } from '../especialidades/especialidad';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { MedicoService } from '../medicos/medico.service';
import { EspecialidadService } from '../especialidades/especialidad.service';
import { DataPackage } from '../data.package';
import { ModalService } from '../modal/modal.service';

@Component({
  selector: 'app-staff-medico-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './staffMedico-detail.component.html',
  styleUrl: './staffMedico-detail.component.css' 
})
export class StaffMedicoDetailComponent {
  staffMedico: StaffMedico = { id: 0, centroAtencionId: 0, medicoId: 0, especialidadId: 0 };
  centros: CentroAtencion[] = [];
  medicos: Medico[] = [];
  especialidades: Especialidad[] = [];
  modoEdicion = false;
  esNuevo = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private staffMedicoService: StaffMedicoService,
    private centroAtencionService: CentroAtencionService,
    private medicoService: MedicoService,
    private especialidadService: EspecialidadService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path;
    if (path === "staffMedico/new") {
      // Nuevo staff médico
      this.modoEdicion = true;
      this.esNuevo = true;
      this.staffMedico = { id: 0, centroAtencionId: 0, medicoId: 0, especialidadId: 0 };
      this.loadCentros();
      this.loadMedicos();
      this.loadEspecialidades();
    } else {
      // Edición o vista
      this.route.queryParams.subscribe(params => {
        this.modoEdicion = params['edit'] === 'true';
      });
      this.get();
    }
  }

  get(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      // Modo edición
      this.modoEdicion = this.route.snapshot.queryParamMap.get('edit') === 'true';
      this.esNuevo = false;
      const id = Number(idParam);
      if (isNaN(id)) {
        console.error('El ID proporcionado no es un número válido.');
        return;
      }
      this.staffMedicoService.get(id).subscribe({
        next: (dataPackage) => {
          const data = dataPackage.data;

          // Mapear los datos del backend al modelo StaffMedico
   // Asignar los datos del backend al modelo StaffMedico
        this.staffMedico = {
          id: data.id,
          centroAtencionId: data.centro?.id || 0,
          medicoId: data.medico?.id || 0,
          especialidadId: data.especialidad?.id || 0,
          centro: data.centro || undefined, // Objeto completo del centro
          medico: data.medico || undefined, // Objeto completo del médico
          especialidad: data.especialidad || undefined, // Objeto completo de la especialidad
        };


          // Cargar listas de opciones
          this.loadCentros();
          this.loadMedicos();
          this.loadEspecialidades();
        },
        error: (err) => {
          console.error('Error al obtener el staff médico:', err);
          alert('No se pudo cargar el staff médico. Intente nuevamente.');
        }
      });
    } else {
      // Modo nuevo
      this.modoEdicion = true;
      this.esNuevo = true;
      this.staffMedico = { id: 0, centroAtencionId: 0, medicoId: 0, especialidadId: 0 };
      this.loadCentros();
      this.loadMedicos();
      this.loadEspecialidades();
    }
  }

  save(): void {
    if (!this.staffMedico.centroAtencionId || !this.staffMedico.medicoId || !this.staffMedico.especialidadId) {
      this.modalService.alert(
        "Error",
        "Debe completar todos los campos obligatorios."
      );
      return;
    }

    const op = this.esNuevo 
      ? this.staffMedicoService.create(this.staffMedico)
      : this.staffMedicoService.update(this.staffMedico.id, this.staffMedico);

    op.subscribe({
      next: () => this.router.navigate(['/staffMedico']),
      error: (error) => {
        console.error('Error al guardar el staff médico:', error);
        this.modalService.alert("Error", "No se pudo guardar el staff médico.");
      }
    });
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
    if (this.staffMedico.id && !this.esNuevo) {
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

  goBack(): void {
    this.router.navigate(['/staffMedico']);
  }

  confirmDelete(): void {
    if (this.staffMedico.id === undefined) {
      this.modalService.alert('Error', 'No se puede eliminar: el staff médico no tiene ID.');
      return;
    }
    this.modalService
      .confirm(
        "Eliminar Staff Médico",
        "¿Está seguro que desea eliminar este staff médico?",
        "Si elimina el staff médico no lo podrá utilizar luego"
      )
      .then(() => {
        this.remove();
      });
  }

  remove(): void {
    this.staffMedicoService.remove(this.staffMedico.id!).subscribe({
      next: () => {
        this.modalService.alert('Éxito', 'El staff médico fue eliminado correctamente.');
        this.goBack();
      },
      error: (err) => {
        console.error('Error al eliminar el staff médico:', err);
        this.modalService.alert('Error', 'No se pudo eliminar el staff médico. Intente nuevamente.');
      }
    });
  }

  loadCentros(): void {
    this.centroAtencionService.all().subscribe((dp: DataPackage) => {
      this.centros = dp.data as CentroAtencion[];
    });
  }

  loadMedicos(): void {
    this.medicoService.getAll().subscribe((dp: DataPackage) => {
      this.medicos = dp.data as Medico[];
    });
  }

  loadEspecialidades(): void {
    this.especialidadService.all().subscribe((dp: DataPackage) => {
      this.especialidades = dp.data as Especialidad[];
    });
  }

getCentroNombre(): string {
  return this.staffMedico.centro?.nombre || 'Sin centro';
}

getMedicoNombre(): string {
  const medico = this.staffMedico.medico;
  return medico ? `${medico.nombre} ${medico.apellido}` : 'Sin médico';
}

  getEspecialidadNombre(): string {
    return this.staffMedico.especialidad?.nombre || 'Sin especialidad';
  }

  onMedicoSeleccionado(): void {
    // Limpiar especialidad seleccionada cuando cambia el médico
    this.staffMedico.especialidadId = 0;
  }

  getEspecialidadesDisponibles(): Especialidad[] {
    if (!this.staffMedico.medicoId) {
      return this.especialidades;
    }

    const medicoSeleccionado = this.medicos.find(m => m.id === this.staffMedico.medicoId);
    if (medicoSeleccionado && medicoSeleccionado.especialidades && medicoSeleccionado.especialidades.length > 0) {
      // Filtrar solo las especialidades que tiene el médico
      return this.especialidades.filter(esp => 
        medicoSeleccionado.especialidades!.some(medicoEsp => medicoEsp.id === esp.id)
      );
    }

    // Fallback: si el médico no tiene especialidades múltiples definidas, mostrar todas
    return this.especialidades;
  }allFieldsEmpty(): boolean {
  return !this.staffMedico?.centroAtencionId && !this.staffMedico?.medicoId && !this.staffMedico?.especialidadId;
}
}