import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ObraSocialService } from './obraSocial.service';
import { ObraSocial } from './obraSocial';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
  selector: 'app-obra-social',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './obraSocial.component.html',
  styleUrl: './obraSocial.component.css'
})
export class ObraSocialComponent {
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
    nombre: '',
    codigo: '',
    sortBy: 'nombre',
    sortDir: 'asc'
  };

  private filterTimeout: any;

  constructor(
    private obraSocialService: ObraSocialService,
    private modalService: ModalService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.searchObrasSociales();
  }

  /**
   * Búsqueda de obras sociales con filtros y paginación
   */
  searchObrasSociales(): void {
    this.obraSocialService.byPageAdvanced(
      this.currentPage,
      this.resultsPage.size,
      this.filters.nombre || undefined,
      this.filters.codigo || undefined,
      this.filters.sortBy,
      this.filters.sortDir
    ).subscribe({
      next: (dataPackage) => {
        console.log('DataPackage recibido:', dataPackage);
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
        }
      },
      error: (error) => {
        console.error('Error al buscar obras sociales:', error);
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

  /**
   * Manejo de cambios en filtros con debounce
   */
  onFilterChange(): void {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    
    this.filterTimeout = setTimeout(() => {
      this.currentPage = 1; // Reset a primera página
      this.searchObrasSociales();
    }, 500); // Debounce de 500ms
  }

  /**
   * Limpiar todos los filtros
   */
  clearFilters(): void {
    this.filters = {
      nombre: '',
      codigo: '',
      sortBy: 'nombre',
      sortDir: 'asc'
    };
    this.currentPage = 1;
    this.searchObrasSociales();
  }

  /**
   * Toggle de ordenamiento por columna
   */
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
    this.searchObrasSociales();
  }

  confirmDelete(id: number): void {
    this.modalService
      .confirm(
        "Eliminar obra social",
        "¿Está seguro que desea eliminar esta obra social?",
        "Esta acción no se puede deshacer"
      )
      .then(() => this.remove(id))
      .catch(() => {});
  }

  remove(id: number): void {
    this.obraSocialService.remove(id).subscribe({
      next: () => this.searchObrasSociales(),
      error: (err) => {
        const msg = err?.error?.message || "Error al eliminar la obra social.";
        this.modalService.alert("Error", msg);
        console.error("Error al eliminar obra social:", err);
      }
    });
  }

  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.searchObrasSociales();
  }

  goToDetail(id: number): void {
    this.router.navigate(['/obraSocial', id]);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/obraSocial', id], { queryParams: { edit: true } });
  }
}