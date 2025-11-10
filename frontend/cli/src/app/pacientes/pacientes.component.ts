import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PacienteService } from './paciente.service';
import { Paciente } from './paciente';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';
import { FormsModule } from '@angular/forms';

interface PacienteFilters {
  nombreApellido?: string;
  documento?: string;
  email?: string;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginationComponent, FormsModule],
  templateUrl: './pacientes.component.html', 
  styleUrl: './pacientes.component.css'
})
export class PacientesComponent implements OnInit {
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
  pageSize: number = 10;
  isLoading: boolean = false;
  totalUnfiltered: number = 0;

  filters: PacienteFilters = {
    nombreApellido: '',
    documento: '',
    email: ''
  };

  sortConfig: SortConfig = {
    field: '',
    direction: 'asc'
  };

  // Debounce para búsqueda
  private searchTimeout: any;

  constructor(
    private pacienteService: PacienteService,
    private modalService: ModalService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadTotalCount();
    this.getPacientes();
  }

  /**
   * Carga el conteo total de pacientes sin filtros para mostrar información
   */
  private loadTotalCount(): void {
    this.pacienteService.byPageAdvanced(1, 1).subscribe({
      next: (dataPackage) => {
        this.totalUnfiltered = dataPackage.data.totalElements;
      },
      error: (err) => {
        console.error('Error al cargar conteo total:', err);
      }
    });
  }

  /**
   * Obtiene pacientes con filtros, ordenamiento y paginación
   */
  getPacientes(): void {
    this.isLoading = true;

    this.pacienteService.byPageAdvanced(
      this.currentPage,
      this.pageSize,
      this.filters,
      this.sortConfig.field || undefined,
      this.sortConfig.direction
    ).subscribe({
      next: (dataPackage) => {
        this.resultsPage = <ResultsPage>dataPackage.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.status_text || 'Error al cargar pacientes';
        this.modalService.alert('Error', msg);
        console.error('Error al cargar pacientes:', err);
      }
    });
  }

  /**
   * Maneja cambios en filtros con debounce para evitar llamadas excesivas
   */
  onFilterChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1; // Resetear a primera página al filtrar
      this.getPacientes();
    }, 300);
  }

  /**
   * Cambia el ordenamiento por una columna
   * @param field Campo por el cual ordenar
   */
  sortBy(field: string): void {
    if (this.sortConfig.field === field) {
      // Cambiar dirección si es el mismo campo
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Nuevo campo, comenzar con ascendente
      this.sortConfig.field = field;
      this.sortConfig.direction = 'asc';
    }

    this.getPacientes();
  }

  /**
   * Maneja cambio de tamaño de página
   */
  onPageSizeChange(): void {
    this.currentPage = 1; // Resetear a primera página
    this.getPacientes();
  }

  /**
   * Maneja cambio de página desde el componente de paginación
   */
  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.getPacientes();
  }

  /**
   * Limpia todos los filtros aplicados
   */
  clearFilters(): void {
    this.filters = {
      nombreApellido: '',
      documento: '',
      email: ''
    };
    this.currentPage = 1;
    this.getPacientes();
  }

  /**
   * Verifica si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return !!(this.filters.nombreApellido || this.filters.documento || this.filters.email);
  }

  /**
   * Refresca los datos manualmente
   */
  refreshData(): void {
    this.getPacientes();
  }

  /**
   * Confirma eliminación de paciente
   */
  confirmDelete(id: number): void {
    this.modalService
      .confirm(
        "Eliminar paciente",
        "Eliminar paciente",
        "¿Está seguro que desea eliminar el paciente?"
      )
      .then(() => this.remove(id))
      .catch(() => {});
  }

  /**
   * Elimina un paciente
   */
  remove(id: number): void {
    this.pacienteService.remove(id).subscribe({
      next: () => {
        this.modalService.alert('Éxito', 'Paciente eliminado correctamente');
        this.getPacientes();
      },
      error: (err) => {
        const msg = err?.error?.message || "Error al eliminar el paciente.";
        this.modalService.alert("Error", msg);
        console.error("Error al eliminar paciente:", err);
      }
    });
  }

  /**
   * Navega al detalle del paciente
   */
  goToDetail(id: number): void {
    this.router.navigate(['/pacientes', id]);
  }

  /**
   * Navega a la edición del paciente
   */
  goToEdit(id: number): void {
    this.router.navigate(['/pacientes', id], { queryParams: { edit: true } });
  }
}