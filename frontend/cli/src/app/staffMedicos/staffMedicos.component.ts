import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StaffMedicoService } from './staffMedico.service';
import { StaffMedico } from './staffMedico';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-staff-medicos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './staffMedicos.component.html', 
  styleUrl: './staffMedicos.component.css'
})  

export class StaffMedicosComponent implements OnInit, OnDestroy {
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
  // Tamaño de página fijo
  pageSize: number = 10;
  currentPage: number = 1;

  // Filtros
  filtros = {
    medico: '',
    especialidad: '',
    centro: '',
    consultorio: ''
  };

  // Ordenamiento
  sortConfig = {
    sortBy: 'id',
    sortDir: 'asc' as 'asc' | 'desc'
  };

  // Loading state
  isLoading = false;

  // Selected row for hover effect
  selectedId: number | null = null;

  // Debounce para filtros
  private filterSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private staffMedicoService: StaffMedicoService,
    public router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    this.getStaffMedicos();
    
    // Configurar debounce para filtros
    this.filterSubject
      .pipe(
        debounceTime(300), // Esperar 300ms después del último cambio
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.onFilterChange();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Obtiene staff médicos con filtros, ordenamiento y paginación
   */
  getStaffMedicos(): void {
    this.isLoading = true;
    this.staffMedicoService.findByPage(
      this.currentPage - 1, // Backend usa 0-based
      this.pageSize,
      this.filtros.medico,
      this.filtros.especialidad,
      this.filtros.centro,
      this.filtros.consultorio,
      this.sortConfig.sortBy,
      this.sortConfig.sortDir
    ).subscribe({
      next: (dataPackage) => {
        this.resultsPage = dataPackage.data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al obtener staff médicos:', error);
        this.isLoading = false;
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    });
  }

  /**
   * Maneja input en campos de filtro (con debounce)
   */
  onFilterInput(): void {
    this.filterSubject.next('filter');
  }

  /**
   * Maneja cambios en los filtros
   */
  onFilterChange(): void {
    this.currentPage = 1; // Reset a primera página
    this.getStaffMedicos();
  }

  /**
   * Maneja ordenamiento por columna
   * @param column Campo por el que ordenar
   */
  onSortChange(column: string): void {
    if (this.sortConfig.sortBy === column) {
      // Si es la misma columna, alternar dirección
      this.sortConfig.sortDir = this.sortConfig.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      // Nueva columna, orden ascendente por defecto
      this.sortConfig.sortBy = column;
      this.sortConfig.sortDir = 'asc';
    }
    this.getStaffMedicos();
  }

  /**
   * Obtiene la clase CSS para el indicador de ordenamiento
   * @param column Columna a verificar
   */
  getSortClass(column: string): string {
    if (this.sortConfig.sortBy !== column) return '';
    return this.sortConfig.sortDir === 'asc' ? 'sort-asc' : 'sort-desc';
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.filtros = {
      medico: '',
      especialidad: '',
      centro: '',
      consultorio: ''
    };
    this.onFilterChange();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.getStaffMedicos();
  }

  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.getStaffMedicos();
  }

  goToEdit(id: number): void {
    this.router.navigate(['/staffMedico', id], { queryParams: { edit: true } });
  }

  goToDetail(id: number): void {
    this.router.navigate(['/staffMedico', id]);
  }

  goToDisponibilidad(staff: StaffMedico): void {
    this.router.navigate(['/disponibilidades-medico/new'], { 
      queryParams: { staffMedicoId: staff.id } 
    });
  }

  confirmDelete(id: number): void {
    this.modalService
      .confirm(
        "Eliminar Staff Médico",
        "¿Está seguro que desea eliminar este Staff Médico?",
        "Si elimina el Staff Médico no lo podrá utilizar luego"
      )
      .then(() => {
        this.staffMedicoService.remove(id).subscribe({
          next: () => this.getStaffMedicos(),
          error: (err) => {
            const msg = err?.error?.message || "Error al eliminar el Staff Médico.";
            alert(msg);
            console.error("Error al eliminar Staff Médico:", err);
          }
        });
      });
  }

  /**
   * Maneja hover sobre fila
   * @param id ID del registro
   */
  onRowHover(id: number): void {
    this.selectedId = id;
  }

  /**
   * Maneja salida del hover
   */
  onRowLeave(): void {
    this.selectedId = null;
  }

  // Métodos auxiliares para información de entidades

  getCentroNombre(staff: StaffMedico): string {
    return staff.centro?.nombre || 'Sin centro asignado';
  }

  getCentroUbicacion(staff: StaffMedico): string {
    if (!staff.centro) return 'Sin ubicación';
    const partes = [];
    if (staff.centro.localidad) partes.push(staff.centro.localidad);
    if (staff.centro.provincia) partes.push(staff.centro.provincia);
    return partes.join(', ') || 'Sin ubicación';
  }

  getMedicoNombre(staff: StaffMedico): string {
    if (!staff.medico) return 'Sin médico asignado';
    return `${staff.medico.nombre} ${staff.medico.apellido}`;
  }

  getEspecialidadNombre(staff: StaffMedico): string {
    return staff.especialidad?.nombre || 'Sin especialidad';
  }
}