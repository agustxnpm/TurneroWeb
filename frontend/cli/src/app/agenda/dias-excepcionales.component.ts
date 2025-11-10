import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../turnos/turno.service';
import { EsquemaTurnoService } from '../esquemaTurno/esquemaTurno.service';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { DiaExcepcional } from './diaExcepcional';

@Component({
  selector: 'app-dias-excepcionales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dias-excepcionales.component.html',
  styleUrl: './dias-excepcionales.component.css'
})
export class DiasExcepcionalesComponent implements OnInit {
  diasExcepcionales: DiaExcepcional[] = [];
  diasFiltrados: DiaExcepcional[] = [];
  centros: any[] = [];
  esquemasTurno: any[] = [];
  
  filtros = {
    centroId: '',
    tipo: '',
    anio: new Date().getFullYear()
  };
  
  anios: number[] = [];
  showModal = false;
  editando = false;
  
  diaActual: DiaExcepcional = {
    fecha: '',
    tipo: 'FERIADO',
    descripcionExcepcion: ''
  };

  constructor(
    private turnoService: TurnoService,
    private esquemaTurnoService: EsquemaTurnoService,
    private centroService: CentroAtencionService,
    private cdr: ChangeDetectorRef
  ) {
    // Generar años (actual y próximos 2)
    const anioActual = new Date().getFullYear();
    this.anios = [anioActual - 1, anioActual, anioActual + 1, anioActual + 2];
  }

  ngOnInit() {
    this.cargarCentros();
    this.cargarEsquemasTurno();
    this.cargarDiasExcepcionales();
  }

  cargarCentros() {
    this.centroService.all().subscribe({
      next: (response) => {
        this.centros = response.data || [];
      },
      error: (error) => {
        // console.error('Error al cargar centros:', error);
      }
    });
  }

  cargarEsquemasTurno() {
    this.esquemaTurnoService.all().subscribe({
      next: (response) => {
        this.esquemasTurno = response.data || [];
      },
      error: (error) => {
        // console.error('Error al cargar esquemas de turno:', error);
      }
    });
  }

  cargarDiasExcepcionales() {
    const fechaInicio = `${this.filtros.anio}-01-01`;
    const fechaFin = `${this.filtros.anio}-12-31`;
    
    this.turnoService.getDiasExcepcionales(fechaInicio, fechaFin, 
      this.filtros.centroId ? Number(this.filtros.centroId) : undefined).subscribe({
      next: (response) => {
        // Mapear datos del backend a propiedades de compatibilidad
        this.diasExcepcionales = (response.data || []).map(dia => this.mapearDiaDesdeBackend(dia));
        this.aplicarFiltros();
      },
      error: (error) => {
        // console.error('Error al cargar días excepcionales:', error);
      }
    });
  }

  /**
   * Mapea los datos del backend (ConfiguracionExcepcionalDTO) a las propiedades 
   * de compatibilidad esperadas en el frontend
   */
  mapearDiaDesdeBackend(diaBackend: any): DiaExcepcional {
    return {
      ...diaBackend,
      // Aliases para compatibilidad con el frontend
      apertura: diaBackend.horaInicio,
      cierre: diaBackend.horaFin,
      centroId: diaBackend.centroAtencionId,
      centroNombre: diaBackend.centroAtencionNombre,
      especialidad: diaBackend.especialidadNombre,
      // Campos de compatibilidad para formulario
      descripcionExcepcion: diaBackend.descripcion,
      // Mapear la duración - el backend devuelve "duracion", el frontend espera "duracion"
      duracion: diaBackend.duracion,
      duracionMinutos: diaBackend.duracion // Alias para formularios de atención especial
    };
  }

  aplicarFiltros() {
    this.diasFiltrados = this.diasExcepcionales.filter(dia => {
      let cumpleFiltros = true;
      
      if (this.filtros.tipo && dia.tipo !== this.filtros.tipo) {
        cumpleFiltros = false;
      }
      
      return cumpleFiltros;
    });
  }

