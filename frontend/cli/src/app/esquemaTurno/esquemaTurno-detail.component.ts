import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { EsquemaTurnoService } from './esquemaTurno.service';
import { StaffMedicoService } from '../staffMedicos/staffMedico.service';
import { ConsultorioService } from '../consultorios/consultorio.service';
import { DisponibilidadMedicoService } from '../disponibilidadMedicos/disponibilidadMedico.service';
import { EsquemaTurno } from './esquemaTurno';
import { StaffMedico } from '../staffMedicos/staffMedico';
import { Consultorio } from '../consultorios/consultorio';
import { DisponibilidadMedico } from '../disponibilidadMedicos/disponibilidadMedico';
import { ModalService } from '../modal/modal.service';

@Component({
  selector: 'app-esquema-turno-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './esquemaTurno-detail.component.html', 
  styleUrl: './esquemaTurno-detail.component.css'
})
export class EsquemaTurnoDetailComponent {
  esquema: EsquemaTurno = {
    id: 0,
    staffMedicoId: null as any,
    consultorioId: null as any,
    disponibilidadMedicoId: null as any,
    centroId: null as any,
    horarios: [],
    intervalo: 15,
  } as EsquemaTurno;
  staffMedicos: StaffMedico[] = [];
  consultorios: Consultorio[] = [];
  disponibilidadesMedico: DisponibilidadMedico[] = [];
  selectedDisponibilidadId: number | null = null;
  consultorioHorarios: any[] = []; // Horarios del consultorio seleccionado
  horariosDisponibles: any[] = []; // Horarios resultantes de la traspolación
  esquemasPreviosConsultorio: EsquemaTurno[] = []; // Esquemas ya existentes en el consultorio
  horariosOcupados: any[] = []; // Horarios ya ocupados por otros esquemas
  modoEdicion = false;
  esNuevo = false;

  // ==================== NAVIGATION PARAMETERS (SRP) ====================
  fromCentro: string | null = null;
  returnTab: string | null = null;

  diasSemana: string[] = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
  diasSemanaMap: { [key: string]: string } = {
    'Monday': 'LUNES',
    'Tuesday': 'MARTES', 
    'Wednesday': 'MIÉRCOLES',
    'Thursday': 'JUEVES',
    'Friday': 'VIERNES',
    'Saturday': 'SÁBADO',
    'Sunday': 'DOMINGO',
    'LUNES': 'LUNES',
    'MARTES': 'MARTES',
    'MIÉRCOLES': 'MIÉRCOLES',
    'MIERCOLES': 'MIÉRCOLES', // Sin tilde -> con tilde
    'JUEVES': 'JUEVES',
    'VIERNES': 'VIERNES',
    'SÁBADO': 'SÁBADO',
    'SABADO': 'SÁBADO', // Sin tilde -> con tilde
    'DOMINGO': 'DOMINGO'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private esquemaTurnoService: EsquemaTurnoService,
    private staffMedicoService: StaffMedicoService,
    private consultorioService: ConsultorioService,
    private disponibilidadMedicoService: DisponibilidadMedicoService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    // Read navigation parameters
    this.fromCentro = this.route.snapshot.queryParamMap.get('fromCentro');
    this.returnTab = this.route.snapshot.queryParamMap.get('returnTab');
    
    // Cargar datos dependientes primero
    this.loadStaffMedicos(() => {
      this.loadDisponibilidadesMedico(() => {
        // Una vez cargados todos los datos, procesar el esquema
        this.get();
      });
    });
  }

  // Helper methods for template binding to replace arrow functions
  getDisponibilidadById(): DisponibilidadMedico | undefined {
    return this.disponibilidadesMedico.find(d => d.id === this.esquema.disponibilidadMedicoId);
  }

  getDisponibilidadLabelForCurrent(): string {
    const disp = this.getDisponibilidadById();
    return disp ? this.getDisponibilidadLabel(disp) : '';
  }

  getConsultorioNombre(): string {
    const consultorio = this.consultorios.find(c => c.id === this.esquema.consultorioId);
    return consultorio?.nombre || 'Sin consultorio';
  }

  getConsultorioSeleccionado(): Consultorio | undefined {
    return this.consultorios.find(c => c.id === this.esquema.consultorioId);
  }

