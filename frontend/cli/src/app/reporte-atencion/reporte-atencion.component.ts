import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TurnoService } from '../turnos/turno.service';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { StaffMedicoService } from '../staffMedicos/staffMedico.service';
import { ExportService } from '../services/export.service';
import { UserContextService } from '../services/user-context.service';
import { CentroAtencion } from '../centrosAtencion/centroAtencion';
import { PaginationComponent } from '../pagination/pagination.component';

/**
 * Componente para mostrar reporte de turnos completados
 * Permite filtrar por médico, centro de atención y rango de fechas
 */
@Component({
    selector: 'app-reporte-atencion',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
    templateUrl: './reporte-atencion.component.html',
    styleUrls: ['./reporte-atencion.component.css']
})
export class ReporteAtencionComponent implements OnInit {

    filterForm: FormGroup;
    turnosCompletados: any[] = [];
    centrosAtencion: CentroAtencion[] = [];
    staffMedicos: any[] = [];
    staffMedicosFiltrados: any[] = [];
    centroDeshabilitado: boolean = false;

    loading = false;
    mostrarListaMedicos = false;

    totalElements = 0;
    currentPage = 0;
    pageSize = 10;
    totalPages = 0;

    sortBy = 'fecha';
    sortDir = 'desc'; constructor(
        private fb: FormBuilder,
        private turnoService: TurnoService,
        private centroService: CentroAtencionService,
        private staffMedicoService: StaffMedicoService,
        private exportService: ExportService,
        private userContextService: UserContextService
    ) {
        this.filterForm = this.fb.group({
            staffMedicoId: [null],
            nombreMedicoInput: [''],
            centroAtencionId: [null],
            fechaDesde: [''],
            fechaHasta: ['']
        });
    }

    ngOnInit(): void {
        // Obtener centro de atención del usuario si es ADMIN/OPERADOR
        const context = this.userContextService.getCurrentContext();
        const isAdmin = this.userContextService.isAdmin;
        const isOperador = this.userContextService.isOperador;
        
        if ((isAdmin || isOperador) && context.centroAtencionId) {
            // Pre-setear el centro en el formulario
            this.filterForm.patchValue({
                centroAtencionId: context.centroAtencionId
            });
            this.centroDeshabilitado = true; // Deshabilitar selector para ADMIN/OPERADOR
        }
        
        this.cargarCentrosAtencion();
        this.cargarStaffMedicos();
    }

    cargarCentrosAtencion(): void {
        this.centroService.getAll().subscribe({
            next: (res: any) => {
                this.centrosAtencion = res.data || [];
            },
            error: (err: any) => {
                console.error('Error cargando centros de atención:', err);
                this.centrosAtencion = [];
            }
        });
    }

    cargarStaffMedicos(): void {
        // Intentar cargar staff médicos - algunos servicios podrían no tener getAll()
        if (typeof (this.staffMedicoService as any).getAll === 'function') {
            (this.staffMedicoService as any).getAll().subscribe({
                next: (res: any) => {
                    this.staffMedicos = res.data || [];
                    this.staffMedicosFiltrados = [];
                },
                error: (err: any) => {
                    console.error('Error cargando staff médicos:', err);
                    this.staffMedicos = [];
                    this.staffMedicosFiltrados = [];
                }
            });
        }
    }

    buscar(): void {
        this.currentPage = 0;
        this.cargarTurnosCompletados();
    } cargarTurnosCompletados(page: number = 0): void {
        this.loading = true;
        this.currentPage = page;

        const filters = this.filterForm.value;

        // Validar formato de fechas
        let fechaDesde: string | undefined;
        let fechaHasta: string | undefined;

        if (filters.fechaDesde && filters.fechaDesde.trim()) {
            fechaDesde = this.formatDateToISO(filters.fechaDesde);
        }
        if (filters.fechaHasta && filters.fechaHasta.trim()) {
            fechaHasta = this.formatDateToISO(filters.fechaHasta);
        }

        this.turnoService.getTurnosCompletados(
            filters.staffMedicoId,
            filters.centroAtencionId,
            fechaDesde,
            fechaHasta,
            page,
            this.pageSize,
            this.sortBy,
            this.sortDir
        ).subscribe({
            next: (res: any) => {
                if (res && res.data) {
                    this.turnosCompletados = res.data.content || [];
                    this.totalElements = res.data.totalElements || 0;
                    this.totalPages = res.data.totalPages || 0;
                    this.currentPage = res.data.currentPage || 0;
                } else {
                    this.turnosCompletados = [];
                    this.totalElements = 0;
                    this.totalPages = 0;
                }
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error cargando turnos completados:', err);
                this.turnosCompletados = [];
                this.totalElements = 0;
                this.totalPages = 0;
                this.loading = false;
                alert('Error al cargar los turnos completados');
            }
        });
    }

    onPageChange(newPage: number): void {
        this.cargarTurnosCompletados(newPage);
    }

    limpiarFiltros(): void {
        this.filterForm.reset();
        this.turnosCompletados = [];
        this.totalElements = 0;
        this.currentPage = 0;
    }

