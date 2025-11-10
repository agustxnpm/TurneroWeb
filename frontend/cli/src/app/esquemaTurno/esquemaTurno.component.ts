import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DisponibilidadMedicoService } from '../disponibilidadMedicos/disponibilidadMedico.service';
import { StaffMedicoService } from '../staffMedicos/staffMedico.service';
import { StaffMedico } from '../staffMedicos/staffMedico';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';
import { EsquemaTurnoService } from './esquemaTurno.service';
import { EsquemaTurno } from './esquemaTurno';
import { ConsultorioService } from '../consultorios/consultorio.service';
import { Consultorio } from '../consultorios/consultorio';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { CentroAtencion } from '../centrosAtencion/centroAtencion';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-esquema-turno',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginationComponent,FormsModule],
  templateUrl: './esquemaTurno.component.html',
  styleUrl: './esquemaTurno.component.css'
})
export class EsquemaTurnoComponent {
  resultsPage: ResultsPage = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 10,
    numberOfElements: 0,
    first: true,
    last: true
  };
  currentPage: number = 1;

  // Filtros de búsqueda
  filters = {
    staffMedico: '',
    consultorio: '',
    centro: '',
    sortBy: 'id',
    sortDir: 'asc'
  };

  private filterTimeout: any;

  staffMedicos: StaffMedico[] = [];
  consultorios: Consultorio[] = [];
  centrosAtencion: CentroAtencion[] = [];
  esquema: EsquemaTurno = {
    id: 0,
    intervalo: 15,
    disponibilidadMedicoId: 0,
    staffMedicoId: 0,
    centroId: 0,
    consultorioId: 0,
    horarios: [], // Inicializamos como un array vacío
    horariosDisponibilidad: [], // Inicializamos como un array vacío
  };

  constructor(
    private esquemaTurnoService: EsquemaTurnoService,
    private disponibilidadService: DisponibilidadMedicoService,
    private staffMedicoService: StaffMedicoService,
    public router: Router,
    private modalService: ModalService,
    private consultorioService: ConsultorioService,
    private centroAtencionService: CentroAtencionService
  ) { }

  ngOnInit() {
    this.searchEsquemas();
    this.staffMedicoService.all().subscribe(dp => {
      this.staffMedicos = dp.data as StaffMedico[];
    });
    this.consultorioService.getAll().subscribe(dp => {
      this.consultorios = dp.data as Consultorio[];
    });
    this.centroAtencionService.all().subscribe(dp => {
      this.centrosAtencion = dp.data as CentroAtencion[];
    });
  }


  /** Búsqueda de esquemas de turno con filtros y paginación */
  searchEsquemas(): void {
    this.esquemaTurnoService.byPageAdvanced(
      this.currentPage,
      this.resultsPage.size,
      this.filters.staffMedico || undefined,
      this.filters.consultorio || undefined,
      this.filters.centro || undefined,
      this.filters.sortBy,
      this.filters.sortDir
    ).subscribe({
      next: (dataPackage) => {
        if (dataPackage.data) {
          this.resultsPage = {
            content: dataPackage.data.content || [],
            totalElements: dataPackage.data.totalElements || 0,
            totalPages: dataPackage.data.totalPages || 0,
            number: dataPackage.data.currentPage || 0,
            size: dataPackage.data.size || 10,
            numberOfElements: dataPackage.data.numberOfElements || 0,
            first: dataPackage.data.first || false,
            last: dataPackage.data.last || false
          };

          // Procesar cada esquema para asignar datos relacionados
          this.resultsPage.content.forEach((esquema: EsquemaTurno) => {
            // Obtener el staff médico
            if (esquema.staffMedicoId) {
              const staff = this.staffMedicos.find(s => s.id === esquema.staffMedicoId);
              if (staff) {
                esquema.staffMedico = staff;
              }
            }

            // Obtener el consultorio
            if (esquema.consultorioId) {
              const consultorio = this.consultorios.find(c => c.id === esquema.consultorioId);
              if (consultorio) {
                esquema.consultorio = consultorio;
              }
            }

            // Obtener el centro de atención
            if (esquema.centroId) {
              const centro = this.centrosAtencion.find(c => c.id === esquema.centroId);
              if (centro) {
                esquema.centroAtencion = centro;
              }
            }

            // Procesar los horarios del esquema
            if (!esquema.horarios || esquema.horarios.length === 0) {
              esquema.horarios = [];
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al buscar esquemas de turno:', error);
        this.resultsPage = {
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 10,
          numberOfElements: 0,
          first: true,
          last: true
        };
      }
    });
  }


  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.searchEsquemas();
  }

  goToEdit(id: number): void {
    this.router.navigate(['/esquema-turno', id], { queryParams: { edit: true } });
  }

  goToDetail(id: number): void {
    this.router.navigate(['/esquema-turno', id]);
  }

  remove(id: number): void {
    this.modalService
      .confirm(
        "Eliminar Esquema de Turno",
        "¿Está seguro que desea eliminar este esquema?",
        "Si elimina el esquema no podrá asignar turnos en ese horario"
      )
      .then(() => {
        this.esquemaTurnoService.remove(id).subscribe({
          next: () => this.searchEsquemas(),
          error: (err) => {
            const msg = err?.error?.message || "Error al eliminar el esquema.";
            alert(msg);
            console.error("Error al eliminar Esquema de Turno:", err);
          }
        });
      });
  }

  /** Aplicar filtros con debounce */
  applyFilters(): void {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    this.filterTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.searchEsquemas();
    }, 300);
  }

  /** Limpiar todos los filtros */
  clearFilters(): void {
    this.filters = {
      staffMedico: '',
      consultorio: '',
      centro: '',
      sortBy: 'id',
      sortDir: 'asc'
    };
    this.currentPage = 1;
    this.searchEsquemas();
  }

  /** Toggle de ordenamiento por columna */
  toggleSort(column: string): void {
    if (this.filters.sortBy === column) {
      // Si ya está ordenando por esta columna, cambiar dirección
      this.filters.sortDir = this.filters.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      // Si es una nueva columna, usar ascendente por defecto
      this.filters.sortBy = column;
      this.filters.sortDir = 'asc';
    }
    this.currentPage = 1;
    this.searchEsquemas();
  }

  getStaffMedicoNombre(staffMedicoId: number): string {
    if (!this.staffMedicos) return '';
    const staff = this.staffMedicos.find(s => s.id === staffMedicoId);
    if (!staff) return '';
    return staff.medico ? `${staff.medico.nombre} ${staff.medico.apellido}` : 'Sin médico';
  }

  getStaffMedicoInitials(staffMedicoId: number): string {
    if (!this.staffMedicos) return '??';
    const staff = this.staffMedicos.find(s => s.id === staffMedicoId);
    if (!staff || !staff.medico) return '??';
    
    const nombre = staff.medico.nombre?.charAt(0).toUpperCase() || '';
    const apellido = staff.medico.apellido?.charAt(0).toUpperCase() || '';
    return nombre + apellido || '??';
  }

  getStaffMedicoEspecialidad(staffMedicoId: number): string {
    if (!this.staffMedicos) return '';
    const staff = this.staffMedicos.find(s => s.id === staffMedicoId);
    if (!staff) return '';
    return staff.especialidad ? staff.especialidad.nombre : 'Sin especialidad';
  }

  getConsultorioNombre(consultorioId: number): string {
    if (!consultorioId || !this.consultorios) return '';
    const consultorio = this.consultorios.find(c => c.id === consultorioId);
    return consultorio ? consultorio.nombre : '';
  }
  getCentroAtencionNombre(centroId: number): string {
    if (!centroId || !this.centrosAtencion) return '';
    const centro = this.centrosAtencion.find(c => c.id === centroId);
    return centro ? centro.nombre : '';
  }
  getDiasSemana(horarios: { dia: string; horaInicio: string; horaFin: string }[]): string {
    if (!horarios || horarios.length === 0) {
      return 'Sin días asignados';
    }
    return horarios
      .map(h => `${h.dia}: ${h.horaInicio} - ${h.horaFin}`)
      .join(', ');
  }
}