  get(): void {
    const path = this.route.snapshot.routeConfig?.path;

    if (path === 'esquema-turno/new') {
      this.modoEdicion = true;
      this.esNuevo = true;
      
      // Auto-completar con parámetros de query si vienen del centro de atención
      const consultorioId = this.route.snapshot.queryParamMap.get('consultorioId');
      const centroAtencionId = this.route.snapshot.queryParamMap.get('centroAtencionId');
      
      if (consultorioId && centroAtencionId) {
        this.esquema.consultorioId = Number(consultorioId);
        this.esquema.centroId = Number(centroAtencionId);
        
        // Cargar consultorios para el centro específico
        this.loadConsultorios(Number(centroAtencionId));
      }
    } else if (path === 'esquema-turno/:id') {
      this.modoEdicion = this.route.snapshot.queryParamMap.get('edit') === 'true';
      this.esNuevo = false;

      const idParam = this.route.snapshot.paramMap.get('id');
      if (!idParam) {
        console.error('El ID proporcionado no es válido.');
        return;
      }

      const id = Number(idParam);
      if (isNaN(id)) {
        console.error('El ID proporcionado no es un número válido.');
        return;
      }

      this.esquemaTurnoService.get(id).subscribe({
        next: (dataPackage) => {
          if (!dataPackage || !dataPackage.data) {
            console.error('No se recibieron datos del esquema de turno');
            this.modalService.alert('Error', 'No se pudieron cargar los datos del esquema de turno.');
            return;
          }

          this.esquema = <EsquemaTurno>dataPackage.data;

          // Validar que el esquema se haya asignado correctamente
          if (!this.esquema) {
            console.error('El esquema de turno está vacío');
            this.modalService.alert('Error', 'Los datos del esquema de turno están vacíos.');
            return;
          }

          // Convertir los días al formato esperado
          if (this.esquema.horarios && Array.isArray(this.esquema.horarios)) {
            this.esquema.horarios = this.esquema.horarios.map(horario => ({
              ...horario,
              dia: this.diasSemanaMap[horario.dia] || horario.dia, // Convertir el día si es necesario
            }));
          } else {
            // Si no hay horarios, inicializar como array vacío
            this.esquema.horarios = [];
          }

          // Asignar la disponibilidad seleccionada
          this.selectedDisponibilidadId = this.esquema.disponibilidadMedicoId ?? null;
          
          // Si hay una disponibilidad asociada, cargar sus horarios
          if (this.esquema.disponibilidadMedicoId) {
            const disp = this.disponibilidadesMedico.find(d => d.id === this.esquema.disponibilidadMedicoId);
            if (disp && disp.horarios) {
              this.esquema.horariosDisponibilidad = disp.horarios.map(horario => ({
                dia: horario.dia,
                horaInicio: horario.horaInicio,
                horaFin: horario.horaFin
              }));
            } else {
              this.esquema.horariosDisponibilidad = [];
            }
          } else {
            this.esquema.horariosDisponibilidad = [];
          }

          // Cargar consultorios si hay un centro asociado
          if (this.esquema.centroId) {
            this.loadConsultorios(this.esquema.centroId, () => {
              // Una vez cargados los consultorios, cargar horarios del consultorio si está seleccionado
              if (this.esquema.consultorioId) {
                this.onConsultorioChange();
              }
            });
          }
          
          // Si hay consultorio seleccionado, cargar esquemas previos
          if (this.esquema.consultorioId) {
            this.loadEsquemasPreviosConsultorio(() => {
              this.calcularHorariosDisponibles();
            });
          }
        },
        error: (err) => {
          console.error('Error al cargar el esquema de turno:', err);
          this.modalService.alert('Error', 'No se pudo cargar el esquema de turno.');
        }
      });
    }
  }

  loadDisponibilidadesMedico(callback?: () => void): void {
    this.disponibilidadMedicoService.all().subscribe(dp => {
      this.disponibilidadesMedico = dp.data as DisponibilidadMedico[];
      if (callback) callback();
    });
  }

  loadStaffMedicos(callback?: () => void): void {
    this.staffMedicoService.all().subscribe(dp => {
      this.staffMedicos = dp.data as StaffMedico[];
      if (callback) callback();
    });
  }

