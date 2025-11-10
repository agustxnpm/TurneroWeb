import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { OperadorService } from "./operador.service";
import { Operador } from "./operador";
import { ModalService } from "../modal/modal.service";
import { ResultsPage } from "../results-page";
import { PaginationComponent } from "../pagination/pagination.component";

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: "app-operadores",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: "./operadores.component.html", 
  styleUrl: "./operadores.component.css", 
})
  
export class OperadoresComponent implements OnInit {
  resultsPage: ResultsPage = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 10,
    numberOfElements: 0,
    first: true,
    last: true,
  };

  currentPage: number = 1;
  loading: boolean = false;
  pageSize: number = 10; // Tamaño de página por defecto

  // Configuración de filtros
  filters = {
    nombre: '',
    email: '',
    estado: ''
  };

  // Configuración de ordenamiento
  sortConfig: SortConfig | null = null;

  constructor(
    private operadorService: OperadorService,
    private modalService: ModalService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadOperadores();
  }

  /**
   * Carga los operadores con los filtros y ordenamiento actuales
   */
   loadOperadores(): void {
    this.loading = true;

    this.operadorService
      .findByPage(
        this.currentPage,
        this.pageSize,
        this.filters.nombre?.trim() || undefined,
        this.filters.email?.trim() || undefined,
        this.filters.estado?.trim() || undefined,
        this.sortConfig?.field,
        this.sortConfig?.direction
      )
      .subscribe({
        next: (dataPackage) => {
          this.resultsPage = <ResultsPage>dataPackage.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar operadores:', error);
          this.modalService.alert(
            'Error',
            'No se pudieron cargar los operadores. Intente nuevamente.'
          );
          this.loading = false;
        }
      });
  }

  /**
   * Maneja el cambio de página
   */
  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.loadOperadores();
  }

  /**
   * Maneja el cambio de filtros
   */
  onFilterChange(): void {
    // Resetear a página 1 cuando cambian los filtros
    this.currentPage = 1;
    this.loadOperadores();
  }

  /**
   * Maneja el cambio de tamaño de página
   */
  onPageSizeChange(): void {
    this.currentPage = 1; // Resetear a página 1 cuando cambia el tamaño
    this.loadOperadores();
  }

  /**
   * Maneja el cambio de ordenamiento por columna
   */
  onSortChange(field: string): void {
    if (this.sortConfig?.field === field) {
      // Cambiar dirección si es el mismo campo
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Nuevo campo, orden ascendente por defecto
      this.sortConfig = { field, direction: 'asc' };
    }
    this.currentPage = 1; // Resetear a página 1
    this.loadOperadores();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.filters = { nombre: '', email: '', estado: '' };
    this.currentPage = 1;
    this.loadOperadores();
  }

  /**
   * Verifica si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return !!(this.filters.nombre || this.filters.email || this.filters.estado);
  }

  /**
   * Confirma y elimina un operador
   */
  confirmDelete(id: number): void {
    this.modalService
      .confirm(
        "Eliminar operador",
        "Eliminar operador",
        "¿Está seguro que desea eliminar el operador?"
      )
      .then(() => this.remove(id))
      .catch(() => {});
  }

  /**
   * Elimina un operador
   */
  remove(id: number): void {
    this.operadorService.remove(id).subscribe({
      next: () => this.loadOperadores(),
      error: (err) => {
        const msg = err?.error?.message || "Error al eliminar el operador.";
        this.modalService.alert("Error", msg);
        console.error("Error al eliminar operador:", err);
      },
    });
  }

  /**
   * Navega al detalle del operador
   */
  goToDetail(id: number): void {
    this.router.navigate(["/operadores", id]);
  }

  /**
   * Navega a la edición del operador
   */
  goToEdit(id: number): void {
    this.router.navigate(["/operadores", id], { queryParams: { edit: true } });
  }
}
