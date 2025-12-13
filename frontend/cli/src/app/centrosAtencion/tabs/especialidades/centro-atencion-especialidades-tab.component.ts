import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Especialidad } from '../../../especialidades/especialidad';

@Component({
  selector: 'app-centro-atencion-especialidades-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './centro-atencion-especialidades-tab.component.html',
  styleUrls: ['./centro-atencion-especialidades-tab.component.css']
})
export class CentroAtencionEspecialidadesTabComponent implements OnInit {
  @Input() especialidadesAsociadas: Especialidad[] = [];
  @Input() especialidadesDisponibles: Especialidad[] = [];
  @Input() especialidadSeleccionada: Especialidad | null = null;
  @Input() mensaje: string = '';
  @Input() tipoMensaje: string = '';
  @Input() centroId: number | null = null;

  @Output() especialidadSeleccionadaChange = new EventEmitter<Especialidad | null>();
  @Output() asociarEspecialidad = new EventEmitter<void>();
  @Output() desasociarEspecialidad = new EventEmitter<Especialidad>();
  @Output() crearNuevaEspecialidad = new EventEmitter<void>();

  // Propiedades para el modo de asociar
  modoAsociarEspecialidad: boolean = false;

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  onEspecialidadSeleccionadaChange(): void {
    this.especialidadSeleccionadaChange.emit(this.especialidadSeleccionada);
  }

  onModoAsociarEspecialidad(): void {
    this.modoAsociarEspecialidad = true;
  }

  onCancelarAsociarEspecialidad(): void {
    this.modoAsociarEspecialidad = false;
    this.especialidadSeleccionada = null;
    this.especialidadSeleccionadaChange.emit(null);
  }

  onAsociarEspecialidad(): void {
    this.asociarEspecialidad.emit();
  }

  onDesasociarEspecialidad(especialidad: Especialidad): void {
    this.desasociarEspecialidad.emit(especialidad);
  }

  onCrearNuevaEspecialidad(): void {
    this.crearNuevaEspecialidad.emit();
  }
}
