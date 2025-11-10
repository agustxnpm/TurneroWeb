import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HistorialService, HistorialTurnoDTO, HistorialFilter } from './historial.service';
import { HistorialTurnoDetalleComponent } from './historial-turno-detalle.component';

@Component({
  selector: 'app-historial-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-turnos.component.html',
  styleUrls: ['./historial-turnos.component.css']
})
export class HistorialTurnosComponent implements OnInit {
  turnos: HistorialTurnoDTO[] = [];
  isLoading = false;

  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  // Filtros
  filtro: HistorialFilter = {
    fechaDesde: undefined,
    fechaHasta: undefined,
    estado: undefined  // ⚠️ Cambiá de '' a undefined
  };
  constructor(
    private historialService: HistorialService,
    private modalService: NgbModal
  ) { }

  abrirDetalle(turno: HistorialTurnoDTO) {
    const modalRef = this.modalService.open(HistorialTurnoDetalleComponent, {
      size: 'lg',
      centered: true,
      backdrop: true, // Permite cerrar clickeando fuera
      keyboard: true  // Permite cerrar con ESC
    });
    modalRef.componentInstance.turno = turno;
  }

  ngOnInit() {
    this.cargarHistorial();
  }

  cargarHistorial() {
    const pacienteId = parseInt(localStorage.getItem('pacienteId') || '0');
    if (!pacienteId) {
      console.error('No se encontró ID de paciente');
      return;
    }

    // 🔍 DEBUG: Ver qué filtros se están enviando
    console.log('📡 Enviando request con filtros:', {
      pacienteId,
      page: this.currentPage,
      size: this.pageSize,
      filtro: this.filtro
    });

    this.isLoading = true;
    this.historialService.getHistorialTurnosPaginado(
      pacienteId,
      this.currentPage,
      this.pageSize,
      this.filtro
    ).subscribe({
      next: (response) => {
        console.log('✅ Response recibida:', response);
        this.turnos = response.data.content;
        this.totalPages = response.data.totalPages;
        this.totalElements = response.data.totalElements;
        this.currentPage = response.data.currentPage;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar historial:', error);
        this.isLoading = false;
      }
    });
  }

  aplicarFiltros() {
    console.log('🔍 Filtros aplicados:', this.filtro);
    console.log('   - Estado:', this.filtro.estado, '(tipo:', typeof this.filtro.estado, ')');

    // Limpiar valores vacíos
    if (this.filtro.estado === '' || this.filtro.estado === 'TODOS') {
      this.filtro.estado = undefined;
    }

    this.currentPage = 0;
    this.cargarHistorial();
  }

  cambiarPagina(pagina: number) {
    this.currentPage = pagina;
    this.cargarHistorial();
  }

  getPaginasArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  getEstadoClass(estado: string): string {
    return `estado-${estado.toLowerCase()}`;
  }
}