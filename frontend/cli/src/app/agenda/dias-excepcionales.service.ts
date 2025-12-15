import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { DataPackage } from '../data.package';
import { DiaExcepcional } from './diaExcepcional';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiasExcepcionalesService {
  private baseUrl = environment.production ? `${environment.apiUrl}/agenda/dias-excepcionales` : 'rest/agenda/dias-excepcionales';
  private diasExcepcionales = new BehaviorSubject<DiaExcepcional[]>([]);
  public diasExcepcionales$ = this.diasExcepcionales.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Extrae información de días excepcionales de los eventos del calendario.
   * Esto evita hacer una request separada ya que los eventos ya contienen esta información.
   */
  extraerDiasExcepcionalesDeEventos(eventos: any[]): void {
    const diasExcepcionales: DiaExcepcional[] = [];
    const fechasProcesadas = new Set<string>();

    eventos.forEach(evento => {
      // Skip si ya procesamos esta fecha
      if (fechasProcesadas.has(evento.fecha)) {
        return;
      }

      // Verificar si es un evento excepcional
      if (evento.titulo && (
        evento.titulo.includes('FERIADO') || 
        evento.titulo.includes('MANTENIMIENTO') || 
        evento.titulo.includes('ATENCION_ESPECIAL')
      )) {
        let tipo: 'FERIADO' | 'MANTENIMIENTO' | 'ATENCION_ESPECIAL';
        let descripcion = '';

        // Extraer tipo y descripción del título
        if (evento.titulo.includes('FERIADO')) {
          tipo = 'FERIADO';
          descripcion = evento.titulo.replace('FERIADO:', '').trim();
        } else if (evento.titulo.includes('MANTENIMIENTO')) {
          tipo = 'MANTENIMIENTO';
          descripcion = evento.titulo.replace('MANTENIMIENTO:', '').trim();
        } else if (evento.titulo.includes('ATENCION_ESPECIAL')) {
          tipo = 'ATENCION_ESPECIAL';
          descripcion = evento.titulo.replace('ATENCION_ESPECIAL:', '').trim();
        } else {
          return; // No es un tipo reconocido
        }

        const diaExcepcional: DiaExcepcional = {
          fecha: evento.fecha,
          tipo: tipo,
          descripcion: descripcion,
          apertura: tipo !== 'FERIADO' ? evento.horaInicio : undefined,
          cierre: tipo !== 'FERIADO' ? evento.horaFin : undefined,
          centroId: evento.centroId,
          centroNombre: evento.nombreCentro,
          consultorioId: evento.consultorioId,
          consultorioNombre: evento.consultorioNombre,
          medicoId: evento.staffMedicoId,
          medicoNombre: evento.staffMedicoNombre,
          medicoApellido: evento.staffMedicoApellido,
          especialidad: evento.especialidadStaffMedico,
          activo: true
        };

        diasExcepcionales.push(diaExcepcional);
        fechasProcesadas.add(evento.fecha);
      }
    });

    console.log('Días excepcionales extraídos de eventos:', diasExcepcionales);
    this.actualizarDiasExcepcionales(diasExcepcionales);
  }

  /**
   * Carga días excepcionales por rango de fechas
   */
  cargarDiasExcepcionales(fechaInicio: string, fechaFin: string, centroId?: number): Observable<DataPackage<DiaExcepcional[]>> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    
    if (centroId) {
      params = params.set('centroId', centroId.toString());
    }

    return this.http.get<DataPackage<DiaExcepcional[]>>(this.baseUrl, { params });
  }

  /**
   * Actualiza la cache local de días excepcionales
   */
  actualizarDiasExcepcionales(dias: DiaExcepcional[]): void {
    this.diasExcepcionales.next(dias);
  }

  /**
   * Obtiene todos los días excepcionales para una fecha específica
   */
  getDiasExcepcionalesPorFecha(fecha: string): DiaExcepcional[] {
    const dias = this.diasExcepcionales.value;
    return dias.filter(dia => dia.fecha === fecha);
  }

  /**
   * Verifica si una fecha es feriado
   */
  esFeriado(fecha: string): boolean {
    const dias = this.diasExcepcionales.value;
    return dias.some(dia => dia.fecha === fecha && dia.tipo === 'FERIADO');
  }

  /**
   * Verifica si una fecha es día de mantenimiento
   */
  esMantenimiento(fecha: string): boolean {
    const dias = this.diasExcepcionales.value;
    return dias.some(dia => dia.fecha === fecha && dia.tipo === 'MANTENIMIENTO');
  }

  /**
   * Verifica si una fecha es día de atención especial
   */
  esAtencionEspecial(fecha: string): boolean {
    const dias = this.diasExcepcionales.value;
    return dias.some(dia => dia.fecha === fecha && dia.tipo === 'ATENCION_ESPECIAL');
  }

  /**
   * Verifica si una fecha es un día excepcional
   */
  esDiaExcepcional(fecha: string): boolean {
    const dias = this.diasExcepcionales.value;
    return dias.some(dia => dia.fecha === fecha);
  }

  /**
   * Obtiene el tipo de excepción para una fecha específica
   */
  getTipoExcepcion(fecha: string): 'FERIADO' | 'ATENCION_ESPECIAL' | 'MANTENIMIENTO' | null {
    const dias = this.diasExcepcionales.value;
    const dia = dias.find(dia => dia.fecha === fecha);
    return dia ? dia.tipo : null;
  }

  /**
   * Obtiene todas las excepciones de un día específico
   */
  getExcepcionesDelDia(fecha: string): Array<{
    tipo: 'FERIADO' | 'ATENCION_ESPECIAL' | 'MANTENIMIENTO';
    descripcion?: string;
    horaInicio?: string;
    horaFin?: string;
  }> {
    const dias = this.diasExcepcionales.value;
    const excepcionesDelDia = dias.filter(dia => dia.fecha === fecha);
    
    return excepcionesDelDia.map(dia => ({
      tipo: dia.tipo,
      descripcion: dia.descripcion,
      horaInicio: dia.apertura,
      horaFin: dia.cierre
    }));
  }

  /**
   * Obtiene la descripción del día excepcional
   */
  getDescripcionExcepcion(fecha: string): string | null {
    const dias = this.diasExcepcionales.value;
    const dia = dias.find(dia => dia.fecha === fecha);
    return dia ? dia.descripcion || '' : null;
  }

  /**
   * Obtiene la clase CSS para una fecha según su tipo de excepción
   */
  getClaseDia(fecha: string): string {
    if (this.esFeriado(fecha)) {
      return 'dia-feriado';
    }
    if (this.esMantenimiento(fecha)) {
      return 'dia-mantenimiento';
    }
    if (this.esAtencionEspecial(fecha)) {
      return 'dia-atencion-especial';
    }
    if (this.esDiaExcepcional(fecha)) {
      return 'dia-excepcional';
    }
    return '';
  }

  /**
   * Método centralizado para verificar si un slot específico está afectado por excepciones
   * Elimina duplicación de código entre componentes
   */
  slotAfectadoPorExcepcion(slot: { fecha: string; horaInicio: string; horaFin: string; enMantenimiento?: boolean; titulo?: string }): boolean {
    // NUEVA LÓGICA SIMPLIFICADA: Confiar en el backend
    // El backend ya determina si un slot está afectado por configuraciones excepcionales
    // y lo refleja en el campo 'titulo'
    
    // Un slot está afectado por excepción si:
    // 1. Está en mantenimiento individual
    // 2. El título contiene información especial diferente a "Disponible"
    return !!slot.enMantenimiento || 
           !!(slot.titulo && slot.titulo !== 'Disponible' && !slot.titulo.startsWith('Ocupado'));
  }

  /**
   * Obtiene información detallada sobre por qué un slot está afectado
   */
  getInformacionAfectacionSlot(slot: { fecha: string; horaInicio: string; horaFin: string; enMantenimiento?: boolean; titulo?: string }): {
    tipo: string;
    descripcion: string | null;
    icono: string;
  } | null {
    if (!this.slotAfectadoPorExcepcion(slot)) {
      return null;
    }

    // Información específica del slot
    if (slot.enMantenimiento) {
      return {
        tipo: 'Mantenimiento',
        descripcion: 'Mantenimiento programado para este horario',
        icono: '🔧'
      };
    }

    if (slot.titulo && slot.titulo !== 'Disponible' && !slot.titulo.startsWith('Ocupado')) {
      let tipo = 'Día Excepcional';
      let icono = '⚠️';
      let descripcion = slot.titulo;

      if (slot.titulo.includes('ATENCION_ESPECIAL')) {
        tipo = 'Atención Especial';
        icono = '⭐';
        if (slot.titulo.includes(':')) {
          descripcion = slot.titulo.split(':').slice(1).join(':').trim();
        }
      } else if (slot.titulo.includes('MANTENIMIENTO')) {
        tipo = 'Mantenimiento';
        icono = '⚙️';
        if (slot.titulo.includes(':')) {
          descripcion = slot.titulo.split(':').slice(1).join(':').trim();
        }
      } else if (slot.titulo.includes('FERIADO')) {
        tipo = 'Feriado';
        icono = '🏛️';
        if (slot.titulo.includes(':')) {
          descripcion = slot.titulo.split(':').slice(1).join(':').trim();
        }
      }

      return { tipo, descripcion, icono };
    }

    // Fallback a días excepcionales generales
    const tipoExcepcion = this.getTipoExcepcion(slot.fecha);
    if (tipoExcepcion) {
      let tipo = 'Día Excepcional';
      let icono = '⚠️';
      
      switch (tipoExcepcion) {
        case 'FERIADO':
          tipo = 'Feriado';
          icono = '🏛️';
          break;
        case 'MANTENIMIENTO':
          tipo = 'Mantenimiento del Día';
          icono = '🚧';
          break;
        case 'ATENCION_ESPECIAL':
          tipo = 'Atención Especial';
          icono = '🌟';
          break;
      }

      return {
        tipo,
        descripcion: this.getDescripcionExcepcion(slot.fecha),
        icono
      };
    }

    return null;
  }

  /**
   * Verifica si una fecha tiene franja horaria específica (no es día completo)
   */
  tieneFranjaHoraria(fecha: string): boolean {
    const dias = this.getDiasExcepcionalesPorFecha(fecha);
    return dias.some(dia => dia.apertura && dia.cierre);
  }

  /**
   * Obtiene el icono apropiado para una excepción
   */
  getIconoExcepcion(fecha: string, slot?: { enMantenimiento?: boolean; titulo?: string }): string {
    // Priorizar icono específico del slot en mantenimiento
    if (slot?.enMantenimiento) {
      return '🔧'; // Icono específico para mantenimiento de slot
    }
    
    // Para días excepcionales
    const tipo = this.getTipoExcepcion(fecha);
    if (tipo) {
      const tieneFramja = this.tieneFranjaHoraria(fecha);
      
      switch (tipo) {
        case 'FERIADO':
          return tieneFramja ? '🏛️' : '🏛️';
        case 'MANTENIMIENTO':
          return tieneFramja ? '⚙️' : '🚧'; // Diferente icono para mantenimiento parcial vs completo
        case 'ATENCION_ESPECIAL':
          return tieneFramja ? '⭐' : '🌟';
        default:
          return '⚠️';
      }
    }
    
    return '📅'; // Día normal
  }

  /**
   * Obtiene la etiqueta del tipo de excepción
   */
  getTipoExcepcionLabel(fecha: string, slot?: { titulo?: string; enMantenimiento?: boolean }): string {
    // NUEVA LÓGICA: Usar el título del slot como fuente de verdad
    if (slot?.titulo) {
      // Extraer el tipo del título
      if (slot.titulo.includes('ATENCION_ESPECIAL')) {
        return 'Atención Especial';
      }
      if (slot.titulo.includes('MANTENIMIENTO')) {
        return 'Mantenimiento';
      }
      if (slot.titulo.includes('FERIADO')) {
        return 'Feriado';
      }
      if (slot.enMantenimiento) {
        return 'Mantenimiento';
      }
    }
    
    // Fallback a la lógica de día excepcional solo si no hay información en el slot
    const tipo = this.getTipoExcepcion(fecha);
    if (tipo && !this.tieneFranjaHoraria(fecha)) {
      switch (tipo) {
        case 'FERIADO':
          return 'Feriado';
        case 'MANTENIMIENTO':
          return 'Mantenimiento del Día';
        case 'ATENCION_ESPECIAL':
          return 'Atención Especial';
        default:
          return 'Día Excepcional';
      }
    }
    
    return 'Disponible';
  }

  /**
   * Obtiene la descripción de la excepción considerando tanto slot específico como día excepcional
   */
  getDescripcionExcepcionSlot(fecha: string, slot?: { titulo?: string }): string | null {
    // NUEVA LÓGICA: Usar el título del slot como fuente de verdad
    if (slot?.titulo && slot.titulo !== 'Disponible' && !slot.titulo.startsWith('Ocupado')) {
      // Extraer la descripción del título
      if (slot.titulo.includes(':')) {
        const partes = slot.titulo.split(':');
        if (partes.length > 1) {
          return partes.slice(1).join(':').trim();
        }
      }
      return slot.titulo;
    }
    
    // Fallback a la lógica de día excepcional
    return this.getDescripcionExcepcion(fecha);
  }

  /**
   * Verifica si una fecha tiene slots individuales en mantenimiento (no días excepcionales completos)
   */
  tieneSlotsEnMantenimiento(fecha: string, slots: any[]): boolean {
    // Solo contar slots en mantenimiento si NO es un día excepcional completo
    if (this.esDiaExcepcional(fecha) && !this.tieneFranjaHoraria(fecha)) {
      return false; // Es día excepcional completo, no slots individuales
    }
    
    const slotsDelDia = slots.filter(slot => slot.fecha === fecha);
    return slotsDelDia.some(slot => slot.enMantenimiento);
  }
}