  onDisponibilidadChange(): void {
    const disp = this.disponibilidadesMedico.find(d => d.id === this.selectedDisponibilidadId);
    if (disp) {
      this.esquema.staffMedicoId = disp.staffMedicoId;
      
      if (disp.horarios && Array.isArray(disp.horarios)) {
        this.esquema.horariosDisponibilidad = disp.horarios.map(horario => ({
          dia: horario.dia,
          horaInicio: horario.horaInicio,
          horaFin: horario.horaFin
        }));
      } else {
        this.esquema.horariosDisponibilidad = [];
      }
      
      this.esquema.disponibilidadMedicoId = disp.id;

      // Obtener el staff médico asociado
      const staff = this.staffMedicos.find(s => s.id === disp.staffMedicoId);
      if (staff) {
        this.esquema.centroId = staff.centro?.id ?? 0; // Asignar el centroId si existe, o 0 como valor predeterminado
      } else {
        this.esquema.centroId = 0; // Si no hay staff asociado, asignar 0 como valor predeterminado
      }
    }

    // Cargar los consultorios asociados al centro de atención
    if (this.esquema.centroId) {
      this.loadConsultorios(this.esquema.centroId, () => {
        // Después de cargar consultorios, calcular horarios si ya hay consultorio seleccionado
        if (this.esquema.consultorioId) {
          this.onConsultorioChange();
        }
      });
    } else {
      this.consultorios = []; // Limpiar consultorios si no hay centro asociado
      this.horariosDisponibles = []; // Limpiar horarios disponibles
    }
  }

  onConsultorioChange(): void {
    if (this.esquema.consultorioId) {
      // Buscar el consultorio seleccionado en la lista de consultorios cargados
      const consultorioSeleccionado = this.consultorios.find(c => c.id === Number(this.esquema.consultorioId));
      
      if (consultorioSeleccionado) {
        console.log('Consultorio seleccionado:', consultorioSeleccionado);
        
        // Extraer y formatear los horarios del consultorio para mostrarlos
        if (consultorioSeleccionado.horariosSemanales && consultorioSeleccionado.horariosSemanales.length > 0) {
          this.consultorioHorarios = consultorioSeleccionado.horariosSemanales
            .filter(horario => horario.activo && horario.horaApertura && horario.horaCierre)
            .map(horario => ({
              dia: horario.diaSemana,
              horaInicio: horario.horaApertura,
              horaFin: horario.horaCierre
            }));
          
          console.log('✅ Horarios del consultorio procesados:', this.consultorioHorarios);
        } else {
          this.consultorioHorarios = [];
          console.warn('⚠️ El consultorio seleccionado no tiene horarios configurados');
        }
      } else {
        this.consultorioHorarios = [];
      }
    } else {
      // Si no hay consultorio seleccionado, limpiar los horarios
      this.consultorioHorarios = [];
      this.horariosDisponibles = [];
    }

    // Calcular horarios disponibles después de cambiar el consultorio
    this.loadEsquemasPreviosConsultorio(() => {
      this.calcularHorariosDisponibles();
    });
  }
  loadConsultorios(centroId: number, callback?: () => void): void {
    this.consultorioService.getByCentroAtencion(centroId).subscribe({
      next: (dp) => {
        this.consultorios = dp.data as Consultorio[];
        console.log('Consultorios cargados:', this.consultorios);

        // Asignar el consultorioId al modelo si está disponible
        if (this.esquema.consultorioId) {
          const consultorio = this.consultorios.find(c => c.id === this.esquema.consultorioId);
          if (consultorio) {
            this.esquema.consultorioId = consultorio.id;
          } else {
            console.warn('El consultorio asociado no se encuentra en la lista de consultorios cargados.');
          }
        }
        
        // Ejecutar callback si se proporciona
        if (callback) {
          callback();
        }
      },
      error: () => {
        console.error('Error al cargar los consultorios.');
        this.consultorios = [];
      }
    });
  }

  getCentroNombre(): string {
    const staff = this.staffMedicos.find(s => s.id === this.esquema.staffMedicoId);
    return staff?.centro?.nombre ?? '';
  }



  getDisponibilidadLabel(disp: DisponibilidadMedico): string {
    const staff = this.staffMedicos.find(s => s.id === disp.staffMedicoId);
    if (!staff) return `ID ${disp.id}`;

    const medicoNombre = staff.medico ? `${staff.medico.nombre} ${staff.medico.apellido}` : 'Sin médico';
    const especialidadNombre = staff.especialidad ? staff.especialidad.nombre : 'Sin especialidad';

    const horarios = disp.horarios
      .map(horario => `${horario.dia}: ${horario.horaInicio}-${horario.horaFin}`)
      .join(', ');

    return `${medicoNombre} (${especialidadNombre}) - ${horarios}`;
  }

