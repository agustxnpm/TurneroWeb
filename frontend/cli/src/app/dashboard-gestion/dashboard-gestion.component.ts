import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
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
}
