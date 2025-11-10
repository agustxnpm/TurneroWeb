import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CentroAtencion } from '../../centrosAtencion/centroAtencion';

@Component({
  selector: 'app-filtros-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filtros-dashboard.component.html',
  styleUrls: ['./filtros-dashboard.component.css']
})
export class FiltrosDashboardComponent {
  @Input() centrosAtencion: CentroAtencion[] = [];
  
  fechaDesde: string | null = null;
  fechaHasta: string | null = null;
  centroAtencionId: number | null = null;

  @Output() aplicar = new EventEmitter<any>();

  get centroSeleccionado(): CentroAtencion | undefined {
    return this.centrosAtencion.find(c => c.id === this.centroAtencionId);
  }

  onCentroChange() {
    this.submit();
  }

  submit() {
    this.aplicar.emit({ 
      fechaDesde: this.fechaDesde, 
      fechaHasta: this.fechaHasta,
      centroId: this.centroAtencionId
    });
  }

  clearFilters() {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.centroAtencionId = null;
    this.submit();
  }

  hasActiveFilters(): boolean {
    return this.fechaDesde !== null || this.fechaHasta !== null || this.centroAtencionId !== null;
  }
}