    exportarCSV(): void {
        if (this.loading) return;

        this.loading = true;
        const filters = this.filterForm.value;

        let fechaDesde: string | undefined;
        let fechaHasta: string | undefined;

        if (filters.fechaDesde && filters.fechaDesde.trim()) {
            fechaDesde = this.formatDateToISO(filters.fechaDesde);
        }
        if (filters.fechaHasta && filters.fechaHasta.trim()) {
            fechaHasta = this.formatDateToISO(filters.fechaHasta);
        }

        this.exportService.exportarReporteAtencionCSV(
            filters.staffMedicoId,
            filters.centroAtencionId,
            fechaDesde,
            fechaHasta
        ).subscribe({
            next: (response: any) => {
                const content = response.body || '';
                const filename = `reporte_atencion_${new Date().toISOString().split('T')[0]}.csv`;
                this.exportService.descargarCSV(content, filename);
                this.loading = false;
                alert('CSV descargado correctamente');
            },
            error: (err: any) => {
                console.error('Error al exportar CSV:', err);
                this.loading = false;
                alert('Error al exportar CSV');
            }
        });
    }

    exportarPDF(): void {
        if (this.loading) return;

        this.loading = true;
        const filters = this.filterForm.value;

        let fechaDesde: string | undefined;
        let fechaHasta: string | undefined;

        if (filters.fechaDesde && filters.fechaDesde.trim()) {
            fechaDesde = this.formatDateToISO(filters.fechaDesde);
        }
        if (filters.fechaHasta && filters.fechaHasta.trim()) {
            fechaHasta = this.formatDateToISO(filters.fechaHasta);
        }

        this.exportService.exportarReporteAtencionPDF(
            filters.staffMedicoId,
            filters.centroAtencionId,
            fechaDesde,
            fechaHasta
        ).subscribe({
            next: (response: any) => {
                const htmlContent = response.body || '';
                const filename = `reporte_atencion_${new Date().toISOString().split('T')[0]}.pdf`;
                this.exportService.descargarPDF(htmlContent, filename).then(() => {
                    this.loading = false;
                    alert('PDF descargado correctamente');
                }).catch(() => {
                    this.loading = false;
                    alert('Error al generar PDF');
                });
            },
            error: (err: any) => {
                console.error('Error al exportar PDF:', err);
                this.loading = false;
                alert('Error al exportar PDF');
            }
        });
    }

    /**
     * Formatea una fecha en formato YYYY-MM-DD para enviar al backend
     */
    private formatDateToISO(dateStr: string): string {
        if (!dateStr) return '';

        // Si ya está en formato ISO (yyyy-MM-dd), retornar como está
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        // Intentar parsear como fecha local del input HTML
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return dateStr;
    }

    /**
     * Determina si hay resultados para mostrar
     */
    hasResults(): boolean {
        return this.turnosCompletados.length > 0;
    }

    /**
     * Determina si debe mostrarse el mensaje de búsqueda sin resultados
     */
    shouldShowEmptyState(): boolean {
        return !this.loading && this.totalElements === 0;
    }

    /**
     * Filtra médicos según el término de búsqueda (nombre o apellido)
     */
    filtrarMedicos(termino: string): void {
        if (!termino || termino.trim().length === 0) {
            this.staffMedicosFiltrados = [];
            this.mostrarListaMedicos = false;
            return;
        }

        const terminoLower = termino.toLowerCase();
        this.staffMedicosFiltrados = this.staffMedicos.filter((medico: any) => {
            const nombre = (medico.nombre || '').toLowerCase();
            const apellido = (medico.apellido || '').toLowerCase();
            return nombre.includes(terminoLower) || apellido.includes(terminoLower);
        });

        this.mostrarListaMedicos = this.staffMedicosFiltrados.length > 0;
    }

    /**
     * Selecciona un médico de la lista de búsqueda
     */
    seleccionarMedico(medico: any): void {
        this.filterForm.patchValue({
            staffMedicoId: medico.id,
            nombreMedicoInput: `${medico.nombre} ${medico.apellido}`
        });
        this.mostrarListaMedicos = false;
        this.staffMedicosFiltrados = [];
    }

    /**
     * Limpia la selección del médico
     */
    limpiarMedico(): void {
        this.filterForm.patchValue({
            staffMedicoId: null,
            nombreMedicoInput: ''
        });
        this.mostrarListaMedicos = false;
        this.staffMedicosFiltrados = [];
    }

    /**
     * Obtiene el nombre completo del médico seleccionado
     */
    getNombreMedicoSeleccionado(): string {
        const medicoId = this.filterForm.get('staffMedicoId')?.value;
        if (medicoId) {
            return this.getNombreMedico(medicoId);
        }
        return '';
    }

    /**
     * Obtiene el nombre del médico según su ID
     */
    getNombreMedico(staffMedicoId: number): string {
        const medico = this.staffMedicos.find((m: any) => m.id === staffMedicoId);
        if (medico) {
            return `${medico.nombre || ''} ${medico.apellido || ''}`.trim();
        }
        return '-';
    }

    /**
     * Obtiene el nombre del centro según su ID
     */
    getNombreCentro(centroId: number): string {
        const centro = this.centrosAtencion.find(c => c.id === centroId);
        return centro ? centro.nombre : '-';
    }
}
