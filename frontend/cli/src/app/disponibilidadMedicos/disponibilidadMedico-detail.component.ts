import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DisponibilidadMedicoService } from './disponibilidadMedico.service';
import { DisponibilidadMedico } from './disponibilidadMedico';
import { StaffMedicoService } from '../staffMedicos/staffMedico.service';
import { StaffMedico } from '../staffMedicos/staffMedico';
import { DataPackage } from '../data.package';
import { ModalService } from '../modal/modal.service';

@Component({
  selector: 'app-disponibilidad-medico-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './disponiblidadMedico-detail.component.html',
  styleUrl: './disponibilidadMedico-detail.component.css'
})
export class DisponibilidadMedicoDetailComponent {
  disponibilidad: DisponibilidadMedico = {
    id: 0,
    staffMedicoId: null as any,
    horarios: [],
  };
  staffMedicos: StaffMedico[] = [];
  diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
  modoEdicion = false;
  esNuevo = false;

  // Parámetros de navegación de retorno
  fromCentro: string | null = null;
  returnTab: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private disponibilidadService: DisponibilidadMedicoService,
    private staffMedicoService: StaffMedicoService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const staffMedicoIdParam = this.route.snapshot.queryParamMap.get('staffMedicoId');

    // Capturar parámetros de navegación de retorno
    this.fromCentro = this.route.snapshot.queryParamMap.get('fromCentro');
    this.returnTab = this.route.snapshot.queryParamMap.get('returnTab');

    if (idParam) {
      this.get();
    } else {
      this.modoEdicion = true;
      this.esNuevo = true;

      // Si se pasa el staffMedicoId por la URL, asignarlo automáticamente
      if (staffMedicoIdParam) {
        const staffMedicoId = Number(staffMedicoIdParam);
        if (!isNaN(staffMedicoId)) {
          this.disponibilidad.staffMedicoId = staffMedicoId;
        }
      }

      this.loadStaffMedicos();
    }
  }

  get(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion = this.route.snapshot.queryParamMap.get('edit') === 'true';
      this.esNuevo = false;

      // Capturar parámetros de navegación de retorno también en modo edición
      this.fromCentro = this.route.snapshot.queryParamMap.get('fromCentro');
      this.returnTab = this.route.snapshot.queryParamMap.get('returnTab');

      const id = Number(idParam);
      if (isNaN(id)) {
        console.error('El ID proporcionado no es un número válido.');
        return;
      }
      this.disponibilidadService.get(id).subscribe({
        next: (dataPackage) => {
          this.disponibilidad = <DisponibilidadMedico>dataPackage.data;
          this.loadStaffMedicos();
        },
        error: (err) => {
          console.error('Error al obtener la disponibilidad:', err);
          alert('No se pudo cargar la disponibilidad. Intente nuevamente.');
        }
      });
    }
  }

  save(): void {
    if (!this.disponibilidad.horarios.length) {
      alert('Debe agregar al menos un horario.');
      return;
    }

    // Ordenar los horarios por el orden de los días de la semana
    const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
    this.disponibilidad.horarios.sort((a, b) => diasOrden.indexOf(a.dia) - diasOrden.indexOf(b.dia));

    const payload = { ...this.disponibilidad };

    if (this.esNuevo) {
      // Crear nueva disponibilidad
      this.disponibilidadService.create(payload).subscribe({
        next: () => {
          this.navigateBack();
        },
        error: (error) => {
          console.error('Error al crear la disponibilidad:', error);
          alert('Error al crear la disponibilidad.');
        }
      });
    } else {
      // Actualizar disponibilidad existente
      this.disponibilidadService.update(this.disponibilidad.id, payload).subscribe({
        next: () => {
          this.modoEdicion = false;
          this.navigateBack();
        },
        error: (error) => {
          console.error('Error al actualizar la disponibilidad:', error);
          alert('Error al actualizar la disponibilidad.');
        }
      });
    }
  }

  activarEdicion(): void {
    this.modoEdicion = true;
  }

  cancelar(): void {
    this.modoEdicion = false;
    if (this.esNuevo) {
      this.navigateBack();
    }
  }

  goBack(): void {
    this.navigateBack();
  }

  /**
   * Navega de vuelta según los parámetros de retorno
   */
  private navigateBack(): void {
    if (this.fromCentro && this.returnTab) {
      // Regresar al detalle del centro de atención con el tab específico
      this.router.navigate(['/centrosAtencion', this.fromCentro], {
        queryParams: { activeTab: this.returnTab }
      });
    } else if (this.fromCentro) {
      // Regresar al detalle del centro de atención sin tab específico
      this.router.navigate(['/centrosAtencion', this.fromCentro]);
    } else {
      // Regresar a la lista de disponibilidades médicas por defecto
      this.router.navigate(['/disponibilidades-medico']);
    }
  }

  remove(disponibilidad: DisponibilidadMedico): void {
    this.modalService
      .confirm(
        "Eliminar Disponibilidad",
        "¿Está seguro que desea eliminar esta disponibilidad?",
        "Si elimina la disponibilidad no podrá asignar turnos en ese horario"
      )
      .then(() => {
        this.disponibilidadService.remove(disponibilidad.id).subscribe({
          next: () => this.router.navigate(['/disponibilidades-medico']),
          error: (err) => {
            const msg = err?.error?.message || "Error al eliminar la disponibilidad.";
            this.modalService.alert("Error", msg);
            console.error("Error al eliminar disponibilidad:", err);
          }
        });
      });
  }

  allFieldsEmpty(): boolean {
    return !this.disponibilidad.staffMedicoId ||
      this.disponibilidad.horarios.length === 0;
  }

  loadStaffMedicos(): void {
    this.staffMedicoService.all().subscribe({
      next: (dp: DataPackage) => {
        this.staffMedicos = dp.data as StaffMedico[];
      },
      error: (err) => {
        console.error('Error al cargar Staff Médicos:', err);
        this.modalService.alert("Error", "No se pudieron cargar los datos del Staff Médico.");
      }
    });
  }

  addHorario(): void {
    this.disponibilidad.horarios.push({ dia: '', horaInicio: '', horaFin: '' });
  }

  removeHorario(index: number): void {
    this.disponibilidad.horarios.splice(index, 1);
  }

  getStaffMedicoNombre(staffMedicoId: number): string {
    const staff = this.staffMedicos.find(s => s.id === staffMedicoId);
    if (!staff) return 'Sin asignar';

    const medicoNombre = staff.medico ? `${staff.medico.nombre} ${staff.medico.apellido}` : 'Sin médico';
    const especialidadNombre = staff.especialidad ? staff.especialidad.nombre : 'Sin especialidad';

    return `${medicoNombre} (${especialidadNombre})`;
  }
}