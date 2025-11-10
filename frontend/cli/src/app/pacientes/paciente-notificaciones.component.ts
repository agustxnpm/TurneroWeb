import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificacionService, NotificacionDTO, PageNotificacion } from '../services/notificacion.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-paciente-notificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paciente-notificaciones.component.html',
  styleUrl: './paciente-notificaciones.component.css'
})
export class PacienteNotificacionesComponent implements OnInit, OnDestroy {

  notificaciones: NotificacionDTO[] = [];
  notificacionesFiltradas: NotificacionDTO[] = [];
  contadorNoLeidas = 0;
  loading = false;
  
  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  // Filtros
  filtroEstado = '';
  filtroTipo = '';
  textoBusqueda = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private notificacionService: NotificacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarNotificaciones();
    this.cargarContadorNoLeidas();
    
    // Suscribirse al contador de notificaciones no leídas
    const contadorSub = this.notificacionService.contadorNoLeidas$.subscribe(
      count => this.contadorNoLeidas = count
    );
    this.subscriptions.push(contadorSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private getPacienteId(): number | null {
    const pacienteId = localStorage.getItem('pacienteId');
    return pacienteId ? parseInt(pacienteId) : null;
  }

  cargarNotificaciones(): void {
    const pacienteId = this.getPacienteId();
    if (!pacienteId) {
      console.error('No se pudo obtener el ID del paciente');
      return;
    }

    this.loading = true;
    this.notificacionService.obtenerNotificacionesPorPaciente(pacienteId, this.currentPage, this.pageSize)
      .subscribe({
        next: (page: PageNotificacion) => {
          this.notificaciones = page.content;
          this.totalElements = page.totalElements;
          this.totalPages = page.totalPages;
          this.aplicarFiltros();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar notificaciones:', error);
          this.loading = false;
        }
      });
  }

  cargarContadorNoLeidas(): void {
    const pacienteId = this.getPacienteId();
    if (pacienteId) {
      this.notificacionService.actualizarContador(pacienteId);
    }
  }

  aplicarFiltros(): void {
    let filtradas = [...this.notificaciones];

    // Filtro por estado
    if (this.filtroEstado === 'leidas') {
      filtradas = filtradas.filter(n => n.leida);
    } else if (this.filtroEstado === 'no-leidas') {
      filtradas = filtradas.filter(n => !n.leida);
    }

    // Filtro por tipo
    if (this.filtroTipo) {
      filtradas = filtradas.filter(n => n.tipo === this.filtroTipo);
    }

    // Filtro por texto
    if (this.textoBusqueda.trim()) {
      const texto = this.textoBusqueda.toLowerCase();
      filtradas = filtradas.filter(n => 
        n.titulo.toLowerCase().includes(texto) || 
        n.mensaje.toLowerCase().includes(texto)
      );
    }

    this.notificacionesFiltradas = filtradas;
  }

  marcarComoLeida(notificacion: NotificacionDTO, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (notificacion.leida) {
      return;
    }

    const pacienteId = this.getPacienteId();
    if (!pacienteId) {
      return;
    }

    this.notificacionService.marcarComoLeida(notificacion.id, pacienteId)
      .subscribe({
        next: () => {
          notificacion.leida = true;
          notificacion.fechaLeida = new Date().toISOString();
          this.aplicarFiltros();
        },
        error: (error) => {
          console.error('Error al marcar notificación como leída:', error);
        }
      });
  }

  marcarTodasComoLeidas(): void {
    if (this.contadorNoLeidas === 0) {
      return;
    }

    const pacienteId = this.getPacienteId();
    if (!pacienteId) {
      return;
    }

    this.notificacionService.marcarTodasComoLeidas(pacienteId)
      .subscribe({
        next: () => {
          this.notificaciones.forEach(n => {
            if (!n.leida) {
              n.leida = true;
              n.fechaLeida = new Date().toISOString();
            }
          });
          this.aplicarFiltros();
        },
        error: (error) => {
          console.error('Error al marcar todas las notificaciones como leídas:', error);
        }
      });
  }

  eliminarNotificacion(notificacion: NotificacionDTO, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!confirm('¿Está seguro de que desea eliminar esta notificación?')) {
      return;
    }

    const pacienteId = this.getPacienteId();
    if (!pacienteId) {
      return;
    }

    this.notificacionService.eliminarNotificacion(notificacion.id, pacienteId)
      .subscribe({
        next: () => {
          // Remover de la lista local
          this.notificaciones = this.notificaciones.filter(n => n.id !== notificacion.id);
          this.totalElements--;
          this.aplicarFiltros();
        },
        error: (error) => {
          console.error('Error al eliminar notificación:', error);
          alert('No se pudo eliminar la notificación. Intente nuevamente.');
        }
      });
  }

  actualizarNotificaciones(): void {
    this.cargarNotificaciones();
    this.cargarContadorNoLeidas();
  }

  verTurno(turnoId: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/paciente-dashboard'], { 
      queryParams: { turnoId: turnoId } 
    });
  }

  cambiarPagina(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.cargarNotificaciones();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(0, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages - 1, startPage + maxPagesToShow - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  trackByNotificacion(index: number, notificacion: NotificacionDTO): number {
    return notificacion.id;
  }

  formatearFecha(fecha: string): string {
    return this.notificacionService.formatearFecha(fecha);
  }

  obtenerClaseTipo(tipo: string): string {
    return this.notificacionService.obtenerClaseTipo(tipo);
  }

  obtenerIconoTipo(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'CONFIRMACION': 'check_circle',
      'CANCELACION': 'cancel',
      'REAGENDAMIENTO': 'event_repeat',
      'NUEVO_TURNO': 'event_available',
      'RECORDATORIO': 'event_upcoming',
      'INFO': 'info'
    };
    return iconos[tipo] || 'notifications';
  }
}
