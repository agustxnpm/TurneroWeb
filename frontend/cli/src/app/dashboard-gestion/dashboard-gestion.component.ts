import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { ExportService } from '../services/export.service';
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

  constructor(
    private dashboardService: DashboardService,
    private centroAtencionService: CentroAtencionService,
    private exportService: ExportService,
    private modalService: ModalService
  ) { }

  // ===== Calidad y predictivas =====
  calidad: any = {};
  predictivas: any[] = [];

  ngOnInit(): void {
    this.cargarCentrosAtencion();
    this.cargarMetricas();
    this.cargarOcupacion();
    this.cargarCalidad();
    this.cargarPredictivas();
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
    const filtros = { fechaDesde: undefined, fechaHasta: undefined };
    this.dashboardService.getComentarios(filtros).subscribe({
      next: (res) => {
        const comentarios = res.data || [];
        this.modalService.open(ComentariosModalComponent, { size: 'lg' }).componentInstance.comentarios = comentarios;
      }, error: () => { console.error('Error cargando comentarios'); }
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
        alert('Error al exportar CSV. Por favor intente de nuevo.');
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
          alert('Error al generar PDF. Por favor intente de nuevo.');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al exportar PDF:', error);
        alert('Error al exportar PDF. Por favor intente de nuevo.');
        this.loading = false;
      }
    });
  }

  /**
   * Construye el objeto de filtro para exportación
   * Toma los valores actuales del dashboard
   */
  private construirFiltroExportacion(): any {
    return {
      // Los filtros se enviarán tal como estén en el estado actual del dashboard
      // Si no hay filtros específicos, el backend retornará todos los datos
      fechaDesde: null,
      fechaHasta: null,
      centroId: null
    };
  }
}
