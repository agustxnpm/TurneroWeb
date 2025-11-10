import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DisponibilidadMedico } from '../../../disponibilidadMedicos/disponibilidadMedico';
import { DisponibilidadMedicoService } from '../../../disponibilidadMedicos/disponibilidadMedico.service';
import { StaffMedico } from '../../../staffMedicos/staffMedico';
import { StaffMedicoService } from '../../../staffMedicos/staffMedico.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-disponibilidad-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './disponibilidad-modal.component.html', 
  styleUrl: './disponibilidad-modal.component.css' 
})
export class DisponibilidadModalComponent {
  staffMedico: StaffMedico;
  disponibilidad: DisponibilidadMedico;
  disponibilidadExistente?: DisponibilidadMedico; // Para cargar disponibilidad existente
  especialidadId?: number; // ID de especialidad específica
  especialidadNombre?: string; // Nombre de especialidad específica para mostrar
  modoEdicion = false; // Para determinar si estamos editando o creando
  diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

  mensajeError = '';
  mensajeExito = '';
  guardando = false;
  cargandoDisponibilidades = false;

  // Propiedad para almacenar todas las disponibilidades del médico (validación inter-centro)
  todasLasDisponibilidadesMedico: DisponibilidadMedico[] = [];

  // Mapa para almacenar información de centros y especialidades por staffMedicoId
  staffMedicoInfoMap: Map<number, {centroNombre: string, especialidadNombre: string}> = new Map();

  // Lista de todos los StaffMedico del médico (para mapear centros)
  todosLosStaffMedico: any[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private disponibilidadService: DisponibilidadMedicoService,
    private staffMedicoService: StaffMedicoService
  ) {
    // Inicializar con valores por defecto
    this.staffMedico = {
      id: 0,
      medico: undefined,
      especialidad: undefined,
      centroAtencionId: 0
    };

    this.disponibilidad = {
      id: 0,
      staffMedicoId: 0,
      horarios: []
    };
  }

  ngOnInit(): void {
    // Si hay una disponibilidad existente, cargarla para edición
    if (this.disponibilidadExistente) {
      this.modoEdicion = true;
      this.disponibilidad = {
        ...this.disponibilidadExistente,
        horarios: [...this.disponibilidadExistente.horarios] // Clonar horarios
      };
      console.log('Cargando disponibilidad existente para edición:', this.disponibilidad);
    } else {
      // Modo creación - agregar un horario por defecto
      this.addHorario();
    }

    // Cargar todas las disponibilidades del médico para validación inter-centro
    this.cargarDisponibilidadesMedico();
  }

  /**
   * Carga todas las disponibilidades del médico en todos los centros
   * para poder validar conflictos inter-centro
   */
  private cargarDisponibilidadesMedico(): void {
    if (!this.staffMedico?.medico?.id) {
      console.warn('No se pudo obtener el ID del médico para cargar disponibilidades');
      return;
    }

    this.cargandoDisponibilidades = true;

    // Cargar en paralelo: disponibilidades y todos los staffMedico del médico
    forkJoin({
      disponibilidades: this.disponibilidadService.byMedico(this.staffMedico.medico.id),
      staffMedicos: this.staffMedicoService.getByMedicoId(this.staffMedico.medico.id)
    }).subscribe({
      next: (response) => {
        console.log('Response completa de disponibilidades:', response);
        console.log('response.disponibilidades:', response.disponibilidades);
        console.log('response.staffMedicos:', response.staffMedicos);

        this.todasLasDisponibilidadesMedico = response.disponibilidades.data || [];
        this.todosLosStaffMedico = response.staffMedicos.data || [];
        this.cargandoDisponibilidades = false;

        console.log('Disponibilidades del médico cargadas:', this.todasLasDisponibilidadesMedico.length);
        console.log('Datos disponibilidades:', this.todasLasDisponibilidadesMedico);
        console.log('Staff médicos del médico cargados:', this.todosLosStaffMedico.length);
        console.log('Datos de staffMedicos:', this.todosLosStaffMedico);

        // Construir mapa de información de staffMedico
        this.construirMapaStaffMedico();

        // Calcular horarios ocupados para mostrar en el calendario
        this.calcularHorariosOcupadosPorDia();
      },
      error: (error) => {
        console.error('Error al cargar disponibilidades del médico:', error);
        this.cargandoDisponibilidades = false;
        // No es un error crítico, continuar sin validación inter-centro
        this.todasLasDisponibilidadesMedico = [];
        this.todosLosStaffMedico = [];
      }
    });
  }