  save(): void {
    // Asegurar que se use la disponibilidad seleccionada
    if (this.selectedDisponibilidadId) {
      this.esquema.disponibilidadMedicoId = this.selectedDisponibilidadId;
    }

    const payload = { ...this.esquema };

    // Agregar un log para verificar el contenido del payload
    console.log('Payload enviado al backend:', payload);

    // Validar que los campos requeridos no sean null (incluyendo consultorio que ahora es obligatorio)
    if (!payload.disponibilidadMedicoId || !payload.staffMedicoId || !payload.centroId || !payload.consultorioId) {
      this.modalService.alert('Error', 'Debe completar todos los campos obligatorios (médico, disponibilidad, centro y consultorio).');
      return;
    }
    
    // Validar que hay horarios configurados
    if (!payload.horarios || payload.horarios.length === 0) {
      this.modalService.alert('Error', 'Debe configurar al menos un horario para el esquema.');
      return;
    }

    // Validar que todos los horarios estén dentro de los rangos disponibles y no tengan conflictos
    for (const horario of payload.horarios) {
      const rangoDisponible = this.getRangoHorarioDisponible(horario.dia);
      const detalleConflicto = this.obtenerDetalleConflicto(horario.dia, horario.horaInicio, horario.horaFin);
      
      if (!rangoDisponible) {
        this.modalService.alert('Error', `El día ${horario.dia} no está disponible. Seleccione un día de los horarios disponibles.`);
        return;
      }
      
      if (detalleConflicto) {
        this.modalService.alert('Error de Conflicto', `El horario para ${horario.dia} (${horario.horaInicio} - ${horario.horaFin}) tiene conflicto: ${detalleConflicto}. Por favor, seleccione otro horario.`);
        return;
      }
      
      if (!this.validarHorarioEsquema(horario.dia, horario.horaInicio, horario.horaFin)) {
        this.modalService.alert('Error', `El horario para ${horario.dia} (${horario.horaInicio} - ${horario.horaFin}) está fuera del rango disponible (${rangoDisponible.horaInicio} - ${rangoDisponible.horaFin}). Por favor, ajuste los horarios dentro de los rangos permitidos.`);
        return;
      }
    }

    this.esquemaTurnoService.create(payload).subscribe({
      next: () => {
        this.navigateBack();
      },
      error: (err) => {
        console.error('Error al guardar el esquema de turno:', err);
        this.modalService.alert('Error', 'Error al guardar el esquema de turno.');
      }
    });
  }

  activarEdicion(): void {
    this.modoEdicion = true;
  }

  cancelar(): void {
    this.modoEdicion = false;
    if (this.esNuevo) {
      this.navigateBack();
    } else {
      this.get(); // Recargar datos originales
    }
  }

  goBack(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    if (this.fromCentro && this.returnTab) {
      this.router.navigate(['/centrosAtencion', this.fromCentro], {
        queryParams: { activeTab: this.returnTab }
      });
    } else if (this.fromCentro) {
      this.router.navigate(['/centrosAtencion', this.fromCentro]);
    } else {
      this.router.navigate(['/esquema-turno']);
    }
  }

  remove(esquema: EsquemaTurno): void {
    this.modalService
      .confirm(
        "Eliminar Esquema de Turno",
        "¿Está seguro que desea eliminar este esquema de turno?",
        "Si elimina el esquema no podrá recuperarlo luego"
      )
      .then(() => {
        this.esquemaTurnoService.remove(esquema.id).subscribe({
          next: () => this.router.navigate(['/esquema-turno']),
          error: (err) => {
            const msg = err?.error?.message || "Error al eliminar el esquema de turno.";
            this.modalService.alert("Error", msg);
            console.error("Error al eliminar esquema de turno:", err);
          }
        });
      });
  }

  allFieldsEmpty(): boolean {
    return !this.esquema.disponibilidadMedicoId || 
           !this.esquema.intervalo ||
           !this.esquema.consultorioId ||
           !this.esquema.horarios ||
           this.esquema.horarios.length === 0;
  }

