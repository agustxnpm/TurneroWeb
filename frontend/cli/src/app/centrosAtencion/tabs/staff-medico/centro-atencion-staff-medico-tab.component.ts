import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { StaffMedico } from "../../../staffMedicos/staffMedico";
import { Medico } from "../../../medicos/medico";
import { Especialidad } from "../../../especialidades/especialidad";
import { DisponibilidadMedico } from "../../../disponibilidadMedicos/disponibilidadMedico";
import { DisponibilidadModalComponent } from "./disponibilidad-modal.component";
import { DisponibilidadMedicoService } from "../../../disponibilidadMedicos/disponibilidadMedico.service";

@Component({
  selector: "app-centro-atencion-staff-medico-tab",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./centro-atencion-staff-medico-tab.component.html",
  styleUrls: ["./centro-atencion-staff-medico-tab.component.css"],
})
export class CentroAtencionStaffMedicoTabComponent
  implements OnInit, OnChanges
{
  @Input() staffMedicoCentro: StaffMedico[] = [];
  @Input() medicosDisponiblesParaAsociar: Medico[] = [];
  @Input() medicoSeleccionado: Medico | null = null;
  @Input() especialidadSeleccionada: Especialidad | null = null;
  @Input() especialidadesMedico: Especialidad[] = [];
  @Input() mensajeStaff: string = "";
  @Input() tipoMensajeStaff: string = "";
  @Input() staffMedicoExpandido: { [staffMedicoId: number]: boolean } = {};
  @Input() especialidadFaltanteParaAsociar: Especialidad | null = null;
  @Input() disponibilidadesStaff: {
    [staffMedicoId: number]: DisponibilidadMedico[];
  } = {};

  @Output() medicoSeleccionadoChange = new EventEmitter<Medico | null>();
  @Output() especialidadSeleccionadaChange =
    new EventEmitter<Especialidad | null>();
  @Output() medicoSeleccionado$ = new EventEmitter<void>();
  @Output() asociarMedico = new EventEmitter<void>();
  @Output() desasociarMedico = new EventEmitter<StaffMedico>();
  @Output() desasociarEspecialidad = new EventEmitter<{
    medico: any;
    especialidad: Especialidad;
  }>();
  @Output() toggleStaffMedicoExpansion = new EventEmitter<StaffMedico>();
  @Output() agregarDisponibilidad = new EventEmitter<StaffMedico>();
  @Output() gestionarDisponibilidadAvanzada = new EventEmitter<StaffMedico>();
  @Output() crearNuevaDisponibilidad = new EventEmitter<StaffMedico>();
  @Output() disponibilidadCreada = new EventEmitter<DisponibilidadMedico>();
  @Output() asociarEspecialidadFaltanteDesdeStaff = new EventEmitter<void>();

  // Propiedades para el modo de asociar
  modoAsociarMedico: boolean = false;

  // Propiedad para almacenar médicos agrupados (evita recalcular en cada detección de cambios)
  medicosAgrupados: any[] = [];

  constructor(
    private modalService: NgbModal,
    private disponibilidadService: DisponibilidadMedicoService
  ) {}

  ngOnInit(): void {
    // Cargar médicos agrupados en la inicialización
    this.cargarMedicosAgrupados();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recargar médicos agrupados cuando cambie el staff o las disponibilidades
    if (changes["staffMedicoCentro"] || changes["disponibilidadesStaff"]) {
      this.cargarMedicosAgrupados();
    }
  }

  /**
   * Carga los médicos agrupados en la propiedad (se llama explícitamente cuando se necesita actualizar)
   */
  cargarMedicosAgrupados(): void {
    const medicosMap = new Map();

    this.staffMedicoCentro.forEach((staff) => {
      if (staff.medico?.id) {
        const medicoId = staff.medico.id;

        if (!medicosMap.has(medicoId)) {
          // Primera vez que vemos este médico
          medicosMap.set(medicoId, {
            medico: staff.medico,
            staffEntries: [staff],
            especialidades: staff.especialidad ? [staff.especialidad] : [],
            allDisponibilidades: this.verDisponibilidadesStaff(staff),
          });
        } else {
          // Ya existe este médico, agregar la especialidad y disponibilidades
          const medicoData = medicosMap.get(medicoId);
          medicoData.staffEntries.push(staff);

          // Agregar especialidad si no existe
          if (
            staff.especialidad &&
            !medicoData.especialidades.find(
              (e: any) => e.id === staff.especialidad!.id
            )
          ) {
            medicoData.especialidades.push(staff.especialidad);
          }

          // Agregar disponibilidades de este staff
          const disponibilidadesStaff = this.verDisponibilidadesStaff(staff);
          medicoData.allDisponibilidades.push(...disponibilidadesStaff);
        }
      }
    });

    this.medicosAgrupados = Array.from(medicosMap.values());

    // Debug: Log de médicos agrupados
    console.log("Médicos agrupados cargados:", this.medicosAgrupados);
  }

  onMedicoSeleccionado(): void {
    this.medicoSeleccionadoChange.emit(this.medicoSeleccionado);
    this.medicoSeleccionado$.emit();
  }

  onEspecialidadSeleccionada(): void {
    console.log(
      "Especialidad seleccionada en hijo:",
      this.especialidadSeleccionada
    );
    this.especialidadSeleccionadaChange.emit(this.especialidadSeleccionada);
  }

  onModoAsociarMedico(): void {
    this.modoAsociarMedico = true;
  }

  onCancelarAsociarMedico(): void {
    this.modoAsociarMedico = false;
    this.medicoSeleccionado = null;
    this.especialidadSeleccionada = null;
    this.medicoSeleccionadoChange.emit(null);
    this.especialidadSeleccionadaChange.emit(null);
  }

  onAsociarMedico(): void {
    console.log(
      "onAsociarMedico clicked - medicoSeleccionado:",
      this.medicoSeleccionado
    );
    console.log(
      "onAsociarMedico clicked - especialidadSeleccionada:",
      this.especialidadSeleccionada
    );
    console.log("Emitiendo evento asociarMedico...");
    this.asociarMedico.emit();
    this.modoAsociarMedico = false;
    this.medicoSeleccionado = null;
    this.especialidadSeleccionada = null;

    // Recargar médicos agrupados después de asociar
    setTimeout(() => this.cargarMedicosAgrupados(), 100);
  }

  onAsociarEspecialidadFaltante(): void {
    console.log("onAsociarEspecialidadFaltante clicked");
    this.asociarEspecialidadFaltanteDesdeStaff.emit();
  }

  onDesasociarMedico(staff: StaffMedico): void {
    this.desasociarMedico.emit(staff);
  }

  onDesasociarEspecialidad(medico: any, especialidad: Especialidad): void {
    if (
      confirm(
        `¿Está seguro que desea desasociar la especialidad "${especialidad.nombre}" del Dr. ${medico.medico?.nombre} ${medico.medico?.apellido}?`
      )
    ) {
      this.desasociarEspecialidad.emit({ medico, especialidad });
    }
  }

  onToggleStaffMedicoExpansion(staff: StaffMedico): void {
    this.toggleStaffMedicoExpansion.emit(staff);
  }

  onAgregarDisponibilidad(staff: StaffMedico): void {
    this.agregarDisponibilidad.emit(staff);
  }

  onGestionarDisponibilidadAvanzada(staff: StaffMedico): void {
    this.gestionarDisponibilidadAvanzada.emit(staff);
  }

  onCrearNuevaDisponibilidad(staff: StaffMedico): void {
    this.abrirModalDisponibilidad(staff);
  }

  onAsociarEspecialidadFaltanteDesdeStaff(): void {
    this.asociarEspecialidadFaltanteDesdeStaff.emit();
  }

  /**
   * Abre el modal para crear una nueva disponibilidad
   */
  abrirModalDisponibilidad(staff: StaffMedico): void {
    const modalRef = this.modalService.open(DisponibilidadModalComponent, {
      size: "lg",
      backdrop: "static",
      keyboard: false,
    });

    // Pasar el staff médico al modal
    modalRef.componentInstance.staffMedico = staff;

    // Manejar el resultado del modal
    modalRef.result.then(
      (nuevaDisponibilidad: DisponibilidadMedico) => {
        if (nuevaDisponibilidad) {
          // Emitir evento para que el componente padre actualice las disponibilidades
          this.disponibilidadCreada.emit(nuevaDisponibilidad);
          // Recargar médicos agrupados después de crear disponibilidad
          setTimeout(() => this.cargarMedicosAgrupados(), 100);
        }
      },
      () => {
        // Modal fue cancelado o cerrado sin guardar
        console.log("Modal de disponibilidad cerrado sin guardar");
      }
    );
  }

  medicoYaAsociado(): boolean {
    if (!this.medicoSeleccionado) return false;

    // Verificar si el médico tiene especialidades disponibles para asociar
    const result = this.especialidadesMedico.length === 0;
    console.log("medicoYaAsociado check:", {
      medicoSeleccionado: this.medicoSeleccionado?.nombre,
      especialidadesMedico: this.especialidadesMedico,
      especialidadSeleccionada: this.especialidadSeleccionada,
      result: result,
    });
    return result;
  }

  /**
   * Verifica si un médico está parcialmente asociado (tiene algunas especialidades asignadas pero no todas)
   */
  medicoParcialmenteAsociado(): boolean {
    if (!this.medicoSeleccionado) return false;

    const todasLasEspecialidades =
      this.medicoSeleccionado.especialidades?.length || 0;
    const especialidadesAsignadas = this.staffMedicoCentro.filter(
      (staff) => staff.medico?.id === this.medicoSeleccionado!.id
    ).length;

    return (
      especialidadesAsignadas > 0 &&
      especialidadesAsignadas < todasLasEspecialidades
    );
  }

  verDisponibilidadesStaff(staff: StaffMedico): DisponibilidadMedico[] {
    if (!staff.id) return [];
    return this.disponibilidadesStaff[staff.id] || [];
  }

  /**
   * Verifica si un staff médico tiene disponibilidades configuradas
   */
  tieneDisponibilidades(staff: StaffMedico): boolean {
    return this.verDisponibilidadesStaff(staff).length > 0;
  }

  /**
   * Calcula la duración de un horario en horas
   */
  calcularDuracionHorario(horario: any): string {
    if (!horario.horaInicio || !horario.horaFin) return "";

    const inicio = new Date(`1970-01-01T${horario.horaInicio}`);
    const fin = new Date(`1970-01-01T${horario.horaFin}`);
    const duracion = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60); // En horas

    return `${duracion.toFixed(1)}h`;
  }

  /**
   * Obtiene las disponibilidades de un staff médico para un día específico
   */
  getDisponibilidadesPorDia(
    staff: StaffMedico,
    dia: string
  ): DisponibilidadMedico[] {
    const disponibilidades = this.verDisponibilidadesStaff(staff);
    return disponibilidades.filter((disponibilidad) =>
      disponibilidad.horarios?.some((horario) => horario.dia === dia)
    );
  }

  /**
   * Obtiene los horarios de una disponibilidad para un día específico
   */
  getHorariosPorDia(disponibilidad: DisponibilidadMedico, dia: string): any[] {
    if (!disponibilidad.horarios) return [];
    return disponibilidad.horarios.filter((horario) => horario.dia === dia);
  }

  /**
   * Obtiene la string de horario para mostrar en el calendario simplificado
   */
  getHorarioStringDisponibilidad(horario: any): string {
    if (!horario.horaInicio || !horario.horaFin) return "";
    const inicio = horario.horaInicio.substring(0, 5);
    const fin = horario.horaFin.substring(0, 5);
    return `${inicio}-${fin}`;
  }

  /**
   * Calcula la duración total de disponibilidad en un día
   */
  getDuracionTotalDia(
    disponibilidad: DisponibilidadMedico,
    dia: string
  ): string {
    const horarios = this.getHorariosPorDia(disponibilidad, dia);
    if (horarios.length === 0) return "";

    let totalMinutos = 0;
    horarios.forEach((horario) => {
      if (horario.horaInicio && horario.horaFin) {
        const inicio = new Date(`1970-01-01T${horario.horaInicio}`);
        const fin = new Date(`1970-01-01T${horario.horaFin}`);
        totalMinutos += (fin.getTime() - inicio.getTime()) / (1000 * 60);
      }
    });

    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    if (horas > 0 && minutos > 0) {
      return `${horas}h ${minutos}m`;
    } else if (horas > 0) {
      return `${horas}h`;
    } else if (minutos > 0) {
      return `${minutos}m`;
    }
    return "";
  }

  /**
   * Obtiene el total de disponibilidades configuradas para un staff médico
   */
  getTotalDisponibilidades(staff: StaffMedico): number {
    return this.verDisponibilidadesStaff(staff).length;
  }

  /**
   * Obtiene todas las disponibilidades de un médico agrupado
   */
  getDisponibilidadesTotalesMedico(medico: any): DisponibilidadMedico[] {
    return medico.allDisponibilidades || [];
  }

  /**
   * Verifica si un médico tiene disponibilidades configuradas
   */
  medicoTieneDisponibilidades(medico: any): boolean {
    return this.getDisponibilidadesTotalesMedico(medico).length > 0;
  }

  /**
   * Obtiene el primer staff entry de un médico (para operaciones que necesitan un staff específico)
   */
  getPrimerStaffDelMedico(medico: any): StaffMedico {
    return medico.staffEntries[0];
  }

  /**
   * Obtiene disponibilidades por día para un médico agrupado
   */
  getDisponibilidadesPorDiaMedico(
    medico: any,
    dia: string
  ): DisponibilidadMedico[] {
    const todasLasDisponibilidades =
      this.getDisponibilidadesTotalesMedico(medico);
    return todasLasDisponibilidades.filter((disponibilidad) =>
      disponibilidad.horarios?.some((horario) => horario.dia === dia)
    );
  }

  /**
   * Verifica si una especialidad tiene disponibilidades configuradas para un médico
   */
  especialidadTieneDisponibilidades(medico: any, especialidad: any): boolean {
    const todasLasDisponibilidades =
      this.getDisponibilidadesTotalesMedico(medico);

    // Si no hay especialidadId en la disponibilidad, se considera que es para todas las especialidades del médico
    return todasLasDisponibilidades.some(
      (disponibilidad) =>
        !disponibilidad.especialidadId ||
        disponibilidad.especialidadId === especialidad.id
    );
  }

  /**
   * Obtiene las disponibilidades de un médico filtradas por especialidad y día
   */
  getDisponibilidadesPorEspecialidadYDia(
    medico: any,
    especialidad: any,
    dia: string
  ): DisponibilidadMedico[] {
    const todasLasDisponibilidades =
      this.getDisponibilidadesTotalesMedico(medico);

    // Filtrar por especialidad (si no tiene especialidadId, se considera para todas)
    const disponibilidadesEspecialidad = todasLasDisponibilidades.filter(
      (disponibilidad) =>
        !disponibilidad.especialidadId ||
        disponibilidad.especialidadId === especialidad.id
    );

    // Filtrar por día
    return disponibilidadesEspecialidad.filter((disponibilidad) =>
      disponibilidad.horarios?.some((horario) => horario.dia === dia)
    );
  }

  /**
   * Abre el modal para gestionar disponibilidades de una especialidad específica
   */
  abrirModalDisponibilidadEspecialidad(medico: any, especialidad: any): void {
    const primerStaff = this.getPrimerStaffDelMedico(medico);

    if (!primerStaff || !primerStaff.id) {
      console.error("No se puede encontrar el staff del médico");
      return;
    }

    const modalRef = this.modalService.open(DisponibilidadModalComponent, {
      size: "lg",
      backdrop: "static",
      keyboard: false,
    });

    // Configurar el modal con información específica de la especialidad
    modalRef.componentInstance.staffMedico = primerStaff;
    modalRef.componentInstance.especialidadId = especialidad.id; // ID de la especialidad específica
    modalRef.componentInstance.especialidadNombre = especialidad.nombre; // Nombre para mostrar en el modal

    // Si ya tiene disponibilidades para esta especialidad, cargarlas en modo edición
    const disponibilidadesExistentes = this.getDisponibilidadesEspecialidad(
      medico,
      especialidad
    );
    if (disponibilidadesExistentes.length > 0) {
      modalRef.componentInstance.disponibilidadExistente =
        disponibilidadesExistentes[0];
    }

    // Manejar el resultado del modal
    modalRef.result.then(
      (nuevaDisponibilidad: DisponibilidadMedico) => {
        if (nuevaDisponibilidad) {
          // Emitir evento para que el componente padre actualice las disponibilidades
          this.disponibilidadCreada.emit(nuevaDisponibilidad);
          // Recargar médicos agrupados después de crear disponibilidad
          setTimeout(() => this.cargarMedicosAgrupados(), 100);
        }
      },
      () => {
        console.log(
          "Modal de disponibilidad para especialidad cerrado sin guardar"
        );
      }
    );
  }

  /**
   * Obtiene las disponibilidades de un médico para una especialidad específica
   */
  private getDisponibilidadesEspecialidad(
    medico: any,
    especialidad: any
  ): DisponibilidadMedico[] {
    const todasLasDisponibilidades =
      this.getDisponibilidadesTotalesMedico(medico);

    return todasLasDisponibilidades.filter(
      (disponibilidad) =>
        !disponibilidad.especialidadId ||
        disponibilidad.especialidadId === especialidad.id
    );
  }

  /**
   * Elimina una disponibilidad de un médico para una especialidad específica
   */
  eliminarDisponibilidadEspecialidad(medico: any, especialidad: any): void {
    const disponibilidades = this.getDisponibilidadesEspecialidad(
      medico,
      especialidad
    );

    if (disponibilidades.length === 0) {
      alert("No hay disponibilidades para eliminar.");
      return;
    }

    const mensaje = `¿Está seguro que desea eliminar TODAS las disponibilidades de ${especialidad.nombre} para el Dr. ${medico.medico?.nombre} ${medico.medico?.apellido}?\n\nEsto eliminará:\n- ${disponibilidades.length} disponibilidad(es) configurada(s)\n- Todos los horarios asociados\n\n⚠️ Esta acción no se puede deshacer.`;

    if (!confirm(mensaje)) {
      return;
    }

    // Contador para saber cuándo terminaron todas las eliminaciones
    let eliminacionesPendientes = disponibilidades.length;
    let eliminacionesExitosas = 0;
    let erroresEliminacion = 0;

    // Eliminar todas las disponibilidades de esta especialidad
    disponibilidades.forEach((disponibilidad) => {
      if (disponibilidad.id) {
        this.disponibilidadService.remove(disponibilidad.id).subscribe({
          next: () => {
            console.log(
              "Disponibilidad eliminada exitosamente:",
              disponibilidad.id
            );
            eliminacionesExitosas++;
            eliminacionesPendientes--;

            // Si terminaron todas las eliminaciones
            if (eliminacionesPendientes === 0) {
              this.finalizarEliminacion(
                eliminacionesExitosas,
                erroresEliminacion
              );
            }
          },
          error: (error) => {
            console.error("Error al eliminar disponibilidad:", error);
            erroresEliminacion++;
            eliminacionesPendientes--;

            // Si terminaron todas las eliminaciones
            if (eliminacionesPendientes === 0) {
              this.finalizarEliminacion(
                eliminacionesExitosas,
                erroresEliminacion
              );
            }
          },
        });
      } else {
        eliminacionesPendientes--;
      }
    });
  }

  /**
   * Finaliza el proceso de eliminación y recarga los datos
   */
  private finalizarEliminacion(exitosas: number, errores: number): void {
    if (errores > 0) {
      alert(
        `Se eliminaron ${exitosas} disponibilidad(es) con ${errores} error(es). Recargando página...`
      );
    } else {
      alert(`Se eliminaron ${exitosas} disponibilidad(es) exitosamente.`);
    }

    // Recargar la ventana para actualizar todos los datos
    window.location.reload();
  }
}
