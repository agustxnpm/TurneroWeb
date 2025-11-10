import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, LOCALE_ID } from '@angular/core';
import { AgendaService } from './agenda.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PacienteService } from '../pacientes/paciente.service';
import { HttpClient } from '@angular/common/http';
import { DiasExcepcionalesService } from './dias-excepcionales.service';

interface SlotDisponible {
  id: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  staffMedicoId: number;
  staffMedicoNombre: string;
  staffMedicoApellido: string;
  especialidadStaffMedico: string;
  consultorioId: number;
  consultorioNombre: string;
  centroId: number;
  nombreCentro: string;
  ocupado?: boolean;
  esSlot?: boolean;
  pacienteId?: number;
  pacienteNombre?: string;
  pacienteApellido?: string;
  enMantenimiento?: boolean;
  titulo?: string;
}


@Component({
  selector: 'app-admin-agenda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es' }
  ],
  templateUrl: './admin-agenda.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],

  styleUrl: './admin-agenda.component.css'
})
export class AdminAgendaComponent implements OnInit {
  // Estados de carga
  isLoading = false;
  isAssigning = false;

  // Slots y calendario
  slotsDisponibles: SlotDisponible[] = [];
  slotsPorFecha: { [fecha: string]: SlotDisponible[] } = {};
  fechasOrdenadas: string[] = [];
  turnosAfectados: SlotDisponible[] = []; // Turnos afectados por días excepcionales
  semanas: number = 4;

  // Estados de expansión para vista por médico
  medicosExpandidos: Set<string> = new Set();
  diasExpandidos: Map<string, Set<string>> = new Map(); // medicoKey -> Set<fecha>

  // Modal y selección
  showModal = false;
  slotSeleccionado: SlotDisponible | null = null;

  // Filtros (manteniendo compatibilidad con el sistema existente)
  filterType: string = 'staffMedico';
  filterValue: string = '';
  events: any[] = []; // Para mantener compatibilidad con getFilterOptions
  filteredEvents: any[] = []; // Para mantener compatibilidad

  // Pacientes
  pacientes: { id: number; nombre: string; apellido: string }[] = [];
  pacienteId: number | null = null;

  // Variables para posicionamiento del modal contextual
  modalPosition = { top: 0, left: 0 };
  private resizeListener?: () => void;

  constructor(
    private agendaService: AgendaService,
    private pacienteService: PacienteService, // Inyecta el servicio de pacientes
    private http: HttpClient, // Inyecta HttpClient
    private cdr: ChangeDetectorRef,
    private router: Router, // Inyecta el Router
    private diasExcepcionalesService: DiasExcepcionalesService // Inyecta el servicio de días excepcionales
  ) { }

