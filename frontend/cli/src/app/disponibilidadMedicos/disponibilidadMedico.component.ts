import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { DisponibilidadMedicoService } from "./disponibilidadMedico.service";
import { DisponibilidadMedico } from "./disponibilidadMedico";
import { ModalService } from "../modal/modal.service";
import { ResultsPage } from "../results-page";
import { PaginationComponent } from "../pagination/pagination.component";
import { StaffMedicoService } from "../staffMedicos/staffMedico.service";
import { StaffMedico } from "../staffMedicos/staffMedico";

@Component({
  selector: "app-disponibilidad-medico",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: "./disponibilidadMedico.component.html",
  styleUrl: "./disponibilidadMedico.component.css",
})
export class DisponibilidadMedicoComponent {
  // Data
  disponibilidades: DisponibilidadMedico[] = [];
  staffMedicos: StaffMedico[] = [];

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  // Filters
  filters = {
    staffMedico: "",
    especialidad: "",
    dia: "",
  };

  // Sorting
  sortBy = "id";
  sortDir: "asc" | "desc" = "asc";

  // UI state
  loading = false;
  diasSemana = [
    { value: "LUNES", label: "Lunes" },
    { value: "MARTES", label: "Martes" },
    { value: "MIERCOLES", label: "Miércoles" },
    { value: "JUEVES", label: "Jueves" },
    { value: "VIERNES", label: "Viernes" },
    { value: "SABADO", label: "Sábado" },
    { value: "DOMINGO", label: "Domingo" },
  ];

  constructor(
    private disponibilidadService: DisponibilidadMedicoService,
    private staffMedicoService: StaffMedicoService,
    public router: Router,
    private modalService: ModalService
  ) { }

  ngOnInit() {
    this.loadDisponibilidades();
    this.getStaffMedicos();
  }

  /** Carga las disponibilidades con paginación, filtros y ordenamiento */
  loadDisponibilidades(): void {
    this.loading = true;
    this.disponibilidadService
      .getPaged(
        this.currentPage,
        this.pageSize,
        this.filters,
        this.sortBy,
        this.sortDir
      )
      .subscribe({
        next: (dataPackage) => {
          // Verificar si hay un error en el status_code (backend devuelve siempre 200)
          if (dataPackage.status_code !== 200) {
            this.loading = false;
            const mensaje = dataPackage.status_text || "Error al cargar las disponibilidades.";
            this.modalService.alert("Error", mensaje);
            return;
          }
          const data = dataPackage.data;
          this.disponibilidades = data.content;
          this.totalPages = data.totalPages;
          this.totalElements = data.totalElements;
          this.currentPage = data.currentPage;
          this.loading = false;
        },
        error: (err) => {
          console.error("Error al cargar disponibilidades:", err);
          this.loading = false;
          const mensaje = err?.error?.status_text || err?.error?.message || "Error al cargar las disponibilidades.";
          this.modalService.alert("Error", mensaje);
        },
      });
  }

  /** @deprecated Use loadDisponibilidades instead */
  getDisponibilidades(): void {
    this.loadDisponibilidades();
  }

  getStaffMedicos(): void {
    this.staffMedicoService.all().subscribe((dataPackage) => {
      this.staffMedicos = dataPackage.data as StaffMedico[];
    });
  }

  /** Aplica los filtros y recarga los datos */
  applyFilters(): void {
    this.currentPage = 0; // Reset to first page when filtering
    this.loadDisponibilidades();
  }

  /** Limpia todos los filtros */
  clearFilters(): void {
    this.filters = { staffMedico: "", especialidad: "", dia: "" };
    this.currentPage = 0;
    this.loadDisponibilidades();
  }

  /** Cambia el ordenamiento por columna */
  sortByColumn(column: string): void {
    if (this.sortBy === column) {
      // Toggle direction if same column
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
    } else {
      // New column, default to ascending
      this.sortBy = column;
      this.sortDir = "asc";
    }
    this.loadDisponibilidades();
  }

  /** Cambia de página */
  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadDisponibilidades();
    }
  }

  /** Cambia el tamaño de página */
  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadDisponibilidades();
  }

  /** Obtiene el indicador de ordenamiento para una columna */
  getSortIndicator(column: string): string {
    if (this.sortBy !== column) return "";
    return this.sortDir === "asc" ? "↑" : "↓";
  }

  getStaffMedicoNombre(staffMedicoId: number): string {
    const staff = this.staffMedicos.find((s) => s.id === staffMedicoId);
    if (!staff || !staff.medico) return "Sin asignar";
    return `${staff.medico.nombre} ${staff.medico.apellido}`;
  }

  getStaffEspecialidad(staffMedicoId: number): string {
    const staff = this.staffMedicos.find((s) => s.id === staffMedicoId);
    return staff?.especialidad?.nombre || "Sin especialidad";
  }

  goToDetail(id: number): void {
    this.router.navigate(["/disponibilidades-medico", id]);
  }

  goToEdit(id: number): void {
    this.router.navigate(["/disponibilidades-medico", id], {
      queryParams: { edit: true },
    });
  }

  confirmDelete(id: number): void {
    this.modalService
      .confirm(
        "Eliminar Disponibilidad",
        "¿Está seguro que desea eliminar esta disponibilidad?",
        "Si elimina la disponibilidad no podrá asignar turnos en ese horario"
      )
      .then(() => {
        this.disponibilidadService.remove(id).subscribe({
          next: (response) => {
            // Verificar si hay un error en el status_code (backend devuelve siempre 200)
            if (response?.status_code && response.status_code !== 200) {
              const msg = response?.status_text || "Error al eliminar la disponibilidad.";
              this.modalService.alert("Error", msg);
              return;
            }
            this.loadDisponibilidades();
          },
          error: (err) => {
            const msg = err?.error?.status_text || err?.error?.message || "Error al eliminar la disponibilidad.";
            this.modalService.alert("Error", msg);
            console.error("Error al eliminar disponibilidad:", err);
          },
        });
      });
  }
}