  addHorario(): void {
    if (!this.esquema.horarios) {
      this.esquema.horarios = [];
    }
    this.esquema.horarios.push({ dia: '', horaInicio: '', horaFin: '' });
  }

  /**
   * Selecciona un horario disponible y lo agrega al esquema
   */
  seleccionarHorarioDisponible(horarioDisponible: any): void {
    if (!this.esquema.horarios) {
      this.esquema.horarios = [];
    }

    // Verificar si este horario específico ya está seleccionado
    const horarioYaSeleccionado = this.esHorarioSeleccionado(horarioDisponible);
    
    if (horarioYaSeleccionado) {
      // Si ya está seleccionado, lo deseleccionamos
      this.esquema.horarios = this.esquema.horarios.filter(horario => 
        !(this.normalizarDia(horario.dia) === this.normalizarDia(horarioDisponible.dia) &&
          horario.horaInicio === horarioDisponible.horaInicio &&
          horario.horaFin === horarioDisponible.horaFin)
      );
      return;
    }

    // Verificar si hay horarios existentes para ese día
    const horariosDelMismoDia = this.esquema.horarios.filter(h => 
      this.normalizarDia(h.dia) === this.normalizarDia(horarioDisponible.dia)
    );

    if (horariosDelMismoDia.length > 0) {
      // Preguntar si desea agregar otro horario para el mismo día
      const horariosExistentes = horariosDelMismoDia
        .map(h => `${h.horaInicio} - ${h.horaFin}`)
        .join(', ');
      
      const mensaje = `Ya hay ${horariosDelMismoDia.length} horario(s) para ${horarioDisponible.dia} (${horariosExistentes}). ¿Desea agregar este horario adicional (${horarioDisponible.horaInicio} - ${horarioDisponible.horaFin})?`;
      
      this.modalService.confirm(
        'Agregar Horario Adicional',
        mensaje,
        'Se permitirán múltiples horarios para el mismo día'
      ).then(() => {
        // Agregar horario adicional
        this.esquema.horarios.push({
          dia: horarioDisponible.dia,
          horaInicio: horarioDisponible.horaInicio,
          horaFin: horarioDisponible.horaFin
        });
      });
    } else {
      // Agregar primer horario para este día
      this.esquema.horarios.push({
        dia: horarioDisponible.dia,
        horaInicio: horarioDisponible.horaInicio,
        horaFin: horarioDisponible.horaFin
      });
    }
  }

  /**
   * Verifica si un horario disponible ya está seleccionado en el esquema
   */
  esHorarioSeleccionado(horarioDisponible: any): boolean {
    if (!this.esquema.horarios || this.esquema.horarios.length === 0) {
      return false;
    }

    return this.esquema.horarios.some(horario => 
      this.normalizarDia(horario.dia) === this.normalizarDia(horarioDisponible.dia) &&
      horario.horaInicio === horarioDisponible.horaInicio &&
      horario.horaFin === horarioDisponible.horaFin
    );
  }

  /**
   * Selecciona todos los horarios disponibles
   */
  seleccionarTodosLosHorarios(): void {
    if (!this.horariosDisponibles || this.horariosDisponibles.length === 0) {
      return;
    }

    this.modalService.confirm(
      'Seleccionar Todos los Horarios',
      '¿Desea agregar todos los horarios disponibles al esquema?',
      'Esto reemplazará cualquier horario existente'
    ).then(() => {
      this.esquema.horarios = this.horariosDisponibles.map(horario => ({
        dia: horario.dia,
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin
      }));
    });
  }

  /**
   * Limpia todos los horarios del esquema
   */
  limpiarTodosLosHorarios(): void {
    if (!this.esquema.horarios || this.esquema.horarios.length === 0) {
      return;
    }

    this.modalService.confirm(
      'Limpiar Horarios',
      '¿Desea eliminar todos los horarios del esquema?',
      'Esta acción no se puede deshacer'
    ).then(() => {
      this.esquema.horarios = [];
    });
  }

  removeHorario(index: number): void {
    if (this.esquema.horarios && this.esquema.horarios.length > index) {
      this.esquema.horarios.splice(index, 1);
    }
  }

