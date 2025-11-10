import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MedicoService } from './medico.service';
import { Medico } from './medico';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
  selector: 'app-medicos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './medicos.component.html',
  styleUrl: './medicos.component.css'
})
export class MedicosComponent {
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

  // Configuración de filtros
  filtros = {
    nombre: '',
    especialidad: '',
    estado: ''
  };

  // Configuración de ordenamiento
  sortConfig = {
    field: '',
    direction: 'asc' as 'asc' | 'desc'
  };

  // Loading state
  isLoading: boolean = false;

  // Selected row for hover effect
  selectedId: number | null = null;

  constructor(
    private medicoService: MedicoService,
    private modalService: ModalService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadMedicos();
  }

  loadMedicos(): void {
    this.isLoading = true;
    this.medicoService.findByPage(
      this.currentPage - 1, // Backend usa 0-based
      10,
      this.filtros.nombre,
      this.filtros.especialidad,
      this.filtros.estado,
      this.sortConfig.field,
      this.sortConfig.direction
    ).subscribe({
      next: (dataPackage) => {
        this.resultsPage = dataPackage.data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar médicos:', error);
        this.modalService.alert('Error', 'Error al cargar la lista de médicos');
        this.isLoading = false;
      }
    });
  }

  confirmDelete(id: number): void {
    this.modalService
      .confirm(
        "Eliminar médico",
        "Eliminar médico",
        "¿Está seguro que desea eliminar el médico?"
      )
      .then(() => this.remove(id))
      .catch(() => {});
  }

  remove(id: number): void {
    this.medicoService.delete(id).subscribe({
      next: () => this.loadMedicos(),
      error: (err) => {
        const msg = err?.error?.message || "Error al eliminar el médico.";
        this.modalService.alert("Error", msg);
        console.error("Error al eliminar médico:", err);
      }
    });
  }

  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.loadMedicos();
  }

  /**
   * Maneja cambios en los filtros de búsqueda
   */
  onSearchChange(): void {
    this.currentPage = 1; // Resetear a primera página cuando cambian filtros
    this.loadMedicos();
  }

  /**
   * Maneja cambios en el ordenamiento
   */
  onSortChange(field: string): void {
    if (this.sortConfig.field === field) {
      // Si es el mismo campo, alternar dirección
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Si es un campo diferente, establecer ascendente por defecto
      this.sortConfig.field = field;
      this.sortConfig.direction = 'asc';
    }
    this.currentPage = 1; // Resetear a primera página cuando cambia ordenamiento
    this.loadMedicos();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.filtros = {
      nombre: '',
      especialidad: '',
      estado: ''
    };
    this.sortConfig = {
      field: '',
      direction: 'asc'
    };
    this.currentPage = 1;
    this.loadMedicos();
  }

  /**
   * Verifica si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return !!(this.filtros.nombre || this.filtros.especialidad || this.filtros.estado || this.sortConfig.field);
  }

  goToDetail(id: number): void {
    this.router.navigate(['/medicos', id]);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/medicos', id], { queryParams: { edit: true } });
  }

  onRowHover(id: number): void {
    this.selectedId = id;
  }

  onRowLeave(): void {
    this.selectedId = null;
  }
}