  ngOnInit() {
    this.cargarTodosLosEventos();
    this.cargarPacientes();
    
    // Listener para reposicionar modal en resize
    this.resizeListener = () => {
      if (this.showModal) {
        // Reposicionar modal si está abierto
        const modalWidth = 500;
        const modalHeight = 400;
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
          this.modalPosition = {
            top: (window.innerHeight - modalHeight) / 2,
            left: (window.innerWidth - Math.min(modalWidth, window.innerWidth - 40)) / 2
          };
        }
      }
    };
    window.addEventListener('resize', this.resizeListener);
  }

  // Método para cargar eventos desde el backend y convertirlos a slots
  cargarTodosLosEventos(): void {
    this.isLoading = true;
    
    this.agendaService.obtenerTodosLosEventos(this.semanas).subscribe({
      next: (eventosBackend) => {
        // console.log('=== DATOS DEL BACKEND ===');
        // console.log('Total eventos recibidos:', eventosBackend.length);
        // console.log('Primeros 3 eventos:', eventosBackend.slice(0, 3));
        
        // Transformar los eventos del backend en slots
        this.slotsDisponibles = this.mapEventosToSlots(eventosBackend);
        this.events = eventosBackend; // Para compatibilidad con filtros
        
        // console.log('=== SLOTS PROCESADOS ===');
        // console.log('Total slots disponibles:', this.slotsDisponibles.length);
        // console.log('Primeros 3 slots:', this.slotsDisponibles.slice(0, 3));
        
        // Extraer días excepcionales de los eventos
        this.diasExcepcionalesService.extraerDiasExcepcionalesDeEventos(eventosBackend);
        
        this.aplicarFiltrosSlots();
        this.agruparSlotsPorFecha();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        // console.error('Error al cargar todos los eventos:', err);
        alert('No se pudieron cargar los eventos. Intente nuevamente.');
        this.isLoading = false;
      }
    });
  }

  // Transformar eventos del backend a slots
  private mapEventosToSlots(eventosBackend: any[]): SlotDisponible[] {
    const slots: SlotDisponible[] = [];
    const slotsAfectados: SlotDisponible[] = [];

    // console.log('=== MAPEANDO EVENTOS A SLOTS ===');
    let eventosProcesados = 0;
    let eventosDescartados = 0;

    eventosBackend.forEach((evento, index) => {
      // Validar que el evento tenga los datos necesarios
      if (!evento.fecha || !evento.horaInicio || !evento.horaFin || !evento.esSlot) {
        eventosDescartados++;
        if (index < 3) {
          // console.log(`Evento ${index} descartado:`, evento);
        }
        return;
      }

      eventosProcesados++;

      // Determinar si realmente está ocupado por un paciente vs día excepcional
      const esOcupadoPorPaciente = evento.ocupado && evento.pacienteId && evento.pacienteNombre;
      const esConfiguracionEspecial = evento.ocupado && !evento.pacienteId && evento.titulo && 
        (evento.titulo.includes('FERIADO') || evento.titulo.includes('MANTENIMIENTO') || evento.titulo.includes('ATENCION_ESPECIAL'));

      if (index < 3) {
        console.log(`=== EVENTO ${index} ===`);
        console.log('Datos originales:', {
          ocupado: evento.ocupado,
          pacienteId: evento.pacienteId,
          pacienteNombre: evento.pacienteNombre,
          titulo: evento.titulo,
          enMantenimiento: evento.enMantenimiento
        });
        console.log('Análisis:', {
          esOcupadoPorPaciente,
          esConfiguracionEspecial
        });
      }

      const slot: SlotDisponible = {
        id: evento.id,
        fecha: evento.fecha,
        horaInicio: evento.horaInicio,
        horaFin: evento.horaFin,
        staffMedicoId: evento.staffMedicoId,
        staffMedicoNombre: evento.staffMedicoNombre,
        staffMedicoApellido: evento.staffMedicoApellido,
        especialidadStaffMedico: evento.especialidadStaffMedico,
        consultorioId: evento.consultorioId,
        consultorioNombre: evento.consultorioNombre,
        centroId: evento.centroId,
        nombreCentro: evento.nombreCentro,
        // Confiar en lo que dice el backend: si dice ocupado, está ocupado
        ocupado: evento.ocupado || false,
        esSlot: true,
        pacienteId: evento.pacienteId,
        pacienteNombre: evento.pacienteNombre,
        pacienteApellido: evento.pacienteApellido,
        enMantenimiento: evento.enMantenimiento,
        titulo: evento.titulo
      };

      if (index < 3) {
        console.log('Slot resultante:', slot);
      }

      // Incluir TODOS los slots (afectados y no afectados) en la vista principal
      slots.push(slot);

      // Separar solo para conteo los turnos afectados
      if (this.slotAfectadoPorExcepcion(slot)) {
        slotsAfectados.push(slot);
      }
    });

    // Actualizar la lista de turnos afectados solo para el contador informativo
    this.turnosAfectados = slotsAfectados;

    // console.log('=== RESUMEN MAPEO ===');
    // console.log(`Eventos procesados: ${eventosProcesados}`);
    // console.log(`Eventos descartados: ${eventosDescartados}`);
    // console.log(`Total slots creados: ${slots.length}`);
    // console.log(`Slots afectados: ${slotsAfectados.length}`);

    return slots;
  }

  // Aplicar filtros a los slots
  aplicarFiltrosSlots() {
    let slotsFiltrados = this.slotsDisponibles;

    if (this.filterValue) {
      const valorFiltro = this.filterValue.toLowerCase();
      
      slotsFiltrados = slotsFiltrados.filter(slot => {
        switch (this.filterType) {
          case 'staffMedico':
            return `${slot.staffMedicoNombre} ${slot.staffMedicoApellido}`.toLowerCase().includes(valorFiltro);
          case 'centroAtencion':
            return slot.nombreCentro?.toLowerCase().includes(valorFiltro);
          case 'consultorio':
            return slot.consultorioNombre?.toLowerCase().includes(valorFiltro);
          case 'especialidad':
            return slot.especialidadStaffMedico?.toLowerCase().includes(valorFiltro);
          default:
            return true;
        }
      });
    }

    this.slotsDisponibles = slotsFiltrados;
  }

  // Agrupar slots por fecha y ordenar
  agruparSlotsPorFecha() {
    this.slotsPorFecha = {};

    this.slotsDisponibles.forEach(slot => {
      if (!this.slotsPorFecha[slot.fecha]) {
        this.slotsPorFecha[slot.fecha] = [];
      }
      this.slotsPorFecha[slot.fecha].push(slot);
    });


    // Ordenar slots dentro de cada fecha: PRIMERO por médico, LUEGO por hora
    Object.keys(this.slotsPorFecha).forEach(fecha => {
      this.slotsPorFecha[fecha].sort((a, b) => {
        // Primero agrupar por médico (nombre completo)
        const medicoA = `${a.staffMedicoNombre} ${a.staffMedicoApellido}`;
        const medicoB = `${b.staffMedicoNombre} ${b.staffMedicoApellido}`;
        
        if (medicoA !== medicoB) {
          return medicoA.localeCompare(medicoB);
        }
        
        // Si es el mismo médico, ordenar por hora
        return a.horaInicio.localeCompare(b.horaInicio);
      });
    });

    // Ordenar fechas
    this.fechasOrdenadas = Object.keys(this.slotsPorFecha).sort();
  }

  // Formatear fecha para mostrar
  formatearFecha(fecha: string): string {
    // Si es fecha en formato YYYY-MM-DD, parsear sin zona horaria para evitar desfases
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = fecha.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Los meses en JS van de 0-11
      const day = parseInt(parts[2]);
      const fechaObj = new Date(year, month, day);
      const opciones: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      return fechaObj.toLocaleDateString('es-ES', opciones);
    }
    
    // Para otros formatos, usar el método original
    const fechaObj = new Date(fecha + 'T00:00:00');
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return fechaObj.toLocaleDateString('es-ES', opciones);
  }

  // Seleccionar slot
  seleccionarSlot(slot: SlotDisponible, event?: MouseEvent) {
    // Calcular posición del modal cerca del elemento clickeado
    if (event) {
      this.calculateModalPosition(event);
    }
    
    this.slotSeleccionado = slot;
    this.showModal = true;
    this.pacienteId = null; // Reset paciente selection
  }

  // Calcular posición del modal contextual
  private calculateModalPosition(event: MouseEvent) {
    const modalWidth = 500;
    const modalHeight = 400;
    const padding = 20;

    // Detectar si es móvil
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // En móviles, centrar en la pantalla
      this.modalPosition = {
        top: (window.innerHeight - modalHeight) / 2,
        left: (window.innerWidth - Math.min(modalWidth, window.innerWidth - 40)) / 2
      };
      return;
    }

    // Posición del click
    let top = event.clientY;
    let left = event.clientX;

    // Ajustar para que no se salga de la pantalla
    if (left + modalWidth + padding > window.innerWidth) {
      left = window.innerWidth - modalWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    if (top + modalHeight + padding > window.innerHeight) {
      top = window.innerHeight - modalHeight - padding;
    }
    if (top < padding) {
      top = padding;
    }

    this.modalPosition = { top, left };
  }

  cargarPacientes(): void {
    this.pacienteService.all().subscribe({
      next: (dataPackage) => {
        this.pacientes = dataPackage.data; // Asigna los pacientes recibidos
      },
      error: (err) => {
        // console.error('Error al cargar pacientes:', err);
        alert('No se pudieron cargar los pacientes. Intente nuevamente.');
      },
    });
  }

  // Métodos de filtrado
  applyFilter() {
    this.aplicarFiltrosSlots();
    this.agruparSlotsPorFecha();
  }

  clearFilter() {
    this.filterValue = '';
    this.cargarTodosLosEventos(); // Recargar todos los slots
  }

  getFilterOptions(): string[] {
    const allSlots = this.slotsDisponibles;
    
    switch (this.filterType) {
      case 'staffMedico':
        return [...new Set(allSlots.map(slot => `${slot.staffMedicoNombre} ${slot.staffMedicoApellido}`).filter(Boolean))];
      case 'centroAtencion':
        return [...new Set(allSlots.map(slot => slot.nombreCentro).filter(Boolean))];
      case 'consultorio':
        return [...new Set(allSlots.map(slot => slot.consultorioNombre).filter(Boolean))];
      case 'especialidad':
        return [...new Set(allSlots.map(slot => slot.especialidadStaffMedico).filter(Boolean))];
      default:
        return [];
    }
  }

  // Modal methods
  closeModal() {
    this.showModal = false;
    this.slotSeleccionado = null;
    this.pacienteId = null;
  }

  // Métodos para manejo de días excepcionales - Delegamos al servicio centralizado
  esDiaExcepcional(fecha: string): boolean {
    return this.diasExcepcionalesService.esDiaExcepcional(fecha);
  }

  getTipoExcepcion(fecha: string): 'FERIADO' | 'ATENCION_ESPECIAL' | 'MANTENIMIENTO' | null {
    return this.diasExcepcionalesService.getTipoExcepcion(fecha);
  }

  tieneSlotsEnMantenimiento(fecha: string): boolean {
    const slotsDelDia = this.slotsPorFecha[fecha] || [];
    return this.diasExcepcionalesService.tieneSlotsEnMantenimiento(fecha, slotsDelDia);
  }

  tieneFranjaHoraria(fecha: string): boolean {
    return this.diasExcepcionalesService.tieneFranjaHoraria(fecha);
  }

  /**
   * Detecta si un slot es una configuración especial (feriado, mantenimiento, atención especial)
   * basándose en el título del evento, la propiedad enMantenimiento y la ausencia de paciente
   */
  esConfiguracionEspecial(slot: SlotDisponible): boolean {
    // Si tiene paciente asignado, no es configuración especial
    if (slot.pacienteId && slot.pacienteNombre) return false;
    
    // Verificar si está marcado como mantenimiento
    if (slot.enMantenimiento) return true;
    
    // Detectar patrones en el título que indican configuración especial
    if (slot.titulo) {
      return slot.titulo.includes('FERIADO') || 
             slot.titulo.includes('MANTENIMIENTO') || 
             slot.titulo.includes('ATENCION_ESPECIAL');
    }
    
    return false;
  }

  /**
   * Obtiene el tipo de configuración especial desde el título del slot o la propiedad enMantenimiento
   */
  getTipoConfiguracionEspecial(slot: SlotDisponible): string | null {
    if (!this.esConfiguracionEspecial(slot)) return null;
    
    // Verificar primero si está marcado como mantenimiento
    if (slot.enMantenimiento) return 'MANTENIMIENTO';
    
    // Si no, verificar por título
    if (slot.titulo?.includes('FERIADO')) return 'FERIADO';
    if (slot.titulo?.includes('MANTENIMIENTO')) return 'MANTENIMIENTO';
    if (slot.titulo?.includes('ATENCION_ESPECIAL')) return 'ATENCION_ESPECIAL';
    
    return null;
  }

  /**
   * Obtiene la descripción de la configuración especial desde el título
   */
  getDescripcionConfiguracionEspecial(slot: SlotDisponible): string | null {
    if (!this.esConfiguracionEspecial(slot) || !slot.titulo) return null;
    
    // El formato del título es: "TIPO: descripción" o "Ocupado (TIPO: descripción)"
    const match = slot.titulo.match(/(?:FERIADO|MANTENIMIENTO|ATENCION_ESPECIAL):\s*(.+)/);
    return match ? match[1].trim() : null;
  }

  /**
   * Mejora del método slotAfectadoPorExcepcion para incluir configuraciones especiales
   */
  slotAfectadoPorExcepcion(slot: SlotDisponible): boolean {
    // Primero verificar si es una configuración especial basada en el título
    if (this.esConfiguracionEspecial(slot)) return true;
    
    // Fallback al método original del servicio
    return this.diasExcepcionalesService.slotAfectadoPorExcepcion(slot);
  }

  asignarTurno(): void {
    if (!this.pacienteId || !this.slotSeleccionado) {
      alert('Por favor, seleccione un paciente.');
      return;
    }

    // Verificar si es un día excepcional o slot en mantenimiento y confirmar con el usuario
    if (this.slotAfectadoPorExcepcion(this.slotSeleccionado)) {
      const tipoExcepcion = this.getTipoExcepcionLabel(this.slotSeleccionado.fecha, this.slotSeleccionado);
      const descripcion = this.getDescripcionExcepcion(this.slotSeleccionado.fecha, this.slotSeleccionado);
      
      const esMantenimiento = this.slotSeleccionado.enMantenimiento;
      const tituloAdvertencia = esMantenimiento ? 'MANTENIMIENTO PROGRAMADO' : 'DÍA EXCEPCIONAL';
      const motivoDetalle = esMantenimiento ? 
        'Este slot está programado durante un mantenimiento.' :
        'Este turno está programado para un día marcado como "${tipoExcepcion}".';
      
      const mensaje = `⚠️ ADVERTENCIA: ${tituloAdvertencia} ⚠️\n\n` +
                     `${motivoDetalle}\n` +
                     (descripcion ? `Motivo: ${descripcion}\n\n` : '\n') +
                     `El turno NO PODRÁ REALIZARSE en la fecha/horario programado.\n\n` +
                     `¿Está seguro de que desea asignar este turno de todas formas?\n` +
                     `Se recomienda seleccionar otra fecha u horario disponible.`;

      if (!confirm(mensaje)) {
        return; // El usuario canceló la asignación
      }
    }

    this.isAssigning = true;

    const turnoDTO = {
      id: this.slotSeleccionado.id,
      fecha: this.slotSeleccionado.fecha,
      horaInicio: this.slotSeleccionado.horaInicio,
      horaFin: this.slotSeleccionado.horaFin,
      pacienteId: this.pacienteId,
      staffMedicoId: this.slotSeleccionado.staffMedicoId,
      staffMedicoNombre: this.slotSeleccionado.staffMedicoNombre,
      staffMedicoApellido: this.slotSeleccionado.staffMedicoApellido,
      especialidadStaffMedico: this.slotSeleccionado.especialidadStaffMedico,
      consultorioId: this.slotSeleccionado.consultorioId,
      consultorioNombre: this.slotSeleccionado.consultorioNombre,
      centroId: this.slotSeleccionado.centroId,
      nombreCentro: this.slotSeleccionado.nombreCentro,
      estado: 'PROGRAMADO'
    };

    // console.log('Enviando turno DTO (admin):', turnoDTO);

    this.http.post(`/rest/turno/asignar`, turnoDTO).subscribe({
      next: () => {
        alert('Turno asignado correctamente.');
        
        // Actualizar inmediatamente el slot en el array local
        this.actualizarSlotAsignado(this.slotSeleccionado!.id);
        
        this.closeModal();
        
        // Recargar los eventos para obtener datos actualizados del servidor
        setTimeout(() => {
          this.cargarTodosLosEventos();
        }, 500);
      },
      error: (err: any) => {
        // console.error('Error al asignar el turno:', err);
        alert('No se pudo asignar el turno. Intente nuevamente.');
        this.isAssigning = false;
      },
    });
  }

  // Actualizar slot asignado inmediatamente
  private actualizarSlotAsignado(slotId: number) {
    // Encontrar el slot en el array y marcarlo como ocupado
    const slotEncontrado = this.slotsDisponibles.find(slot => slot.id === slotId);
    
    if (slotEncontrado) {
      slotEncontrado.ocupado = true;
      // Obtener info del paciente seleccionado
      const pacienteSeleccionado = this.pacientes.find(p => p.id === this.pacienteId);
      if (pacienteSeleccionado) {
        slotEncontrado.pacienteId = pacienteSeleccionado.id;
        slotEncontrado.pacienteNombre = pacienteSeleccionado.nombre;
        slotEncontrado.pacienteApellido = pacienteSeleccionado.apellido;
      }
      
      // Reagrupar slots por fecha para actualizar la vista
      this.agruparSlotsPorFecha();
      
      // Forzar detección de cambios
      this.cdr.detectChanges();
    }
  }

  // Función para extraer tipo de procedimiento de la descripción
  getTipoProcedimientoFromDescription(descripcion: string): string | null {
    if (!descripcion) return null;
    
    // Buscar patrones en la descripción que indiquen el tipo
    const descripcionLower = descripcion.toLowerCase();
    if (descripcionLower.includes('cirugía') || descripcionLower.includes('cirugia')) return 'CIRUGIA';
    if (descripcionLower.includes('estudio')) return 'ESTUDIO';
    if (descripcionLower.includes('procedimiento')) return 'PROCEDIMIENTO_ESPECIAL';
    if (descripcionLower.includes('consulta')) return 'CONSULTA_EXTENDIDA';
    if (descripcionLower.includes('interconsulta')) return 'INTERCONSULTA';
    
    return null;
  }

  // Función para obtener etiqueta del tipo de procedimiento
  getTipoProcedimientoLabel(tipo: string): string {
    switch (tipo) {
      case 'CIRUGIA': return 'Cirugía';
      case 'ESTUDIO': return 'Estudio Médico';
      case 'PROCEDIMIENTO_ESPECIAL': return 'Procedimiento Especial';
      case 'CONSULTA_EXTENDIDA': return 'Consulta Extendida';
      case 'INTERCONSULTA': return 'Interconsulta';
      default: return tipo;
    }
  }

  /**
   * Determina si un slot tiene información especial pero sigue disponible
   */
  slotTieneInformacionEspecial(slot: SlotDisponible): boolean {
    return !!(slot.titulo && 
           slot.titulo !== 'Disponible' && 
           !slot.titulo.startsWith('Ocupado') && 
           !slot.ocupado && 
           !slot.enMantenimiento);
  }

  // Función auxiliar para convertir "HH:mm" a minutos desde medianoche (mantener para compatibilidad local)
  private convertirHoraAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  /**
   * Verifica si el médico ha cambiado respecto al slot anterior
   */
  esCambioMedico(fecha: string, index: number): boolean {
    const slotsDelDia = this.slotsPorFecha[fecha];
    if (!slotsDelDia || index === 0) {
      return false; // No hay cambio si es el primer slot del día
    }
    
    const slotActual = slotsDelDia[index];
    const slotAnterior = slotsDelDia[index - 1];
    
    const medicoActual = `${slotActual.staffMedicoNombre} ${slotActual.staffMedicoApellido}`;
    const medicoAnterior = `${slotAnterior.staffMedicoNombre} ${slotAnterior.staffMedicoApellido}`;
    
    return medicoActual !== medicoAnterior;
  }

  /**
   * Obtiene el nombre completo del médico de un slot
   */
  getNombreMedico(slot: SlotDisponible): string {
    return `${slot.staffMedicoNombre} ${slot.staffMedicoApellido}`;
  }

  getTipoExcepcionLabel(fecha: string, slot?: SlotDisponible): string {
    // Primero verificar si es una configuración especial del slot
    if (slot && this.esConfiguracionEspecial(slot)) {
      const tipo = this.getTipoConfiguracionEspecial(slot);
      switch (tipo) {
        case 'FERIADO': return 'Feriado';
        case 'MANTENIMIENTO': return 'Mantenimiento';
        case 'ATENCION_ESPECIAL': return 'Atención Especial';
        default: return 'Configuración Especial';
      }
    }
    
    // Fallback al servicio original
    return this.diasExcepcionalesService.getTipoExcepcionLabel(fecha, slot);
  }

  getDescripcionExcepcion(fecha: string, slot?: SlotDisponible): string | null {
    // Primero verificar si es una configuración especial del slot
    if (slot && this.esConfiguracionEspecial(slot)) {
      return this.getDescripcionConfiguracionEspecial(slot);
    }
    
    // Fallback al servicio original
    return this.diasExcepcionalesService.getDescripcionExcepcionSlot(fecha, slot);
  }

  getIconoExcepcion(fecha: string, slot?: SlotDisponible): string {
    // Primero verificar si es una configuración especial del slot
    if (slot && this.esConfiguracionEspecial(slot)) {
      const tipo = this.getTipoConfiguracionEspecial(slot);
      switch (tipo) {
        case 'FERIADO': return '🏖️';
        case 'MANTENIMIENTO': return '🔧';
        case 'ATENCION_ESPECIAL': return '🏥';
        default: return '⚠️';
      }
    }
    
    // Fallback al servicio original
    return this.diasExcepcionalesService.getIconoExcepcion(fecha, slot);
  }

  // ================================================
  // MÉTODOS PARA VISTA EXPANDIBLE POR MÉDICO
  // ================================================

  /**
   * Agrupa los slots por médico (staffMedicoId-nombre-apellido)
   */
  agruparSlotsPorMedico(): Map<string, SlotDisponible[]> {
    const slotsPorMedico = new Map<string, SlotDisponible[]>();
    
    this.slotsDisponibles.forEach(slot => {
      const medicoKey = `${slot.staffMedicoId}-${slot.staffMedicoNombre}-${slot.staffMedicoApellido}`;
      
      if (!slotsPorMedico.has(medicoKey)) {
        slotsPorMedico.set(medicoKey, []);
      }
      
      slotsPorMedico.get(medicoKey)!.push(slot);
    });
    
    return slotsPorMedico;
  }

  /**
   * Toggle expansión de médico
   */
  toggleMedicoExpansion(medicoKey: string) {
    if (this.medicosExpandidos.has(medicoKey)) {
      this.medicosExpandidos.delete(medicoKey);
      // Limpiar días expandidos cuando se colapsa el médico
      this.diasExpandidos.delete(medicoKey);
    } else {
      this.medicosExpandidos.add(medicoKey);
    }
  }

  /**
   * Verifica si un médico está expandido
   */
  isMedicoExpandido(medicoKey: string): boolean {
    return this.medicosExpandidos.has(medicoKey);
  }

  /**
   * Toggle expansión de día dentro de un médico
   */
  toggleDiaExpansion(medicoKey: string, fecha: string) {
    if (!this.diasExpandidos.has(medicoKey)) {
      this.diasExpandidos.set(medicoKey, new Set());
    }
    
    const diasSet = this.diasExpandidos.get(medicoKey)!;
    
    if (diasSet.has(fecha)) {
      diasSet.delete(fecha);
    } else {
      diasSet.add(fecha);
    }
  }

  /**
   * Verifica si un día está expandido dentro de un médico
   */
  isDiaExpandido(medicoKey: string, fecha: string): boolean {
    return this.diasExpandidos.get(medicoKey)?.has(fecha) || false;
  }

  /**
   * Obtiene información del médico desde la key
   */
  getMedicoInfo(medicoKey: string): { nombre: string; apellido: string; id: number } {
    const [id, nombre, apellido] = medicoKey.split('-');
    return { id: parseInt(id), nombre, apellido };
  }

  /**
   * Obtiene especialidades únicas de un conjunto de slots
   */
  getEspecialidadesUnicas(slots: SlotDisponible[]): string[] {
    const especialidades = new Set(slots.map(slot => slot.especialidadStaffMedico));
    return Array.from(especialidades);
  }

  /**
   * Obtiene turnos disponibles (no ocupados y no afectados) por médico
   */
  getTurnosDisponiblesPorMedico(slots: SlotDisponible[]): number {
    return slots.filter(slot => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot)).length;
  }

  /**
   * Obtiene centros únicos donde atiende el médico
   */
  getCentrosUnicos(slots: SlotDisponible[]): string[] {
    const centros = new Set(slots.map(slot => slot.nombreCentro));
    return Array.from(centros);
  }

  /**
   * Obtiene el próximo turno disponible de un médico
   */
  getProximoTurno(slots: SlotDisponible[]): SlotDisponible | null {
    const slotsDisponibles = slots
      .filter(slot => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot))
      .sort((a, b) => {
        if (a.fecha !== b.fecha) {
          return a.fecha.localeCompare(b.fecha);
        }
        return a.horaInicio.localeCompare(b.horaInicio);
      });
    
    return slotsDisponibles.length > 0 ? slotsDisponibles[0] : null;
  }

  /**
   * Agrupa slots por fecha
   */
  agruparSlotsPorDia(slots: SlotDisponible[]): Map<string, SlotDisponible[]> {
    const slotsPorDia = new Map<string, SlotDisponible[]>();
    
    slots.forEach(slot => {
      if (!slotsPorDia.has(slot.fecha)) {
        slotsPorDia.set(slot.fecha, []);
      }
      slotsPorDia.get(slot.fecha)!.push(slot);
    });
    
    // Ordenar slots por hora dentro de cada día
    slotsPorDia.forEach((slotsDelDia) => {
      slotsDelDia.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    });
    
    return slotsPorDia;
  }

  /**
   * Obtiene fechas ordenadas de los slots de un médico
   */
  getFechasOrdenadas(slots: SlotDisponible[]): string[] {
    const fechas = new Set(slots.map(slot => slot.fecha));
    return Array.from(fechas).sort();
  }

  /**
   * Obtiene slots de un médico para una fecha específica
   */
  getSlotsPorDia(slots: SlotDisponible[], fecha: string): SlotDisponible[] {
    return slots
      .filter(slot => slot.fecha === fecha)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  /**
   * Cuenta turnos disponibles en un día
   */
  getTurnosDisponiblesPorDia(slots: SlotDisponible[]): number {
    return slots.filter(slot => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot)).length;
  }

  /**
   * Obtiene el primer turno disponible de un día
   */
  getPrimerTurnoDia(slots: SlotDisponible[]): SlotDisponible | null {
    const disponibles = slots.filter(slot => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot));
    return disponibles.length > 0 ? disponibles[0] : null;
  }
}