  loadEsquemasPreviosConsultorio(callback?: () => void): void {
    if (!this.esquema.consultorioId || !this.esquema.centroId) {
      this.esquemasPreviosConsultorio = [];
      this.horariosOcupados = [];
      if (callback) callback();
      return;
    }

    // Usar el endpoint del centro que sabemos que existe y filtrar por consultorio
    this.esquemaTurnoService.getByCentroAtencion(this.esquema.centroId).subscribe({
      next: (dp) => {
        // Filtrar esquemas del mismo consultorio (excluyendo el actual si estamos editando)
        this.esquemasPreviosConsultorio = (dp.data as EsquemaTurno[] || [])
          .filter(esquema => 
            esquema.consultorioId === this.esquema.consultorioId && 
            esquema.id !== this.esquema.id
          );
        
        // Extraer horarios ocupados
        this.horariosOcupados = [];
        for (const esquema of this.esquemasPreviosConsultorio) {
          if (esquema.horarios && Array.isArray(esquema.horarios)) {
            for (const horario of esquema.horarios) {
              this.horariosOcupados.push({
                ...horario,
                esquemaId: esquema.id,
                medicoNombre: this.getMedicoNombre(esquema.staffMedicoId)
              });
            }
          }
        }
        
        console.log('Esquemas previos del consultorio:', this.esquemasPreviosConsultorio);
        console.log('Horarios ocupados:', this.horariosOcupados);
        
        if (callback) callback();
      },
      error: (err) => {
        console.error('Error al cargar esquemas previos del consultorio:', err);
        this.esquemasPreviosConsultorio = [];
        this.horariosOcupados = [];
        if (callback) callback();
      }
    });
  }

  private getMedicoNombre(staffMedicoId: number): string {
    const staff = this.staffMedicos.find(s => s.id === staffMedicoId);
    return staff?.medico ? `${staff.medico.nombre} ${staff.medico.apellido}` : 'Desconocido';
  }

  // ==================== MÉTODOS DE TRASPOLACIÓN ====================

  /**
   * Calcula la intersección entre horarios de disponibilidad médica y horarios del consultorio
   */
  private calcularHorariosDisponibles(): void {
    this.horariosDisponibles = [];

    if (!this.esquema.horariosDisponibilidad || this.esquema.horariosDisponibilidad.length === 0) {
      console.warn('No hay horarios de disponibilidad médica');
      return;
    }

    if (!this.consultorioHorarios || this.consultorioHorarios.length === 0) {
      console.warn('No hay horarios de consultorio');
      return;
    }

    // Para cada día de la semana, calcular la intersección de horarios
    for (const horarioMedico of this.esquema.horariosDisponibilidad) {
      const diaMedicoNormalizado = this.normalizarDia(horarioMedico.dia);
      
      const horarioConsultorio = this.consultorioHorarios.find(hc => {
        const diaConsultorioNormalizado = this.normalizarDia(hc.dia);
        const coincide = diaMedicoNormalizado === diaConsultorioNormalizado;
        
        console.log(`Comparando días:
          - Médico: "${horarioMedico.dia}" -> normalizado: "${diaMedicoNormalizado}"
          - Consultorio: "${hc.dia}" -> normalizado: "${diaConsultorioNormalizado}"
          - Coincide: ${coincide}`);
        
        return coincide;
      });

      if (horarioConsultorio) {
        console.log(`✅ Encontrada coincidencia para ${diaMedicoNormalizado}:`, {
          medico: horarioMedico,
          consultorio: horarioConsultorio
        });
        
        const interseccion = this.calcularInterseccionHorario(horarioMedico, horarioConsultorio);
        if (interseccion) {
          // Descontar horarios ya ocupados por otros esquemas
          const horariosLibres = this.descontarHorariosOcupados(interseccion);
          this.horariosDisponibles.push(...horariosLibres);
        }
      } else {
        console.log(`❌ No se encontró horario de consultorio para ${diaMedicoNormalizado}`);
      }
    }

    console.log('Horarios disponibles calculados:', this.horariosDisponibles);
  }

