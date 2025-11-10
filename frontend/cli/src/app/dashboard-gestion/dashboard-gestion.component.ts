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
    private centroAtencionService: CentroAtencionService
  ) {}

  ngOnInit(): void {
    this.cargarCentrosAtencion();
    this.cargarMetricas();
    this.cargarOcupacion();
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
  }

  cargarMetricas(filters?: any) {
    this.loading = true;
    this.dashboardService.getMetricasBasicas(filters).subscribe({ next: (res) => {
      this.metricas = res.data || {};
      // compute labels/data for pie chart safely
      const byEstado = this.metricas.turnosPorEstado || {};
      this.turnosLabels = Object.keys(byEstado);
      this.turnosData = this.turnosLabels.map(k => byEstado[k] || 0);
      this.loading = false;
    }, error: () => this.loading = false });
  }

  cargarOcupacion(filters?: any) {
    this.dashboardService.getMetricasOcupacion(filters).subscribe({ next: (res) => {
      this.ocupacion = res.data || {};
      // Usar ocupacionDetallada que viene del backend con información completa
      this.ocupacionEntries = this.ocupacion.ocupacionDetallada || [];
    }, error: () => {} });
  }
}