  /**
   * Obtiene los horarios ocupados agrupados por día de la semana
   * Incluye TODAS las disponibilidades del médico (incluyendo la que se está editando si aplica)
   */
  getHorariosOcupadosPorDia(dia: string): Array<{horaInicio: string, horaFin: string, especialidad?: string, centro?: string, esOtroCentro?: boolean, esMismoCentroOtraEspecialidad?: boolean, esDisponibilidadActual?: boolean}> {
    const horariosOcupados: Array<{horaInicio: string, horaFin: string, especialidad?: string, centro?: string, esOtroCentro?: boolean, esMismoCentroOtraEspecialidad?: boolean, esDisponibilidadActual?: boolean}> = [];

    console.log(`getHorariosOcupadosPorDia(${dia}) - Total disponibilidades:`, this.todasLasDisponibilidadesMedico.length);

    this.todasLasDisponibilidadesMedico.forEach(disponibilidad => {
      console.log(`Procesando disponibilidad ID: ${disponibilidad.id}, tiene ${disponibilidad.horarios?.length || 0} horarios`);

      // Obtener información del centro y especialidad desde la disponibilidad
      let centroNombre = 'Centro desconocido';
      let especialidadNombreDisp = 'Sin especialidad';
      let esOtroCentro = false;
      let esMismaEspecialidad = false;

      // Intentar obtener información del staffMedico
      if (disponibilidad.staffMedico) {
        if (disponibilidad.staffMedico.centro) {
          centroNombre = disponibilidad.staffMedico.centro.nombre || `Centro #${disponibilidad.staffMedico.centroAtencionId}`;
        } else if (disponibilidad.staffMedico.centroAtencionId) {
          centroNombre = `Centro #${disponibilidad.staffMedico.centroAtencionId}`;
        }

        // Verificar si es otro centro comparando IDs de centro
        if (disponibilidad.staffMedico.centroAtencionId && this.staffMedico?.centroAtencionId) {
          esOtroCentro = this.staffMedico.centroAtencionId !== disponibilidad.staffMedico.centroAtencionId;
        }

        if (disponibilidad.staffMedico.especialidad) {
          especialidadNombreDisp = disponibilidad.staffMedico.especialidad.nombre || 'Sin especialidad';

          // Verificar si es la misma especialidad que estamos editando
          if (this.especialidadId && disponibilidad.staffMedico.especialidad.id === this.especialidadId) {
            esMismaEspecialidad = true;
          } else if (this.staffMedico.especialidad && disponibilidad.staffMedico.especialidad.id === this.staffMedico.especialidad.id) {
            esMismaEspecialidad = true;
          }
        }
      } else if (disponibilidad.staffMedicoId) {
        // Si no tenemos el objeto staffMedico completo, usar el mapa de info
        const info = this.staffMedicoInfoMap.get(disponibilidad.staffMedicoId);
        if (info) {
          centroNombre = info.centroNombre;
          especialidadNombreDisp = info.especialidadNombre;
        }

        // Determinar si es otro centro basado en el staffMedicoId
        // Si el staffMedicoId es diferente, podría ser otra especialidad en el mismo centro u otro centro
        if (disponibilidad.staffMedicoId !== this.staffMedico.id) {
          // Para determinar si es otro centro, necesitamos comparar los centros
          const staffInfo = this.todosLosStaffMedico.find(s => s.id === disponibilidad.staffMedicoId);
          if (staffInfo && staffInfo.centroAtencionId && this.staffMedico?.centroAtencionId) {
            esOtroCentro = staffInfo.centroAtencionId !== this.staffMedico.centroAtencionId;
          }
        }
      }

      // Verificar si esta es la disponibilidad que se está editando
      const esDisponibilidadActual = this.modoEdicion && this.disponibilidadExistente &&
                                     disponibilidad.id === this.disponibilidadExistente.id;

      // Revisar todos los horarios de esta disponibilidad
      disponibilidad.horarios.forEach((horario: any) => {
        if (horario.dia === dia) {
          const esMismoCentroOtraEspecialidad = !esOtroCentro && !esMismaEspecialidad && !esDisponibilidadActual;

          horariosOcupados.push({
            horaInicio: horario.horaInicio,
            horaFin: horario.horaFin,
            especialidad: especialidadNombreDisp,
            centro: centroNombre,
            esOtroCentro: esOtroCentro,
            esMismoCentroOtraEspecialidad: esMismoCentroOtraEspecialidad,
            esDisponibilidadActual: esDisponibilidadActual
          });
        }
      });
    });

    // Ordenar por hora de inicio
    return horariosOcupados.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  /**
   * Verifica si hay horarios ocupados para un día específico
   */
  tieneHorariosOcupados(dia: string): boolean {
    return this.getHorariosOcupadosPorDia(dia).length > 0;
  }

  /**
   * Calcula y almacena los horarios ocupados por día para mostrar en el calendario
   */
  private horariosOcupadosPorDia: { [dia: string]: Array<{horaInicio: string, horaFin: string, especialidad?: string}> } = {};

  private calcularHorariosOcupadosPorDia(): void {
    const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

    dias.forEach(dia => {
      this.horariosOcupadosPorDia[dia] = this.getHorariosOcupadosPorDia(dia);
    });
  }

  /**
   * Construye un mapa de información de StaffMedico usando los datos pasados del padre
   */
  private construirMapaStaffMedico(): void {
    console.log('Construyendo mapa de staffMedico. Datos recibidos:', this.todosLosStaffMedico);

    this.todosLosStaffMedico.forEach(staff => {
      if (staff.id) {
        const centroNombre = staff.centro?.nombre || staff.centroAtencion?.nombre || `Centro #${staff.centroAtencionId || 'desconocido'}`;
        const especialidadNombre = staff.especialidad?.nombre || 'Sin especialidad';

        this.staffMedicoInfoMap.set(staff.id, {
          centroNombre: centroNombre,
          especialidadNombre: especialidadNombre
        });

        console.log(`Mapeando staffMedico ${staff.id}: ${centroNombre} - ${especialidadNombre}`);
      }
    });
  }

  addHorario(): void {
    this.disponibilidad.horarios.push({ 
      dia: '', 
      horaInicio: '', 
      horaFin: '' 
    });
  }

  removeHorario(index: number): void {
    if (this.disponibilidad.horarios.length > 1) {
      this.disponibilidad.horarios.splice(index, 1);
    }
  }

  getDiaNombre(dia: string): string {
    const nombres: { [key: string]: string } = {
      'LUNES': 'Lunes',
      'MARTES': 'Martes',
      'MIERCOLES': 'Miércoles',
      'JUEVES': 'Jueves',
      'VIERNES': 'Viernes',
      'SABADO': 'Sábado',
      'DOMINGO': 'Domingo'
    };
    return nombres[dia] || dia;
  }

  formatearHora(hora: string): string {
    if (!hora) return '';
    // Si la hora viene con segundos (HH:MM:SS), quitar los segundos
    return hora.substring(0, 5);
  }

  puedeGuardar(): boolean {
    return this.disponibilidad.horarios.length > 0 && 
           this.disponibilidad.horarios.every(h => 
             h.dia && h.horaInicio && h.horaFin && h.horaInicio < h.horaFin
           );
  }

  private validarHorarios(): string | null {
    // Validar que no haya horarios vacíos
    for (let horario of this.disponibilidad.horarios) {
      if (!horario.dia || !horario.horaInicio || !horario.horaFin) {
        return 'Todos los horarios deben tener día, hora de inicio y hora de fin.';
      }

      if (horario.horaInicio >= horario.horaFin) {
        return 'La hora de inicio debe ser menor a la hora de fin.';
      }
    }

    // Validar que no haya superposición de horarios en el mismo día (dentro de la configuración actual)
    const errorSuperposicionInterna = this.validarSuperposicionesInternas();
    if (errorSuperposicionInterna) {
      return errorSuperposicionInterna;
    }

    // Validar conflictos con horarios existentes en otros centros (validación inter-centro)
    const conflictosInterCentro = this.validarConflictosInterCentro();
    if (conflictosInterCentro.length > 0) {
      // Mostrar los conflictos al usuario y permitir continuar con confirmación
      return null; // Retornar null para que continúe al método guardarDisponibilidad donde se muestra la confirmación
    }

    return null;
  }

  /**
   * Valida que no haya superposiciones dentro de los horarios que se están configurando
   */
  private validarSuperposicionesInternas(): string | null {
    const horariosPorDia = new Map<string, Array<{horaInicio: string, horaFin: string}>>();

    // Agrupar horarios por día
    for (let horario of this.disponibilidad.horarios) {
      if (!horariosPorDia.has(horario.dia)) {
        horariosPorDia.set(horario.dia, []);
      }
      horariosPorDia.get(horario.dia)!.push({
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin
      });
    }

    // Validar superposición en cada día
    for (let [dia, horarios] of horariosPorDia) {
      // Ordenar horarios por hora de inicio
      horarios.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

      // Verificar superposición entre horarios consecutivos
      for (let i = 0; i < horarios.length - 1; i++) {
        const horarioActual = horarios[i];
        const siguienteHorario = horarios[i + 1];

        if (horarioActual.horaFin > siguienteHorario.horaInicio) {
          return `En ${this.getDiaNombre(dia)}, el horario ${horarioActual.horaInicio}-${horarioActual.horaFin} se superpone con ${siguienteHorario.horaInicio}-${siguienteHorario.horaFin}. Los horarios no pueden superponerse.`;
        }
      }
    }

    return null;
  }

  /**
   * Valida conflictos con horarios existentes en TODOS los centros (validación inter-centro)
   * Retorna un array de mensajes de conflicto
   */
  private validarConflictosInterCentro(): string[] {
    const conflictos: string[] = [];

    // Si no hay disponibilidades cargadas, no podemos validar
    if (!this.todasLasDisponibilidadesMedico || this.todasLasDisponibilidadesMedico.length === 0) {
      return [];
    }

    // Revisar cada horario nuevo contra todas las disponibilidades existentes
    this.disponibilidad.horarios.forEach(nuevoHorario => {

      // Recorrer todas las disponibilidades del médico
      this.todasLasDisponibilidadesMedico.forEach(disponibilidad => {

        // En modo edición, excluir la disponibilidad que estamos editando
        if (this.modoEdicion && this.disponibilidadExistente &&
            disponibilidad.id === this.disponibilidadExistente.id) {
          return;
        }

        // Revisar todos los horarios de esta disponibilidad
        disponibilidad.horarios.forEach((horarioExistente: any) => {
          if (horarioExistente.dia === nuevoHorario.dia) {
            // Verificar si hay solapamiento de horarios
            if (this.horariosSeSolapan(nuevoHorario, horarioExistente)) {

              // Determinar si el conflicto es en el mismo centro o en otro centro
              const esMismoCentro = disponibilidad.staffMedicoId === this.staffMedico.id;

              if (esMismoCentro) {
                // Conflicto en el mismo centro (con otra especialidad)
                const especialidadNombre = this.especialidadNombre || 'la especialidad actual';
                conflictos.push(
                  `${nuevoHorario.dia}: ${nuevoHorario.horaInicio}-${nuevoHorario.horaFin} se superpone con horario existente en ${especialidadNombre} (${horarioExistente.horaInicio}-${horarioExistente.horaFin})`
                );
              } else {
                // CONFLICTO INTERCENTROS - Más crítico
                // Obtener información del centro desde staffMedicoId
                const centroNombre = 'otro centro de atención';
                conflictos.push(
                  `⚠️ CONFLICTO INTER-CENTRO - ${nuevoHorario.dia}: ${nuevoHorario.horaInicio}-${nuevoHorario.horaFin} se superpone con horario en "${centroNombre}" (${horarioExistente.horaInicio}-${horarioExistente.horaFin}). Un médico no puede atender en múltiples centros al mismo tiempo.`
                );
              }
            }
          }
        });
      });
    });

    return conflictos;
  }

  /**
   * Método auxiliar para verificar si dos horarios se solapan
   */
  private horariosSeSolapan(
    horario1: { horaInicio: string, horaFin: string },
    horario2: { horaInicio: string, horaFin: string }
  ): boolean {
    const inicio1 = this.convertirHoraAMinutos(horario1.horaInicio);
    const fin1 = this.convertirHoraAMinutos(horario1.horaFin);
    const inicio2 = this.convertirHoraAMinutos(horario2.horaInicio);
    const fin2 = this.convertirHoraAMinutos(horario2.horaFin);

    // Los horarios se solapan si uno empieza antes de que termine el otro
    return (inicio1 < fin2) && (inicio2 < fin1);
  }

  /**
   * Convertir hora en formato HH:MM a minutos desde medianoche
   */
  private convertirHoraAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  guardarDisponibilidad(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    // Validaciones básicas
    const errorValidacion = this.validarHorarios();
    if (errorValidacion) {
      this.mensajeError = errorValidacion;
      return;
    }

    // Validar conflictos inter-centro y mostrar advertencia si existen
    const conflictosInterCentro = this.validarConflictosInterCentro();
    if (conflictosInterCentro.length > 0) {
      const tieneConflictosIntercentros = conflictosInterCentro.some(c => c.includes('⚠️ CONFLICTO INTER-CENTRO'));

      if (tieneConflictosIntercentros) {
        // Conflictos inter-centro son MUY críticos - el médico no puede estar en dos lugares a la vez
        const mensaje = '🚨 CONFLICTOS CRÍTICOS DETECTADOS 🚨\n\n' +
                       'Un médico no puede atender en múltiples centros al mismo tiempo:\n\n' +
                       conflictosInterCentro.join('\n\n') +
                       '\n\n⚠️ ADVERTENCIA: Estos conflictos pueden causar problemas serios en la programación de turnos.\n\n' +
                       '¿Está SEGURO que desea continuar?';

        if (!confirm(mensaje)) {
          return;
        }
      } else {
        // Conflictos menores (dentro del mismo centro)
        const mensaje = 'Se encontraron conflictos de horarios:\n\n' +
                       conflictosInterCentro.join('\n\n') +
                       '\n\n¿Desea continuar de todas formas?';

        if (!confirm(mensaje)) {
          return;
        }
      }
    }

    this.guardando = true;

    // Asignar el ID del staff médico
    this.disponibilidad.staffMedicoId = this.staffMedico.id!;
    
    // Asignar el ID de especialidad si se proporcionó
    if (this.especialidadId) {
      this.disponibilidad.especialidadId = this.especialidadId;
    }

    // Ordenar los horarios por el orden de los días de la semana
    const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
    this.disponibilidad.horarios.sort((a, b) => diasOrden.indexOf(a.dia) - diasOrden.indexOf(b.dia));

    // Determinar si crear o actualizar
    const operacion = this.modoEdicion 
      ? this.disponibilidadService.update(this.disponibilidad.id!, this.disponibilidad)
      : this.disponibilidadService.create(this.disponibilidad);

    const mensajeExito = this.modoEdicion 
      ? 'Disponibilidad actualizada exitosamente'
      : 'Disponibilidad creada exitosamente';

    operacion.subscribe({
      next: (response) => {
        this.guardando = false;
        this.mensajeExito = mensajeExito;
        
        // Cerrar modal después de un breve delay
        setTimeout(() => {
          this.activeModal.close(response.data);
        }, 1000);
      },
      error: (error) => {
        this.guardando = false;
        console.error(`Error al ${this.modoEdicion ? 'actualizar' : 'crear'} la disponibilidad:`, error);
        this.mensajeError = error?.error?.message || `Error al ${this.modoEdicion ? 'actualizar' : 'crear'} la disponibilidad. Intente nuevamente.`;
      }
    });
  }
}
