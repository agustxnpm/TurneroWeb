import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { ExportService } from '../services/export.service';
import { UserContextService } from '../services/user-context.service';
import { CentroAtencion } from '../centrosAtencion/centroAtencion';
import { OcupacionConsultorio } from './ocupacion-consultorio';
import { KpiCardComponent } from '../components/kpi-card/kpi-card.component';
import { GraficoTortaComponent } from '../components/grafico-torta/grafico-torta.component';
import { FiltrosDashboardComponent } from '../components/filtros-dashboard/filtros-dashboard.component';
import { ModalService } from '../modal/modal.service';
import { ComentariosModalComponent } from '../modal/comentarios-modal.component';

@Component({
  selector: 'app-dashboard-gestion',
  standalone: true,
  imports: [CommonModule, FormsModule, FiltrosDashboardComponent, KpiCardComponent, GraficoTortaComponent],
  templateUrl: './dashboard-gestion.component.html',
  styleUrls: ['./dashboard-gestion.component.css']
})
export class DashboardGestionComponent implements OnInit {
  loading = false;
  centrosAtencion: CentroAtencion[] = [];
  metricas: any = {};
  ocupacion: any = {};
  ocupacionEntries: OcupacionConsultorio[] = [];
  turnosLabels: string[] = [];
  turnosData: number[] = [];
  centroIdPreseteado: number | null = null;
  centroDeshabilitado: boolean = false;

  // Filtros actuales del dashboard
  private filtrosActuales: any = {};

  constructor(
    private dashboardService: DashboardService,
    private centroAtencionService: CentroAtencionService,
    private exportService: ExportService,
    private modalService: ModalService,
    private userContextService: UserContextService
  ) { }

  // ===== Calidad y predictivas =====
  calidad: any = {};
  predictivas: any[] = [];

  ngOnInit(): void {
    // Obtener centro de atención del usuario si es ADMIN/OPERADOR
    const context = this.userContextService.getCurrentContext();
    const isAdmin = this.userContextService.isAdmin;
    const isOperador = this.userContextService.isOperador;
    
    if ((isAdmin || isOperador) && context.centroAtencionId) {
      this.centroIdPreseteado = context.centroAtencionId;
      this.centroDeshabilitado = true; // Deshabilitar selector para ADMIN/OPERADOR
      // Pre-aplicar filtros con el centro del usuario
      this.filtrosActuales = { centroId: this.centroIdPreseteado };
    }
    
    this.cargarCentrosAtencion();
    this.cargarMetricas(this.filtrosActuales);
    this.cargarOcupacion(this.filtrosActuales);
    this.cargarCalidad(this.filtrosActuales);
    this.cargarPredictivas(this.filtrosActuales);
  }

  cargarCentrosAtencion() {
    this.centroAtencionService.getAll().subscribe({
      next: (res) => {
        this.centrosAtencion = res.data || [];
      },
      error: () => {
        this.centrosAtencion = [];
      }
    });
  }

  onAplicarFiltros(filters: any) {
    // Guardar filtros actuales para reutilizar en otros lugares
    this.filtrosActuales = filters;

    this.cargarMetricas(filters);
    this.cargarOcupacion(filters);
    this.cargarCalidad(filters);
    this.cargarPredictivas(filters);
  }

  cargarCalidad(filters?: any) {
    this.dashboardService.getMetricasCalidad(filters).subscribe({
      next: (res) => {
        this.calidad = res.data || {};
      }, error: () => { this.calidad = {}; }
    });
  }

  cargarPredictivas(filters?: any) {
    this.dashboardService.getMetricasPredictivas(filters).subscribe({
      next: (res) => {
        this.predictivas = res.data || [];
      }, error: () => { this.predictivas = []; }
    });
  }

  abrirComentarios() {
    // Usar los filtros actuales del dashboard, incluyendo el centroId
    this.dashboardService.getEncuestasDetalladas(this.filtrosActuales).subscribe({
      next: (res) => {
        const encuestas = res.data || [];
        const modalRef = this.modalService.open(ComentariosModalComponent, { size: 'lg' });
        modalRef.componentInstance.encuestas = encuestas;
        modalRef.componentInstance.title = 'Encuestas de Pacientes';
      },
      error: () => {
        console.error('Error cargando encuestas');
        this.modalService.alert('Error', 'No se pudieron cargar las encuestas. Por favor intente nuevamente.');
      }
    });
  }

  cargarMetricas(filters?: any) {
    this.loading = true;
    this.dashboardService.getMetricasBasicas(filters).subscribe({
      next: (res) => {
        this.metricas = res.data || {};
        // compute labels/data for pie chart safely
        const byEstado = this.metricas.turnosPorEstado || {};
        this.turnosLabels = Object.keys(byEstado);
        this.turnosData = this.turnosLabels.map(k => byEstado[k] || 0);
        this.loading = false;
      }, error: () => this.loading = false
    });
  }

  cargarOcupacion(filters?: any) {
    this.dashboardService.getMetricasOcupacion(filters).subscribe({
      next: (res) => {
        this.ocupacion = res.data || {};
        // Usar ocupacionDetallada que viene del backend con información completa
        this.ocupacionEntries = this.ocupacion.ocupacionDetallada || [];
      }, error: () => { }
    });
  }

  /**
   * Exportar datos a CSV
   * Construye el filtro basado en los filtros actuales y llama al servicio
   */
  exportarCSV() {
    if (this.loading) return;

    this.loading = true;

    // Obtener los filtros actuales desde el último estado de filtros aplicados
    const filtros = this.construirFiltroExportacion();

    this.exportService.exportarTurnosCSV(filtros).subscribe({
      next: (response) => {
        const content = response.body || '';
        const filename = `turnos_${new Date().toISOString().split('T')[0]}.csv`;
        this.exportService.descargarCSV(content, filename);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al exportar CSV:', error);
        this.modalService.alert('Error de Exportación', 'No se pudo generar el archivo CSV. Por favor intente de nuevo.');
        this.loading = false;
      }
    });
  }

  /**
   * Exportar datos a PDF
   * Construye el filtro basado en los filtros actuales y llama al servicio
   */
  exportarPDF() {
    if (this.loading) return;

    this.loading = true;

    // Obtener los filtros actuales desde el último estado de filtros aplicados
    const filtros = this.construirFiltroExportacion();

    this.exportService.exportarTurnosPDF(filtros).subscribe({
      next: async (response) => {
        const htmlContent = response.body || '';
        try {
          const filename = `turnos_${new Date().toISOString().split('T')[0]}.pdf`;
          await this.exportService.descargarPDF(htmlContent, filename);
        } catch (error) {
          console.error('Error al generar PDF:', error);
          this.modalService.alert('Error de Generación', 'Falló la generación del PDF. Por favor intente de nuevo.');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al exportar PDF:', error);
        this.modalService.alert('Error de Exportación', 'No se pudo exportar el archivo PDF. Por favor intente de nuevo.');
        this.loading = false;
      }
    });
  }

  /**
   * Construye el objeto de filtro para exportación
   * Toma los valores actuales del dashboard
   */
  private construirFiltroExportacion(): any {
    // Retornar los filtros actuales aplicados en el dashboard
    return this.filtrosActuales || {
      fechaDesde: null,
      fechaHasta: null,
      centroId: null
    };
  }
}