  abrirModalNuevo() {
    this.editando = false;
    this.diaActual = {
      fecha: '',
      tipo: 'FERIADO',
      descripcionExcepcion: ''
    };
    this.showModal = true;
  }

  editar(dia: DiaExcepcional) {
    this.editando = true;
    // Mapear campos del DTO a campos del formulario
    this.diaActual = {
      ...dia,
      descripcionExcepcion: dia.descripcion || dia.descripcionExcepcion,
      horaInicio: dia.apertura || dia.horaInicio,
      horaFin: dia.cierre || dia.horaFin
    };
    this.showModal = true;
  }

  onTipoChange() {
    // Limpiar campos específicos cuando cambia el tipo
    if (this.diaActual.tipo === 'FERIADO') {
      this.diaActual.esquemaTurnoId = undefined;
      this.diaActual.horaInicio = undefined;
      this.diaActual.horaFin = undefined;
      this.diaActual.duracion = undefined;
      this.diaActual.duracionMinutos = undefined;
      this.diaActual.tipoProcedimiento = undefined;
    } else if (this.diaActual.tipo === 'ATENCION_ESPECIAL') {
      // Para atención especial no se necesita tiempo de sanitización
      this.diaActual.duracion = undefined;
      // Limpiar campos específicos de mantenimiento si se cambió desde allí
      this.diaActual.horaFin = undefined;
    } else if (this.diaActual.tipo === 'MANTENIMIENTO') {
      // Para mantenimiento no se necesitan campos de procedimiento
      this.diaActual.duracionMinutos = undefined;
      this.diaActual.tipoProcedimiento = undefined;
      this.diaActual.horaFin = undefined;
    }
  }

  onEsquemaTurnoChange() {
    // Este método se llama cuando cambia la selección del esquema de turno
    // Fuerza la actualización de la vista para mostrar/ocultar la información del esquema
    this.cdr.detectChanges();
  }

  getEsquemaSeleccionado(): any {
    if (!this.diaActual.esquemaTurnoId) {
      return null;
    }
    return this.esquemasTurno.find(esquema => esquema.id == this.diaActual.esquemaTurnoId);
  }

