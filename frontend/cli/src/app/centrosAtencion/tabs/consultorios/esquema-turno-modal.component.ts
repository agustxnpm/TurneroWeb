import { Component, OnInit, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { EsquemaTurno } from '../../../esquemaTurno/esquemaTurno';
import { EsquemaTurnoService } from '../../../esquemaTurno/esquemaTurno.service';
import { Consultorio } from '../../../consultorios/consultorio';
import { StaffMedico } from '../../../staffMedicos/staffMedico';
import { DisponibilidadMedico } from '../../../disponibilidadMedicos/disponibilidadMedico';
import { DisponibilidadMedicoService } from '../../../disponibilidadMedicos/disponibilidadMedico.service';

@Component({
  selector: 'app-esquema-turno-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './esquema-turno-modal.component.css',
  templateUrl: './esquema-turno-modal.component.html',
})
export class EsquemaTurnoModalComponent implements OnInit, AfterViewInit {
  @Input() consultorio!: Consultorio;
  @Input() centroId!: number;
  @Input() staffMedicos: StaffMedico[] = [];
  @Input() esquemaEditar?: EsquemaTurno;
  
  esquema: EsquemaTurno = {
    id: 0,
    consultorioId: 0,
    disponibilidadMedicoId: 0,
    staffMedicoId: 0,
    centroId: 0,
    horarios: [],
    intervalo: 30
  };

  disponibilidadesDisponibles: DisponibilidadMedico[] = [];
  disponibilidadSeleccionada: DisponibilidadMedico | null = null;
  consultorioHorarios: any[] = [];
  horariosDisponibles: any[] = [];
  esquemasExistentes: EsquemaTurno[] = [];
  esquemasEnConsultorioActual: EsquemaTurno[] = [];
  esquemasEnOtrosConsultorios: EsquemaTurno[] = [];
  
  // Propiedades para manejar rangos personalizables
  horariosPersonalizados: { [key: string]: { horaInicio: string; horaFin: string; } } = {};
  // Mapa para rastrear qué horarios originales están seleccionados (key = día-horaInicio-horaFin del horario ORIGINAL)
  horariosSeleccionadosMap: Map<string, { dia: string; horaInicio: string; horaFin: string }> = new Map();
  errorValidacion = '';

  mensajeError = '';
  mensajeExito = '';
  guardando = false;

  constructor(
    public activeModal: NgbActiveModal,
    private esquemaTurnoService: EsquemaTurnoService,
    private disponibilidadMedicoService: DisponibilidadMedicoService
  ) {}

  ngOnInit() {
    console.log('🔄 ngOnInit - Iniciando modal esquema');
    console.log('📋 Datos recibidos:', {
      consultorio: this.consultorio,
      centroId: this.centroId,
      staffMedicos: this.staffMedicos?.length || 0,
      esquemaEditar: this.esquemaEditar
    });

    if (this.consultorio) {
      this.esquema.consultorioId = this.consultorio.id;
      console.log('✅ Consultorio configurado:', this.consultorio);
      console.log('🏥 Centro ID:', this.centroId);
      console.log('👥 Staff médicos recibidos:', this.staffMedicos?.length || 0);
    } else {
      console.error('❌ No se recibió consultorio en el modal');
    }

    // Asignar el centroId al esquema para evitar error en backend
    if (this.centroId) {
      this.esquema.centroId = this.centroId;
      console.log('🏥 CentroId asignado al esquema:', this.esquema.centroId);
    }

    // Si estamos editando, cargar los datos del esquema
    if (this.esquemaEditar) {
      console.log('✏️ Modo edición activado - cargando datos del esquema:', this.esquemaEditar);
      this.esquema = { ...this.esquemaEditar };
      this.esquema.disponibilidadMedicoId = this.esquemaEditar.disponibilidadMedicoId || 0;
      this.esquema.intervalo = this.esquemaEditar.intervalo || 30;
    }
  }

  ngAfterViewInit() {
    // Cargar datos después de que la vista se inicialice
    setTimeout(() => {
      this.cargarDatos();
    }, 100);
  }

  private cargarDatos() {
    console.log('🔄 Cargando datos del modal...');
    console.log('📊 Estado actual:', {
      centroId: this.centroId,
      consultorio: this.consultorio?.id,
      staffMedicos: this.staffMedicos?.length || 0
    });
    
    this.cargarDisponibilidades();
    this.cargarHorariosConsultorio();
    this.cargarEsquemasExistentes();
  }

  private cargarDisponibilidades() {
    console.log('🏥 Cargando disponibilidades para centro:', this.centroId);
    
    if (!this.centroId) {
      console.error('❌ No se proporcionó centroId - no se pueden cargar disponibilidades');
      this.mensajeError = 'Error: No se pudo identificar el centro de atención';
      return;
    }
    
    if (!this.staffMedicos || this.staffMedicos.length === 0) {
      console.error('❌ No se proporcionaron staffMedicos - no se pueden filtrar disponibilidades');
      this.mensajeError = 'Error: No se encontró personal médico para este centro';
      return;
    }
    
    this.disponibilidadMedicoService.all().subscribe({
      next: (response: any) => {
        console.log('📥 Disponibilidades recibidas del servidor:', response);
        
        if (response && response.data) {
          console.log('📋 Total disponibilidades recibidas:', response.data.length);
          console.log('👥 Staff médicos disponibles en el centro:', this.staffMedicos.map(s => ({id: s.id, medico: s.medico?.nombre + ' ' + s.medico?.apellido})));
          
          // Crear un mapa de staffMedicoId -> staffMedico para búsqueda rápida
          const staffMedicoMap = new Map();
          this.staffMedicos.forEach(staff => {
            staffMedicoMap.set(staff.id, staff);
          });
          
          // Filtrar y enriquecer disponibilidades
          this.disponibilidadesDisponibles = response.data
            .filter((disp: DisponibilidadMedico) => {
              const staffMedico = staffMedicoMap.get(disp.staffMedicoId);
              const perteneceCentro = staffMedico !== undefined;
              
              console.log(`🔍 Disponibilidad ${disp.id}:`, {
                staffMedicoId: disp.staffMedicoId,
                staffEncontrado: !!staffMedico,
                medicoNombre: staffMedico?.medico?.nombre + ' ' + staffMedico?.medico?.apellido,
                pertenece: perteneceCentro
              });
              
              return perteneceCentro;
            })
            .map((disp: DisponibilidadMedico) => {
              // Enriquecer la disponibilidad con el objeto staffMedico completo
              const staffMedico = staffMedicoMap.get(disp.staffMedicoId);
              return {
                ...disp,
                staffMedico: staffMedico
              };
            });
          
          console.log('✅ Disponibilidades filtradas para este centro:', this.disponibilidadesDisponibles.length);
          console.log('📋 Disponibilidades disponibles:', this.disponibilidadesDisponibles);

          // Si estamos editando, pre-seleccionar la disponibilidad
          if (this.esquemaEditar && this.esquema.disponibilidadMedicoId) {
            console.log('✏️ Modo edición - buscando disponibilidad con ID:', this.esquema.disponibilidadMedicoId);
            const disponibilidadEditada = this.disponibilidadesDisponibles.find(
              d => d.id === this.esquema.disponibilidadMedicoId
            );

            if (disponibilidadEditada) {
              console.log('✅ Disponibilidad encontrada, cargando horarios...');
              this.onDisponibilidadChange();
            } else {
              console.warn('⚠️ No se encontró la disponibilidad con ID:', this.esquema.disponibilidadMedicoId);
            }
          }
        } else {
          console.warn('⚠️ Respuesta sin datos válidos');
          this.disponibilidadesDisponibles = [];
        }
      },
      error: (error: any) => {
        console.error('❌ Error al cargar disponibilidades:', error);
        this.mensajeError = 'Error al cargar las disponibilidades médicas';
      }
    });
  }

  private cargarHorariosConsultorio() {
    // Simular horarios del consultorio
    this.consultorioHorarios = [
      { diaSemana: 'Lunes', horaInicio: '08:00', horaFin: '19:00', activo: true },
      { diaSemana: 'Martes', horaInicio: '08:00', horaFin: '19:00', activo: true },
      { diaSemana: 'Miércoles', horaInicio: '08:00', horaFin: '19:00', activo: true },
      { diaSemana: 'Jueves', horaInicio: '08:00', horaFin: '19:00', activo: true },
      { diaSemana: 'Viernes', horaInicio: '08:00', horaFin: '19:00', activo: true },
      { diaSemana: 'Sábado', horaInicio: '08:00', horaFin: '19:00', activo: true },
      { diaSemana: 'Domingo', horaInicio: '08:00', horaFin: '19:00', activo: true }
    ];
  }

  private cargarEsquemasExistentes() {
    if (this.centroId) {
      // CORRECCIÓN: Cargar TODOS los esquemas del centro (no solo del consultorio)
      // para validar conflictos en otros consultorios del mismo centro
      this.esquemaTurnoService.getByCentroAtencion(this.centroId).subscribe({
        next: (response) => {
          this.esquemasExistentes = response.data || [];

          // IMPORTANTE: Excluir el esquema que estamos editando de los esquemas ocupados
          if (this.esquemaEditar && this.esquemaEditar.id) {
            console.log('✏️ Excluyendo esquema en edición (ID:', this.esquemaEditar.id, ') de esquemas ocupados');
            this.esquemasExistentes = this.esquemasExistentes.filter(
              esq => esq.id !== this.esquemaEditar!.id
            );
          }

          // Separar esquemas por consultorio para mostrar información más clara
          this.esquemasEnConsultorioActual = this.esquemasExistentes.filter(
            esq => esq.consultorioId === this.consultorio?.id
          );

          this.esquemasEnOtrosConsultorios = this.esquemasExistentes.filter(
            esq => esq.consultorioId !== this.consultorio?.id && esq.consultorioId !== null
          );

          console.log('📋 Esquemas existentes en el centro:', this.esquemasExistentes.length);
          console.log('🏥 Esquemas en consultorio actual:', this.esquemasEnConsultorioActual.length);
          console.log('🏢 Esquemas en otros consultorios:', this.esquemasEnOtrosConsultorios.length);
          console.log('🔍 Esquemas por consultorio:', this.esquemasExistentes.reduce((acc, esq) => {
            const consultorio = esq.consultorio?.nombre || 'Sin asignar';
            acc[consultorio] = (acc[consultorio] || 0) + 1;
            return acc;
          }, {} as any));
        },
        error: (error) => {
          console.error('Error al cargar esquemas existentes:', error);
        }
      });
    }
  }

  onDisponibilidadChange() {
    const disponibilidadId = this.esquema.disponibilidadMedicoId;
    console.log('Disponibilidad seleccionada ID:', disponibilidadId);

    if (disponibilidadId) {
      this.disponibilidadSeleccionada = this.disponibilidadesDisponibles.find(d => d.id === Number(disponibilidadId)) || null;
      console.log('Disponibilidad seleccionada:', this.disponibilidadSeleccionada);

      if (this.disponibilidadSeleccionada) {
        this.esquema.staffMedicoId = this.disponibilidadSeleccionada.staffMedicoId;
        this.calcularHorariosDisponibles();

        // Si estamos editando, pre-seleccionar los horarios del esquema
        if (this.esquemaEditar && this.esquemaEditar.horarios && this.esquemaEditar.horarios.length > 0) {
          console.log('✏️ Modo edición - pre-seleccionando horarios:', this.esquemaEditar.horarios);
          setTimeout(() => {
            this.cargarHorariosEditados();
          }, 100);
        }
      }
    } else {
      this.disponibilidadSeleccionada = null;
      this.horariosDisponibles = [];
    }
  }

  private cargarHorariosEditados(): void {
    if (!this.esquemaEditar || !this.esquemaEditar.horarios) return;

    // Limpiar selecciones previas
    this.horariosSeleccionadosMap.clear();

    // Para cada horario del esquema editado, encontrar el horario disponible correspondiente
    for (const horarioEditado of this.esquemaEditar.horarios) {
      // Buscar en horariosDisponibles el horario que coincida con este día
      const horarioDisponible = this.horariosDisponibles.find(hd =>
        this.normalizarDia(hd.dia) === this.normalizarDia(horarioEditado.dia)
      );

      if (horarioDisponible) {
        const key = this.getHorarioKey(horarioDisponible);

        // Guardar la personalización del horario editado
        this.horariosPersonalizados[key] = {
          horaInicio: horarioEditado.horaInicio,
          horaFin: horarioEditado.horaFin
        };

        // Agregar al mapa de seleccionados
        this.horariosSeleccionadosMap.set(key, {
          dia: horarioEditado.dia,
          horaInicio: horarioEditado.horaInicio,
          horaFin: horarioEditado.horaFin
        });

        console.log('✅ Horario pre-seleccionado:', horarioEditado);
      } else {
        console.warn('⚠️ No se encontró horario disponible para:', horarioEditado);
      }
    }

    // Sincronizar con esquema.horarios
    this.sincronizarEsquemaHorarios();
    console.log('✅ Horarios editados cargados:', this.esquema.horarios);
  }

  private calcularHorariosDisponibles() {
    if (!this.disponibilidadSeleccionada) {
      this.horariosDisponibles = [];
      return;
    }

    console.log('🔍 === CALCULANDO HORARIOS DISPONIBLES ===');
    console.log('📅 Disponibilidad médica:', this.disponibilidadSeleccionada.horarios);
    console.log('🏥 Horarios consultorio:', this.consultorioHorarios);

    // Intersección: horarios del médico que coinciden con horarios del consultorio
    const horariosInterseccion: any[] = [];
    
    for (const horarioMedico of this.disponibilidadSeleccionada.horarios) {
      console.log(`\n🔍 Procesando día: ${horarioMedico.dia}`);
      console.log(`👨‍⚕️ Horario médico: ${horarioMedico.horaInicio} - ${horarioMedico.horaFin}`);
      
      // CORRECCIÓN: Normalizar comparación de días (ignorar case y tildes)
      const horarioConsultorio = this.consultorioHorarios.find(hc =>
        this.normalizarDia(hc.diaSemana) === this.normalizarDia(horarioMedico.dia) && hc.activo
      );
      
      console.log(`🏥 Horario consultorio encontrado:`, horarioConsultorio);
      
      if (horarioConsultorio) {
        // Calcular intersección de horarios
        const inicioMedico = this.timeToMinutes(horarioMedico.horaInicio);
        const finMedico = this.timeToMinutes(horarioMedico.horaFin);
        const inicioConsultorio = this.timeToMinutes(horarioConsultorio.horaInicio);
        const finConsultorio = this.timeToMinutes(horarioConsultorio.horaFin);
        
        console.log(`🔢 Conversión a minutos:`);
        console.log(`   Médico: ${inicioMedico} - ${finMedico}`);
        console.log(`   Consultorio: ${inicioConsultorio} - ${finConsultorio}`);
        
        const inicioInterseccion = Math.max(inicioMedico, inicioConsultorio);
        const finInterseccion = Math.min(finMedico, finConsultorio);
        
        console.log(`⚡ Intersección: ${inicioInterseccion} - ${finInterseccion}`);
        
        if (inicioInterseccion < finInterseccion) {
          const horarioInterseccionado = {
            dia: horarioMedico.dia,
            horaInicio: this.minutesToTime(inicioInterseccion),
            horaFin: this.minutesToTime(finInterseccion)
          };
          horariosInterseccion.push(horarioInterseccionado);
          console.log(`✅ Horario agregado:`, horarioInterseccionado);
        } else {
          console.log(`❌ No hay intersección válida`);
        }
      } else {
        console.log(`❌ No se encontró horario de consultorio para el día ${horarioMedico.dia}`);
        console.log(`🔍 Días disponibles en consultorio:`, this.consultorioHorarios.map(h => h.diaSemana));
      }
    }

    console.log(`\n📋 Total horarios con intersección: ${horariosInterseccion.length}`);

    // NUEVA LÓGICA: En lugar de filtrar completamente, dividir horarios en segmentos disponibles
    this.horariosDisponibles = [];
    for (const horario of horariosInterseccion) {
      const segmentosLibres = this.calcularSegmentosLibres(horario);
      this.horariosDisponibles.push(...segmentosLibres);
    }

    console.log(`\n🎯 RESULTADO FINAL: ${this.horariosDisponibles.length} horarios disponibles:`, this.horariosDisponibles);
    console.log('🔍 === FIN CÁLCULO ===\n');
  }

  /**
   * Nuevo método que divide un horario en segmentos libres,
   * excluyendo las partes ocupadas por esquemas existentes.
   *
   * IMPORTANTE: Bloqueamos horarios del MISMO MÉDICO en TODOS los consultorios del centro,
   * ya que un médico no puede estar en dos lugares al mismo tiempo.
   * También bloqueamos horarios de otros médicos en el MISMO CONSULTORIO.
   */
  private calcularSegmentosLibres(horario: any): any[] {
    const segmentosLibres: any[] = [];
    const inicioTotal = this.timeToMinutes(horario.horaInicio);
    const finTotal = this.timeToMinutes(horario.horaFin);

    // Recolectar horarios ocupados:
    // 1. Todos los esquemas del MISMO CONSULTORIO (cualquier médico)
    // 2. Todos los esquemas del MISMO MÉDICO (en cualquier consultorio del centro)
    const staffMedicoIdSeleccionado = this.disponibilidadSeleccionada?.staffMedicoId;

    const horariosOcupados = this.esquemasExistentes
      .filter(esquema => {
        // Incluir si es del mismo consultorio O del mismo médico
        return esquema.consultorioId === this.consultorio?.id ||
               esquema.staffMedicoId === staffMedicoIdSeleccionado;
      })
      .flatMap(esquema => esquema.horarios)
      .filter(h => this.normalizarDia(h.dia) === this.normalizarDia(horario.dia))
      .map(h => ({
        inicio: this.timeToMinutes(h.horaInicio),
        fin: this.timeToMinutes(h.horaFin)
      }))
      .sort((a, b) => a.inicio - b.inicio);

    console.log(`🔍 Calculando segmentos libres para ${horario.dia} ${horario.horaInicio}-${horario.horaFin}`);
    console.log(`📅 Horarios ocupados (mismo consultorio + mismo médico):`, horariosOcupados.map(h => `${this.minutesToTime(h.inicio)}-${this.minutesToTime(h.fin)}`));

    if (horariosOcupados.length === 0) {
      // No hay ocupación, todo el horario está libre
      segmentosLibres.push(horario);
      console.log(`✅ Todo libre: ${horario.horaInicio}-${horario.horaFin}`);
      return segmentosLibres;
    }

    let puntoActual = inicioTotal;

    for (const ocupado of horariosOcupados) {
      // Si hay espacio libre antes de este horario ocupado
      if (puntoActual < ocupado.inicio) {
        const segmentoLibre = {
          dia: horario.dia,
          horaInicio: this.minutesToTime(puntoActual),
          horaFin: this.minutesToTime(Math.min(ocupado.inicio, finTotal))
        };
        segmentosLibres.push(segmentoLibre);
        console.log(`✅ Segmento libre: ${segmentoLibre.horaInicio}-${segmentoLibre.horaFin}`);
      }

      // Mover el punto actual al final de este horario ocupado
      puntoActual = Math.max(puntoActual, ocupado.fin);

      // Si ya cubrimos todo el horario, salir
      if (puntoActual >= finTotal) {
        break;
      }
    }

    // Si queda tiempo libre después del último horario ocupado
    if (puntoActual < finTotal) {
      const segmentoLibre = {
        dia: horario.dia,
        horaInicio: this.minutesToTime(puntoActual),
        horaFin: this.minutesToTime(finTotal)
      };
      segmentosLibres.push(segmentoLibre);
      console.log(`✅ Segmento libre final: ${segmentoLibre.horaInicio}-${segmentoLibre.horaFin}`);
    }

    console.log(`� Total segmentos libres para ${horario.dia}: ${segmentosLibres.length}`);
    return segmentosLibres;
  }


  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private normalizarDia(dia: string): string {
    return dia
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Elimina tildes y diacríticos
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
    return nombres[this.normalizarDia(dia)] || dia;
  }

  formatearHorarios(horarios: { dia: string; horaInicio: string; horaFin: string }[]): string {
    return horarios.map(h => this.getDiaNombre(h.dia) + ' ' + h.horaInicio + '-' + h.horaFin).join(', ');
  }

  // Métodos para el manejo de selección de horarios
  isHorarioSeleccionado(horario: any): boolean {
    const key = this.getHorarioKey(horario);
    return this.horariosSeleccionadosMap.has(key);
  }

  toggleHorarioSeleccionado(horario: any, event: any) {
    if (event) {
      event.preventDefault();
    }

    const key = this.getHorarioKey(horario);

    if (this.isHorarioSeleccionado(horario)) {
      // Quitar el horario del mapa
      this.horariosSeleccionadosMap.delete(key);
    } else {
      // Agregar el horario al mapa (usar personalizado si existe, sino el original)
      const horarioAgregar = this.horariosPersonalizados[key] || {
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin
      };

      this.horariosSeleccionadosMap.set(key, {
        dia: horario.dia,
        horaInicio: horarioAgregar.horaInicio,
        horaFin: horarioAgregar.horaFin
      });
    }

    // Sincronizar esquema.horarios con el mapa
    this.sincronizarEsquemaHorarios();
  }

  seleccionarTodos() {
    for (const horario of this.horariosDisponibles) {
      // No seleccionar si ya está seleccionado o si tiene conflicto con el mismo médico
      const conflicto = this.getConflictoEnOtrosConsultorios(horario);
      if (!this.isHorarioSeleccionado(horario) && !conflicto.esElMismoMedico) {
        const key = this.getHorarioKey(horario);
        const horarioAgregar = this.horariosPersonalizados[key] || {
          horaInicio: horario.horaInicio,
          horaFin: horario.horaFin
        };

        this.horariosSeleccionadosMap.set(key, {
          dia: horario.dia,
          horaInicio: horarioAgregar.horaInicio,
          horaFin: horarioAgregar.horaFin
        });
      }
    }
    this.sincronizarEsquemaHorarios();
  }

  limpiarTodos() {
    this.horariosSeleccionadosMap.clear();
    this.sincronizarEsquemaHorarios();
  }

  // Sincroniza esquema.horarios con el mapa de horarios seleccionados
  private sincronizarEsquemaHorarios(): void {
    this.esquema.horarios = Array.from(this.horariosSeleccionadosMap.values());
  }

  todosSeleccionados(): boolean {
    return this.horariosDisponibles.length > 0 && 
           this.horariosDisponibles.every(horario => this.isHorarioSeleccionado(horario));
  }

  ningunoSeleccionado(): boolean {
    return this.esquema.horarios.length === 0;
  }

  algunosSeleccionados(): boolean {
    return this.esquema.horarios.length > 0 && !this.todosSeleccionados();
  }

  toggleTodosSeleccionados() {
    if (this.todosSeleccionados()) {
      this.limpiarTodos();
    } else {
      this.seleccionarTodos();
    }
  }

  calcularDuracion(horaInicio: string, horaFin: string): string {
    const inicio = this.timeToMinutes(horaInicio);
    const fin = this.timeToMinutes(horaFin);
    const duracion = fin - inicio;
    
    if (duracion >= 60) {
      const horas = Math.floor(duracion / 60);
      const minutos = duracion % 60;
      return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
    } else {
      return `${duracion}m`;
    }
  }

  calcularTiempoTotal(): number {
    return this.esquema.horarios.reduce((total, horario) => {
      const inicio = this.timeToMinutes(horario.horaInicio);
      const fin = this.timeToMinutes(horario.horaFin);
      return total + (fin - inicio);
    }, 0);
  }

  calcularTurnosEstimados(): number {
    const totalMinutos = this.calcularTiempoTotal();
    return Math.floor(totalMinutos / this.esquema.intervalo);
  }

  // Métodos para manejar horarios personalizables
  private getHorarioKey(horario: any): string {
    return `${horario.dia}-${horario.horaInicio}-${horario.horaFin}`;
  }

  getHorarioPersonalizado(horario: any, tipo: 'inicio' | 'fin'): string {
    const key = this.getHorarioKey(horario);
    if (this.horariosPersonalizados[key]) {
      return tipo === 'inicio' ? this.horariosPersonalizados[key].horaInicio : this.horariosPersonalizados[key].horaFin;
    }
    // Si no hay personalización, usar los valores originales
    return tipo === 'inicio' ? horario.horaInicio : horario.horaFin;
  }

  actualizarHorarioPersonalizado(horario: any, tipo: 'inicio' | 'fin', event: any): void {
    const key = this.getHorarioKey(horario);
    const nuevoValor = event.target.value;
    
    if (!this.horariosPersonalizados[key]) {
      this.horariosPersonalizados[key] = {
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin
      };
    }
    
    // Actualizar el valor correspondiente sin validaciones restrictivas
    if (tipo === 'inicio') {
      this.horariosPersonalizados[key].horaInicio = nuevoValor;
      
      // Solo asegurar que la hora de inicio no sea mayor o igual que la de fin
      if (this.timeToMinutes(nuevoValor) >= this.timeToMinutes(this.horariosPersonalizados[key].horaFin)) {
        // Ajustar la hora de fin para que sea al menos 30 minutos después
        const nuevaHoraFin = this.addMinutes(nuevoValor, 30);
        this.horariosPersonalizados[key].horaFin = nuevaHoraFin;
      }
    } else {
      this.horariosPersonalizados[key].horaFin = nuevoValor;
      
      // Solo asegurar que la hora de fin no sea menor o igual que la de inicio
      if (this.timeToMinutes(nuevoValor) <= this.timeToMinutes(this.horariosPersonalizados[key].horaInicio)) {
        // Ajustar la hora de inicio para que sea al menos 30 minutos antes
        const nuevaHoraInicio = this.subtractMinutes(nuevoValor, 30);
        this.horariosPersonalizados[key].horaInicio = nuevaHoraInicio;
      }
    }
    
    // Limpiar mensaje de error anterior
    this.limpiarErrorValidacion();
    
    // Actualizar el horario en el esquema si está seleccionado
    this.actualizarEsquemaConHorarioPersonalizado(horario);
  }

  private actualizarEsquemaConHorarioPersonalizado(horarioOriginal: any): void {
    const key = this.getHorarioKey(horarioOriginal);

    if (this.isHorarioSeleccionado(horarioOriginal)) {
      // Actualizar el horario en el mapa con los valores personalizados
      if (this.horariosPersonalizados[key]) {
        this.horariosSeleccionadosMap.set(key, {
          dia: horarioOriginal.dia,
          horaInicio: this.horariosPersonalizados[key].horaInicio,
          horaFin: this.horariosPersonalizados[key].horaFin
        });

        // Sincronizar con esquema.horarios
        this.sincronizarEsquemaHorarios();
      }
    }
  }

  private addMinutes(time: string, minutes: number): string {
    const totalMinutes = this.timeToMinutes(time) + minutes;
    return this.minutesToTime(totalMinutes);
  }

  private subtractMinutes(time: string, minutes: number): string {
    const totalMinutes = this.timeToMinutes(time) - minutes;
    return this.minutesToTime(totalMinutes);
  }

  // Métodos para manejo de errores de validación
  private limpiarErrorValidacion(): void {
    this.errorValidacion = '';
  }

  // Métodos para obtener información de horarios ocupados en otros consultorios
  getHorariosOcupadosEnOtrosConsultorios(dia: string): Array<{
    horaInicio: string,
    horaFin: string,
    medico: string,
    consultorio: string,
    medicoId: number
  }> {
    const horariosOcupados: Array<{
      horaInicio: string,
      horaFin: string,
      medico: string,
      consultorio: string,
      medicoId: number
    }> = [];

    for (const esquema of this.esquemasEnOtrosConsultorios) {
      for (const horario of esquema.horarios) {
        if (this.normalizarDia(horario.dia) === this.normalizarDia(dia)) {
          horariosOcupados.push({
            horaInicio: horario.horaInicio,
            horaFin: horario.horaFin,
            medico: `${esquema.staffMedico?.medico?.nombre} ${esquema.staffMedico?.medico?.apellido}`,
            consultorio: esquema.consultorio?.nombre || 'Sin asignar',
            medicoId: esquema.staffMedicoId || 0
          });
        }
      }
    }

    return horariosOcupados.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  tieneHorariosOcupadosEnOtrosConsultorios(dia: string): boolean {
    return this.getHorariosOcupadosEnOtrosConsultorios(dia).length > 0;
  }

  /**
   * Verifica si un horario específico tiene conflicto con horarios ocupados en otros consultorios
   * Retorna información del conflicto si existe
   */
  getConflictoEnOtrosConsultorios(horario: any): {
    tieneConflicto: boolean,
    medico?: string,
    consultorio?: string,
    horarioConflictivo?: string,
    esElMismoMedico?: boolean
  } {
    const horariosOcupados = this.getHorariosOcupadosEnOtrosConsultorios(horario.dia);
    const inicioSeleccionado = this.timeToMinutes(horario.horaInicio);
    const finSeleccionado = this.timeToMinutes(horario.horaFin);

    for (const ocupado of horariosOcupados) {
      const inicioOcupado = this.timeToMinutes(ocupado.horaInicio);
      const finOcupado = this.timeToMinutes(ocupado.horaFin);

      // Verificar si hay solapamiento
      if (inicioSeleccionado < finOcupado && finSeleccionado > inicioOcupado) {
        return {
          tieneConflicto: true,
          medico: ocupado.medico,
          consultorio: ocupado.consultorio,
          horarioConflictivo: `${ocupado.horaInicio}-${ocupado.horaFin}`,
          esElMismoMedico: ocupado.medicoId === this.disponibilidadSeleccionada?.staffMedicoId
        };
      }
    }

    return { tieneConflicto: false };
  }

  // Métodos para verificar si los horarios están dentro del rango (sin bloquear)
  tieneHorariosInvalidos(): boolean {
    return this.esquema.horarios.some(horario => this.esHorarioInvalido(horario));
  }

  private esHorarioInvalido(horario: any): boolean {
    // Buscar el horario original disponible correspondiente
    // CORRECCIÓN: buscar por día Y rango de horas para manejar múltiples horarios del mismo día
    const minutosInicio = this.timeToMinutes(horario.horaInicio);
    const minutosFin = this.timeToMinutes(horario.horaFin);

    const horarioOriginal = this.horariosDisponibles.find(h =>
      this.normalizarDia(h.dia) === this.normalizarDia(horario.dia) &&
      this.timeToMinutes(h.horaInicio) <= minutosInicio &&
      this.timeToMinutes(h.horaFin) >= minutosFin
    );

    if (!horarioOriginal) return true;

    const minutosOriginalInicio = this.timeToMinutes(horarioOriginal.horaInicio);
    const minutosOriginalFin = this.timeToMinutes(horarioOriginal.horaFin);

    return minutosInicio < minutosOriginalInicio ||
           minutosFin > minutosOriginalFin ||
           minutosInicio >= minutosFin;
  }

  getHorariosInvalidos(): string[] {
    const invalidos = this.esquema.horarios
      .filter(horario => this.esHorarioInvalido(horario))
      .map(horario => {
        // CORRECCIÓN: buscar el horario disponible correcto para múltiples rangos del mismo día
        const minutosInicio = this.timeToMinutes(horario.horaInicio);
        const minutosFin = this.timeToMinutes(horario.horaFin);

        const horarioOriginal = this.horariosDisponibles.find(h =>
          this.normalizarDia(h.dia) === this.normalizarDia(horario.dia) &&
          this.timeToMinutes(h.horaInicio) <= minutosInicio &&
          this.timeToMinutes(h.horaFin) >= minutosFin
        );

        const rangoDisponible = horarioOriginal ? `${horarioOriginal.horaInicio}-${horarioOriginal.horaFin}` : 'N/A';
        return `${this.getDiaNombre(horario.dia)}: ${horario.horaInicio}-${horario.horaFin} (disponible: ${rangoDisponible})`;
      });

    return invalidos;
  }

  puedeGuardar(): boolean {
    return this.esquema.disponibilidadMedicoId > 0 &&
           this.esquema.horarios.length > 0 &&
           this.esquema.intervalo > 0 &&
           !this.tieneHorariosInvalidos();
  }

  guardarEsquema(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (!this.puedeGuardar()) {
      this.mensajeError = 'Complete todos los campos requeridos y seleccione al menos un horario.';
      return;
    }

    // Verificar y asignar centroId si no está presente
    if (!this.esquema.centroId || this.esquema.centroId === 0) {
      this.esquema.centroId = this.centroId;
      console.log('🏥 Asignando centroId al esquema:', this.centroId);
    }

    console.log('🚀 Guardando esquema:', this.esquema);
    console.log('📍 Centro ID en esquema:', this.esquema.centroId);

    this.guardando = true;

    // El backend ahora maneja automáticamente la actualización si ya existe un esquema
    // con la misma disponibilidad, combinando los horarios
    this.esquemaTurnoService.create(this.esquema).subscribe({
      next: (response) => {
        this.guardando = false;
        this.mensajeExito = 'Esquema de turno guardado exitosamente';

        setTimeout(() => {
          this.activeModal.close(response.data);
        }, 1000);
      },
      error: (error) => {
        this.guardando = false;
        console.error('Error al guardar el esquema:', error);
        this.mensajeError = error?.error?.message || error?.error?.status_text || 'Error al guardar el esquema de turno. Intente nuevamente.';
      }
    });
  }

  onCancel() {
    this.activeModal.dismiss();
  }
}
