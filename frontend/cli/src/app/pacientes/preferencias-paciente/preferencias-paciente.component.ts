import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Models & Services
import { PacienteService } from '../paciente.service';
import { PreferenciaHoraria } from '../preferencia-horaria';
import { DataPackage } from '../../data.package';

/**
 * Componente para gestionar las preferencias horarias de un paciente.
 * 
 * Permite al paciente autenticado:
 * - Ver sus preferencias horarias configuradas
 * - Agregar nuevas preferencias (día + rango horario)
 * - Eliminar preferencias existentes
 * 
 * Las preferencias se utilizan para filtrar los turnos disponibles en el buscador,
 * mostrando solo aquellos que coincidan con los horarios preferidos del paciente.
 */
@Component({
  selector: 'app-preferencias-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preferencias-paciente.component.html',
  styleUrls: ['./preferencias-paciente.component.css']
})
export class PreferenciasPacienteComponent implements OnInit {
  
  /** Lista de preferencias horarias del paciente */
  preferencias: PreferenciaHoraria[] = [];
  
  /** Nueva preferencia que se está creando */
  nuevaPreferencia: PreferenciaHoraria = {
    diaDeLaSemana: '',
    horaDesde: '',
    horaHasta: ''
  };
  
  /** Array de días de la semana para el selector */
  diasSemana: { valor: string; etiqueta: string }[] = [
    { valor: 'LUNES', etiqueta: 'Lunes' },
    { valor: 'MARTES', etiqueta: 'Martes' },
    { valor: 'MIERCOLES', etiqueta: 'Miércoles' },
    { valor: 'JUEVES', etiqueta: 'Jueves' },
    { valor: 'VIERNES', etiqueta: 'Viernes' },
    { valor: 'SABADO', etiqueta: 'Sábado' },
    { valor: 'DOMINGO', etiqueta: 'Domingo' }
  ];

  /** Indica si se está procesando una operación */
  isLoading = false;

  /** Mensajes de éxito o error */
  mensaje = '';
  tipoMensaje: 'success' | 'error' | '' = '';

  constructor(private pacienteService: PacienteService) {}

  ngOnInit(): void {
    this.cargarPreferencias();
  }

  /**
   * Carga las preferencias horarias del paciente desde el backend.
   */
  cargarPreferencias(): void {
    this.pacienteService.getPreferencias().subscribe({
      next: (response: DataPackage<PreferenciaHoraria[]>) => {
        this.preferencias = response.data || [];
      },
      error: (error) => {
        console.error('Error al cargar preferencias:', error);
        this.mostrarMensaje('Error al cargar las preferencias', 'error');
      }
    });
  }

  /**
   * Agrega una nueva preferencia horaria.
   * 
   * Valida los datos, envía la petición al backend, y si tiene éxito:
   * - Resetea el formulario
   * - Recarga la lista de preferencias
   * - Muestra un mensaje de éxito
   */
  agregarPreferencia(): void {
    // Validaciones
    if (!this.nuevaPreferencia.diaDeLaSemana || 
        !this.nuevaPreferencia.horaDesde || 
        !this.nuevaPreferencia.horaHasta) {
      this.mostrarMensaje('Por favor, completa todos los campos', 'error');
      return;
    }

    // Validar que horaDesde sea anterior a horaHasta
    if (this.nuevaPreferencia.horaDesde >= this.nuevaPreferencia.horaHasta) {
      this.mostrarMensaje('La hora de inicio debe ser anterior a la hora de fin', 'error');
      return;
    }

    this.isLoading = true;

    this.pacienteService.addPreferencia(this.nuevaPreferencia).subscribe({
      next: (response: DataPackage<PreferenciaHoraria>) => {
        const pref = response.data;
        this.mostrarMensaje(
          `Preferencia agregada: ${this.formatearDia(pref.diaDeLaSemana)} de ${pref.horaDesde} a ${pref.horaHasta}`,
          'success'
        );
        this.limpiarFormulario();
        this.cargarPreferencias();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al agregar preferencia:', error);
        const mensaje = error.error?.status_text || 'Error al agregar la preferencia. Intenta nuevamente.';
        this.mostrarMensaje(mensaje, 'error');
        this.isLoading = false;
      }
    });
  }

  /**
   * Elimina una preferencia horaria existente.
   * 
   * @param id ID de la preferencia a eliminar
   * @param dia Día de la preferencia (para mostrar en el mensaje)
   */
  eliminarPreferencia(id: number, dia: string): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar la preferencia de ${this.formatearDia(dia)}?`)) {
      return;
    }

    this.isLoading = true;

    this.pacienteService.deletePreferencia(id).subscribe({
      next: () => {
        this.mostrarMensaje('Preferencia eliminada correctamente', 'success');
        this.cargarPreferencias();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al eliminar preferencia:', error);
        const mensaje = error.status === 404 
          ? 'Preferencia no encontrada' 
          : 'Error al eliminar la preferencia. Intenta nuevamente.';
        this.mostrarMensaje(mensaje, 'error');
        this.isLoading = false;
      }
    });
  }

  /**
   * Limpia el formulario de nueva preferencia.
   */
  private limpiarFormulario(): void {
    this.nuevaPreferencia = {
      diaDeLaSemana: '',
      horaDesde: '',
      horaHasta: ''
    };
  }

  /**
   * Muestra un mensaje temporal de éxito o error.
   */
  private mostrarMensaje(texto: string, tipo: 'success' | 'error'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;

    // Ocultar el mensaje después de 5 segundos
    setTimeout(() => {
      this.mensaje = '';
      this.tipoMensaje = '';
    }, 5000);
  }

  /**
   * Formatea el día de la semana para mostrarlo capitalizado.
   */
  formatearDia(dia: string): string {
    return dia.charAt(0) + dia.slice(1).toLowerCase();
  }
}