  /**
   * Descuenta horarios ya ocupados de un horario disponible, devolviendo segmentos libres
   */
  private descontarHorariosOcupados(horarioDisponible: any): any[] {
    const dia = horarioDisponible.dia;
    const inicioDisponible = this.timeToMinutes(horarioDisponible.horaInicio);
    const finDisponible = this.timeToMinutes(horarioDisponible.horaFin);

    // Obtener horarios ocupados para este día
    const ocupadosDelDia = this.horariosOcupados
      .filter(ocupado => this.normalizarDia(ocupado.dia) === this.normalizarDia(dia))
      .map(ocupado => ({
        inicio: this.timeToMinutes(ocupado.horaInicio),
        fin: this.timeToMinutes(ocupado.horaFin),
        medicoNombre: ocupado.medicoNombre
      }))
      .sort((a, b) => a.inicio - b.inicio);

    if (ocupadosDelDia.length === 0) {
      // No hay conflictos, devolver el horario completo
      return [horarioDisponible];
    }

    const segmentosLibres = [];
    let puntoInicio = inicioDisponible;

    for (const ocupado of ocupadosDelDia) {
      // Si hay espacio antes del horario ocupado
      if (puntoInicio < ocupado.inicio) {
        const inicioSegmento = Math.max(puntoInicio, inicioDisponible);
        const finSegmento = Math.min(ocupado.inicio, finDisponible);
        
        if (inicioSegmento < finSegmento) {
          segmentosLibres.push({
            dia: dia,
            horaInicio: this.minutesToTime(inicioSegmento),
            horaFin: this.minutesToTime(finSegmento)
          });
        }
      }
      
      // Mover el punto de inicio después del horario ocupado
      puntoInicio = Math.max(puntoInicio, ocupado.fin);
    }

    // Agregar segmento final si queda espacio
    if (puntoInicio < finDisponible) {
      segmentosLibres.push({
        dia: dia,
        horaInicio: this.minutesToTime(puntoInicio),
        horaFin: this.minutesToTime(finDisponible)
      });
    }

    return segmentosLibres;
  }

  /**
   * Calcula la intersección de horarios entre disponibilidad médica y consultorio para un día específico
   */
  private calcularInterseccionHorario(horarioMedico: any, horarioConsultorio: any): any | null {
    const inicioMedico = this.timeToMinutes(horarioMedico.horaInicio);
    const finMedico = this.timeToMinutes(horarioMedico.horaFin);
    const inicioConsultorio = this.timeToMinutes(horarioConsultorio.horaInicio);
    const finConsultorio = this.timeToMinutes(horarioConsultorio.horaFin);

    // Calcular el inicio más tardío y el fin más temprano
    const inicioInterseccion = Math.max(inicioMedico, inicioConsultorio);
    const finInterseccion = Math.min(finMedico, finConsultorio);

    // Si hay intersección válida (el inicio es antes que el fin)
    if (inicioInterseccion < finInterseccion) {
      return {
        dia: this.normalizarDia(horarioMedico.dia),
        horaInicio: this.minutesToTime(inicioInterseccion),
        horaFin: this.minutesToTime(finInterseccion)
      };
    }

    return null; // No hay intersección
  }

  /**
   * Convierte un tiempo en formato HH:mm a minutos desde medianoche
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convierte minutos desde medianoche a formato HH:mm
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Normaliza el nombre del día a formato estándar
   */
  private normalizarDia(dia: string): string {
    if (!dia) return '';
    
    const diaUpperCase = dia.toUpperCase();
    
    // Primero intentar con el mapeo directo
    if (this.diasSemanaMap[diaUpperCase]) {
      return this.diasSemanaMap[diaUpperCase];
    }
    
    // Si no encuentra, normalizar quitando tildes y espacios
    const diaNormalizado = diaUpperCase
      .replace(/Á/g, 'A')
      .replace(/É/g, 'E') 
      .replace(/Í/g, 'I')
      .replace(/Ó/g, 'O')
      .replace(/Ú/g, 'U')
      .replace(/\s+/g, '')
      .trim();
    
    // Mapeo manual para casos específicos
    switch (diaNormalizado) {
      case 'SABADO': return 'SÁBADO';
      case 'MIERCOLES': return 'MIÉRCOLES';
      case 'LUNES': return 'LUNES';
      case 'MARTES': return 'MARTES';
      case 'JUEVES': return 'JUEVES';
      case 'VIERNES': return 'VIERNES';
      case 'DOMINGO': return 'DOMINGO';
      default: return this.diasSemanaMap[diaNormalizado] || diaUpperCase;
    }
  }