  guardar() {
    if (!this.diaActual.fecha || !this.diaActual.tipo|| !this.diaActual.descripcionExcepcion) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    // Validaciones específicas por tipo
    if (this.diaActual.tipo !== 'FERIADO') {
      if (!this.diaActual.esquemaTurnoId) {
        alert('Debe seleccionar un esquema de turno para este tipo de día excepcional');
        return;
      }
    }

    if (this.diaActual.tipo === 'ATENCION_ESPECIAL') {
      if (!this.diaActual.horaInicio || !this.diaActual.duracionMinutos || !this.diaActual.tipoProcedimiento) {
        alert('Debe especificar hora de inicio, duración y tipo de procedimiento para atención especial');
        return;
      }
      if (this.diaActual.duracionMinutos < 15 || this.diaActual.duracionMinutos > 480) {
        alert('La duración debe estar entre 15 minutos y 8 horas (480 minutos)');
        return;
      }
      if (!this.diaActual.descripcionExcepcion || this.diaActual.descripcionExcepcion.trim().length < 10) {
        alert('Debe proporcionar una descripción detallada del procedimiento (mínimo 10 caracteres)');
        return;
      }
    }

    if (this.diaActual.tipo === 'MANTENIMIENTO') {
      if (!this.diaActual.horaInicio) {
        alert('Debe especificar la hora de inicio del mantenimiento');
        return;
      }
      if (!this.diaActual.duracion || this.diaActual.duracion <= 0) {
        alert('Debe especificar un tiempo de duración válido para el mantenimiento');
        return;
      }
    }

    // Preparar datos para enviar
    const params: any = {
      fecha: this.diaActual.fecha,
      tipoAgenda: this.diaActual.tipo,
      descripcion: this.diaActual.descripcionExcepcion
    };

    // Solo agregar esquemaTurnoId si no es feriado
    if (this.diaActual.tipo !== 'FERIADO' && this.diaActual.esquemaTurnoId) {
      params.esquemaTurnoId = this.diaActual.esquemaTurnoId;
    }

    // Agregar horarios si es atención especial
    if (this.diaActual.tipo === 'ATENCION_ESPECIAL') {
      params.horaInicio = this.diaActual.horaInicio;
      params.duracionMinutos = this.diaActual.duracionMinutos;
      params.tipoProcedimiento = this.diaActual.tipoProcedimiento;
      
      // Calcular hora fin basada en duración para compatibilidad con backend
      if (this.diaActual.horaInicio && this.diaActual.duracionMinutos) {
        const [horas, minutos] = this.diaActual.horaInicio.split(':').map(Number);
        const inicioEnMinutos = horas * 60 + minutos;
        const finEnMinutos = inicioEnMinutos + this.diaActual.duracionMinutos;
        const horaFin = Math.floor(finEnMinutos / 60);
        const minutoFin = finEnMinutos % 60;
        params.horaFin = `${horaFin.toString().padStart(2, '0')}:${minutoFin.toString().padStart(2, '0')}`;
      }
    }

    // Agregar hora de inicio si es mantenimiento
    if (this.diaActual.tipo === 'MANTENIMIENTO') {
      params.horaInicio = this.diaActual.horaInicio;
    }

    // Agregar duración si está especificado
    if (this.diaActual.duracion) {
      params.duracion = this.diaActual.duracion;
    }

    // Usar el método apropiado según si estamos editando o creando
    const operacion = this.editando ? 
      this.turnoService.actualizarDiaExcepcional(this.diaActual.id!, params) :
      this.turnoService.crearDiaExcepcional(params);

    operacion.subscribe({
      next: () => {
        alert(`Día excepcional ${this.editando ? 'actualizado' : 'creado'} correctamente`);
        this.cerrarModal();
        this.cargarDiasExcepcionales();
      },
      error: (error) => {
        // console.error('Error al guardar día excepcional:', error);
        const mensaje = error.error?.status_text || error.error?.message || 'Error al guardar el día excepcional';
        alert(mensaje);
      }
    });
  }

  eliminar(dia: DiaExcepcional) {
    if (confirm('¿Está seguro que desea eliminar este día excepcional?')) {
      this.turnoService.eliminarDiaExcepcional(dia.id!).subscribe({
        next: () => {
          alert('Día excepcional eliminado correctamente');
          this.cargarDiasExcepcionales();
        },
        error: (error) => {
          // console.error('Error al eliminar día excepcional:', error);
          alert('Error al eliminar el día excepcional: ' + (error.error?.message || 'Error desconocido'));
        }
      });
    }
  }

  cerrarModal() {
    this.showModal = false;
    this.editando = false;
  }

  getTipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'FERIADO': return 'badge-danger';
      case 'ATENCION_ESPECIAL': return 'badge-warning';
      case 'MANTENIMIENTO': return 'badge-info';
      default: return 'badge-secondary';
    }
  }

  getTipoIcon(tipo: string): string {
    switch (tipo) {
      case 'FERIADO': return 'fa-calendar-times';
      case 'ATENCION_ESPECIAL': return 'fa-clock';
      case 'MANTENIMIENTO': return 'fa-tools';
      default: return 'fa-calendar';
    }
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'FERIADO': return 'Feriado';
      case 'ATENCION_ESPECIAL': return 'Atención Especial';
      case 'MANTENIMIENTO': return 'Mantenimiento';
      default: return tipo;
    }
  }

  // Función para calcular duración en minutos entre dos horas
  calcularDuracion(horaInicio: string, horaFin: string): number {
    if (!horaInicio || !horaFin) return 0;
    
    const [horasInicio, minutosInicio] = horaInicio.split(':').map(Number);
    const [horasFin, minutosFin] = horaFin.split(':').map(Number);
    
    const inicioEnMinutos = horasInicio * 60 + minutosInicio;
    const finEnMinutos = horasFin * 60 + minutosFin;
    
    return finEnMinutos - inicioEnMinutos;
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
}