  /**
   * Obtiene los días disponibles para agregar horarios al esquema (sin duplicados)
   */
  getDiasDisponibles(): string[] {
    const dias = this.horariosDisponibles.map(h => h.dia);
    return [...new Set(dias)]; // Eliminar duplicados
  }

  /**
   * Obtiene el rango de horarios disponibles para un día específico
   * Si hay múltiples segmentos, devuelve el rango completo (desde el inicio más temprano al fin más tardío)
   */
  getRangoHorarioDisponible(dia: string): { horaInicio: string; horaFin: string } | null {
    const horariosDelDia = this.horariosDisponibles.filter(h => h.dia === dia);
    if (horariosDelDia.length === 0) return null;

    // Si solo hay un horario, devolverlo directamente
    if (horariosDelDia.length === 1) {
      return { 
        horaInicio: horariosDelDia[0].horaInicio, 
        horaFin: horariosDelDia[0].horaFin 
      };
    }

    // Si hay múltiples horarios, calcular el rango completo
    const inicios = horariosDelDia.map(h => this.timeToMinutes(h.horaInicio));
    const fines = horariosDelDia.map(h => this.timeToMinutes(h.horaFin));
    
    return {
      horaInicio: this.minutesToTime(Math.min(...inicios)),
      horaFin: this.minutesToTime(Math.max(...fines))
    };
  }

  /**
   * Obtiene todos los segmentos de horarios disponibles para un día específico
   */
  getSegmentosDisponiblesDelDia(dia: string): any[] {
    return this.horariosDisponibles.filter(h => h.dia === dia);
  }

  /**
   * Valida si un horario del esquema está dentro de los horarios disponibles
   */
  validarHorarioEsquema(dia: string, horaInicio: string, horaFin: string): boolean {
    // Obtener todos los segmentos disponibles para este día
    const segmentosDisponibles = this.getSegmentosDisponiblesDelDia(dia);
    if (segmentosDisponibles.length === 0) return false;

    const inicioMinutos = this.timeToMinutes(horaInicio);
    const finMinutos = this.timeToMinutes(horaFin);

    // Verificar si el horario completo cabe en alguno de los segmentos disponibles
    for (const segmento of segmentosDisponibles) {
      const inicioSegmento = this.timeToMinutes(segmento.horaInicio);
      const finSegmento = this.timeToMinutes(segmento.horaFin);

      if (inicioMinutos >= inicioSegmento && finMinutos <= finSegmento) {
        return true; // El horario cabe completamente en este segmento
      }
    }

    return false; // No cabe en ningún segmento disponible
  }

  /**
   * Verifica si un horario tiene conflicto con horarios ya ocupados
   */
  verificarConfictoConHorariosOcupados(dia: string, horaInicio: string, horaFin: string): boolean {
    const inicioNuevo = this.timeToMinutes(horaInicio);
    const finNuevo = this.timeToMinutes(horaFin);

    const ocupadosDelDia = this.horariosOcupados
      .filter(ocupado => this.normalizarDia(ocupado.dia) === this.normalizarDia(dia));

    for (const ocupado of ocupadosDelDia) {
      const inicioOcupado = this.timeToMinutes(ocupado.horaInicio);
      const finOcupado = this.timeToMinutes(ocupado.horaFin);

      // Verificar si hay solapamiento
      if (!(finNuevo <= inicioOcupado || inicioNuevo >= finOcupado)) {
        return true; // Hay conflicto
      }
    }

    return false; // No hay conflicto
  }

  /**
   * Obtiene información detallada del conflicto si existe
   */
  obtenerDetalleConflicto(dia: string, horaInicio: string, horaFin: string): string | null {
    const inicioNuevo = this.timeToMinutes(horaInicio);
    const finNuevo = this.timeToMinutes(horaFin);

    const ocupadosDelDia = this.horariosOcupados
      .filter(ocupado => this.normalizarDia(ocupado.dia) === this.normalizarDia(dia));

    for (const ocupado of ocupadosDelDia) {
      const inicioOcupado = this.timeToMinutes(ocupado.horaInicio);
      const finOcupado = this.timeToMinutes(ocupado.horaFin);

      // Verificar si hay solapamiento
      if (!(finNuevo <= inicioOcupado || inicioNuevo >= finOcupado)) {
        return `Conflicto con esquema de ${ocupado.medicoNombre} (${ocupado.horaInicio} - ${ocupado.horaFin})`;
      }
    }

    return null;
  }
}