import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";

// Services
import { TurnoService } from "../turnos/turno.service";
import { EspecialidadService } from "../especialidades/especialidad.service";
import { StaffMedicoService } from "../staffMedicos/staffMedico.service";
import { CentroAtencionService } from "../centrosAtencion/centroAtencion.service";
import { AgendaService } from "../agenda/agenda.service";
import { DiasExcepcionalesService } from "../agenda/dias-excepcionales.service";
import { PacienteService } from "../pacientes/paciente.service";
import { UserContextService } from "../services/user-context.service";
import { Role } from "../inicio-sesion/auth.service";
import { CentrosMapaModalComponent } from "../modal/centros-mapa-modal.component";
import { Turno } from "../turnos/turno";
import { Especialidad } from "../especialidades/especialidad";
import { StaffMedico } from "../staffMedicos/staffMedico";
import { CentroAtencion } from "../centrosAtencion/centroAtencion";
import { Paciente } from "../pacientes/paciente";
import { DataPackage } from "../data.package";

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
  enMantenimiento?: boolean;
  titulo?: string;
  // Datos del paciente si está ocupado
  pacienteId?: number;
  pacienteNombre?: string;
  pacienteApellido?: string;
  pacienteDni?: string;
  estadoTurno?: string;
}

@Component({
  selector: "app-operador-agenda",
  standalone: true,
  imports: [CommonModule, FormsModule, CentrosMapaModalComponent],
  templateUrl: "./operador-agenda.component.html",
  styleUrl: "./operador-agenda.component.css",
})
export class OperadorAgendaComponent implements OnInit, OnDestroy {
  // Estados de carga
  isLoadingTurnos = false;
  isLoadingEspecialidades = false;
  isLoadingStaffMedicos = false;
  isLoadingCentros = false;

  // Filtros
  especialidadSeleccionada = "";
  staffMedicoSeleccionado: number | null = null;
  centroAtencionSeleccionado: number | null = null;
  estadoSeleccionado = ""; // Nuevo filtro por estado

  // Listas completas (sin filtrar)
  especialidadesCompletas: Especialidad[] = [];
  staffMedicosCompletos: StaffMedico[] = [];
  centrosAtencionCompletos: CentroAtencion[] = [];
  pacientesCompletos: Paciente[] = [];

  // Listas filtradas que se muestran en los dropdowns
  especialidades: Especialidad[] = [];
  staffMedicos: StaffMedico[] = [];
  centrosAtencion: CentroAtencion[] = [];

  // Slots y calendario
  showCalendar = true; // Para operador, mostrar calendario por defecto
  slotsOriginales: SlotDisponible[] = []; // Slots sin filtrar del backend
  slotsDisponibles: SlotDisponible[] = []; // Slots filtrados que se muestran
  slotsPorFecha: { [fecha: string]: SlotDisponible[] } = {};
  fechasOrdenadas: string[] = [];
  semanas: number = 4;

  // Modal de detalles
  showDetailsModal = false;
  slotSeleccionado: SlotDisponible | null = null;

  // Modal de mapa de centros
  showMapaModal = false;

  // Listener para resize
  private resizeListener?: () => void;

  constructor(
    private turnoService: TurnoService,
    private especialidadService: EspecialidadService,
    private staffMedicoService: StaffMedicoService,
    private centroAtencionService: CentroAtencionService,
    private agendaService: AgendaService,
    private diasExcepcionalesService: DiasExcepcionalesService,
    private pacienteService: PacienteService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private userContextService: UserContextService
  ) {}

  ngOnInit() {
    // Cargar todos los datos necesarios al inicio
    this.cargarDiasExcepcionales();
    this.cargarEspecialidades();
    this.cargarTodosLosStaffMedicos();
    this.cargarCentrosAtencion();
    this.cargarPacientes();
    this.cargarTodosLosTurnos(); // Cargar TODOS los turnos (ocupados y disponibles)

    // Listener para reposicionar modal en resize
    this.resizeListener = () => {
      if (this.showDetailsModal) {
        // Reposicionar modal si está abierto
        this.cdr.detectChanges();
      }
    };
    window.addEventListener("resize", this.resizeListener);
  }

  ngOnDestroy() {
    // Cleanup resize listener
    if (this.resizeListener) {
      window.removeEventListener("resize", this.resizeListener);
    }
  }

  // ==================== MÉTODOS DE CARGA DE DATOS ====================

  // Cargar días excepcionales para el calendario
  cargarDiasExcepcionales() {
    // Los días excepcionales se extraen automáticamente de los eventos
    // No es necesaria una request adicional
  }

  // Cargar especialidades al inicializar
  cargarEspecialidades() {
    this.isLoadingEspecialidades = true;
    this.especialidadService.all().subscribe({
      next: (dataPackage: DataPackage<Especialidad[]>) => {
        this.especialidadesCompletas = dataPackage.data || [];
        this.especialidades = [...this.especialidadesCompletas];
        this.isLoadingEspecialidades = false;
      },
      error: (error) => {
        console.error("Error cargando especialidades:", error);
        this.isLoadingEspecialidades = false;
      },
    });
  }

  // Cargar TODOS los staff médicos al inicio
  cargarTodosLosStaffMedicos() {
    this.isLoadingStaffMedicos = true;
    this.staffMedicoService.all().subscribe({
      next: (dataPackage: DataPackage<StaffMedico[]>) => {
        this.staffMedicosCompletos = dataPackage.data || [];
        this.staffMedicos = [...this.staffMedicosCompletos];
        this.isLoadingStaffMedicos = false;
      },
      error: (error) => {
        console.error("Error cargando staff médicos:", error);
        this.isLoadingStaffMedicos = false;
      },
    });
  }

  // Cargar centros de atención
  cargarCentrosAtencion() {
    this.isLoadingCentros = true;
    this.centroAtencionService.all().subscribe({
      next: (dataPackage: any) => {
        this.centrosAtencionCompletos = dataPackage.data || [];
        this.centrosAtencion = [...this.centrosAtencionCompletos];
        this.isLoadingCentros = false;
      },
      error: (error) => {
        console.error("Error cargando centros de atención:", error);
        this.isLoadingCentros = false;
      },
    });
  }

  // Cargar pacientes
  cargarPacientes() {
    this.pacienteService.all().subscribe({
      next: (dataPackage: DataPackage<Paciente[]>) => {
        this.pacientesCompletos = dataPackage.data || [];
      },
      error: (error) => {
        console.error("Error cargando pacientes:", error);
      },
    });
  }

  // Cargar TODOS los turnos disponibles y ocupados al inicio
  cargarTodosLosTurnos() {
    this.isLoadingTurnos = true;

    // Llamar al servicio para obtener todos los eventos (slots y turnos)
    this.agendaService.obtenerTodosLosEventos(this.semanas).subscribe({
      next: (eventosBackend) => {
        // Guardar TODOS los slots
        this.slotsOriginales = this.mapEventosToSlots(eventosBackend);

        // Para operador, mostrar todos los turnos por defecto
        this.slotsDisponibles = [...this.slotsOriginales];
        this.showCalendar = true;

        // Agrupar y ordenar
        this.agruparSlotsPorFecha();

        this.isLoadingTurnos = false;
        this.cdr.detectChanges();

        console.log(
          "✅ Agenda del operador cargada:",
          this.slotsOriginales.length,
          "slots"
        );
      },
      error: (err: unknown) => {
        console.error("❌ Error al cargar la agenda:", err);
        this.isLoadingTurnos = false;
        this.showCalendar = false;
        this.slotsOriginales = [];
        this.slotsDisponibles = [];
      },
    });
  }

  // ==================== MÉTODOS DE FILTRADO ====================

  // Método llamado cuando cambia la especialidad
  onEspecialidadChange() {
    this.actualizarFiltrosDinamicos();
    this.aplicarFiltros();
  }

  // Método llamado cuando cambia el staff médico
  onStaffMedicoChange() {
    this.actualizarFiltrosDinamicos();
    this.aplicarFiltros();
  }

  // Método llamado cuando cambia el centro de atención
  onCentroAtencionChange() {
    this.actualizarFiltrosDinamicos();
    this.aplicarFiltros();
  }

  // Método llamado cuando cambia el estado
  onEstadoChange() {
    this.aplicarFiltros();
  }

  // Actualizar filtros dinámicamente basado en las selecciones actuales
  actualizarFiltrosDinamicos() {
    // Obtener las opciones disponibles desde los slots originales
    const especialidadesDisponibles = this.obtenerEspecialidadesDisponibles();
    const medicosDisponibles = this.obtenerMedicosDisponibles();
    const centrosDisponibles = this.obtenerCentrosDisponibles();

    // Actualizar especialidades
    if (this.staffMedicoSeleccionado || this.centroAtencionSeleccionado) {
      this.especialidades = this.especialidadesCompletas.filter((esp) =>
        especialidadesDisponibles.includes(esp.nombre)
      );
    } else {
      this.especialidades = [...this.especialidadesCompletas];
    }

    // Actualizar médicos
    if (this.especialidadSeleccionada || this.centroAtencionSeleccionado) {
      this.staffMedicos = this.staffMedicosCompletos.filter((staff) =>
        medicosDisponibles.some(
          (medico) => Number(medico.id) === Number(staff.id)
        )
      );
    } else {
      this.staffMedicos = [...this.staffMedicosCompletos];
    }

    // Actualizar centros
    if (this.especialidadSeleccionada || this.staffMedicoSeleccionado) {
      this.centrosAtencion = this.centrosAtencionCompletos.filter((centro) =>
        centrosDisponibles.some((c) => Number(c.id) === Number(centro.id))
      );
    } else {
      this.centrosAtencion = [...this.centrosAtencionCompletos];
    }
  }

  // Obtener especialidades disponibles basadas en los filtros actuales
  obtenerEspecialidadesDisponibles(): string[] {
    if (!this.slotsOriginales || this.slotsOriginales.length === 0) {
      return [];
    }

    let slotsRelevantes = [...this.slotsOriginales];

    if (this.staffMedicoSeleccionado) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) =>
          Number(slot.staffMedicoId) === Number(this.staffMedicoSeleccionado)
      );
    }

    if (this.centroAtencionSeleccionado) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) =>
          Number(slot.centroId) === Number(this.centroAtencionSeleccionado)
      );
    }

    const especialidades = [
      ...new Set(slotsRelevantes.map((slot) => slot.especialidadStaffMedico)),
    ];
    return especialidades.filter((esp) => esp && esp.trim());
  }

  // Obtener médicos disponibles basados en los filtros actuales
  obtenerMedicosDisponibles(): any[] {
    if (!this.slotsOriginales || this.slotsOriginales.length === 0) {
      return [];
    }

    let slotsRelevantes = [...this.slotsOriginales];

    if (this.especialidadSeleccionada) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) => slot.especialidadStaffMedico === this.especialidadSeleccionada
      );
    }

    if (this.centroAtencionSeleccionado) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) =>
          Number(slot.centroId) === Number(this.centroAtencionSeleccionado)
      );
    }

    const medicosUnicos = new Map();
    slotsRelevantes.forEach((slot) => {
      if (slot.staffMedicoId && !medicosUnicos.has(slot.staffMedicoId)) {
        medicosUnicos.set(slot.staffMedicoId, {
          id: slot.staffMedicoId,
          nombre: slot.staffMedicoNombre,
          apellido: slot.staffMedicoApellido,
        });
      }
    });

    return Array.from(medicosUnicos.values());
  }

  // Obtener centros disponibles basados en los filtros actuales
  obtenerCentrosDisponibles(): any[] {
    if (!this.slotsOriginales || this.slotsOriginales.length === 0) {
      return [];
    }

    let slotsRelevantes = [...this.slotsOriginales];

    if (this.especialidadSeleccionada) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) => slot.especialidadStaffMedico === this.especialidadSeleccionada
      );
    }

    if (this.staffMedicoSeleccionado) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) =>
          Number(slot.staffMedicoId) === Number(this.staffMedicoSeleccionado)
      );
    }

    const centrosUnicos = new Map();
    slotsRelevantes.forEach((slot) => {
      if (slot.centroId && !centrosUnicos.has(slot.centroId)) {
        centrosUnicos.set(slot.centroId, {
          id: slot.centroId,
          nombre: slot.nombreCentro,
        });
      }
    });

    return Array.from(centrosUnicos.values());
  }

  // Aplicar filtros a los slots
  aplicarFiltros() {
    let slotsFiltrados = [...this.slotsOriginales];

    // Filtrar por especialidad
    if (this.especialidadSeleccionada && this.especialidadSeleccionada.trim()) {
      slotsFiltrados = slotsFiltrados.filter(
        (slot) => slot.especialidadStaffMedico === this.especialidadSeleccionada
      );
    }

    // Filtrar por staff médico
    if (this.staffMedicoSeleccionado) {
      const staffMedicoIdBuscado = Number(this.staffMedicoSeleccionado);
      slotsFiltrados = slotsFiltrados.filter(
        (slot) => Number(slot.staffMedicoId) === staffMedicoIdBuscado
      );
    }

    // Filtrar por centro de atención
    if (this.centroAtencionSeleccionado) {
      const centroIdBuscado = Number(this.centroAtencionSeleccionado);
      slotsFiltrados = slotsFiltrados.filter(
        (slot) => Number(slot.centroId) === centroIdBuscado
      );
    }

    // Filtrar por estado
    if (this.estadoSeleccionado) {
      switch (this.estadoSeleccionado) {
        case "DISPONIBLE":
          slotsFiltrados = slotsFiltrados.filter(
            (slot) => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot)
          );
          break;
        case "PROGRAMADO":
        case "CONFIRMADO":
        case "REAGENDADO":
        case "CANCELADO":
        case "COMPLETO":
          slotsFiltrados = slotsFiltrados.filter(
            (slot) => slot.estadoTurno === this.estadoSeleccionado
          );
          break;
      }
    }

    // Actualizar las listas con los slots filtrados
    this.slotsDisponibles = slotsFiltrados;
    this.showCalendar = true;

    // Reagrupar y mostrar
    this.agruparSlotsPorFecha();
    this.cdr.detectChanges();

    console.log("🔍 Filtros aplicados:", {
      especialidad: this.especialidadSeleccionada,
      medico: this.staffMedicoSeleccionado,
      centro: this.centroAtencionSeleccionado,
      estado: this.estadoSeleccionado,
      resultados: slotsFiltrados.length,
    });
  }

  // ==================== MÉTODOS DE TRANSFORMACIÓN DE DATOS ====================

  // Transformar eventos del backend a slots
  private mapEventosToSlots(eventosBackend: any[]): SlotDisponible[] {
    const slots: SlotDisponible[] = [];

    eventosBackend.forEach((evento, index) => {
      // Validar que el evento tenga los datos necesarios
      if (!evento.fecha || !evento.horaInicio || !evento.horaFin) {
        return;
      }

      // Si es un slot disponible
      if (evento.esSlot) {
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
          ocupado: evento.ocupado || false,
          esSlot: true,
        };

        // Si está ocupado, agregar información del paciente
        if (evento.ocupado && evento.pacienteId) {
          slot.pacienteId = evento.pacienteId;
          slot.pacienteNombre = evento.pacienteNombre;
          slot.pacienteApellido = evento.pacienteApellido;
          slot.pacienteDni = evento.pacienteDni;
          slot.estadoTurno = evento.estadoTurno || "PROGRAMADO";
        }

        slots.push(slot);
      }
    });

    return slots;
  }

  // ==================== MÉTODOS DE INTERFAZ ====================

  // Seleccionar slot para ver detalles
  seleccionarSlot(slot: SlotDisponible, event?: MouseEvent) {
    this.slotSeleccionado = slot;
    this.showDetailsModal = true;
  }

  // Cerrar modal de detalles
  closeDetailsModal() {
    this.showDetailsModal = false;
    this.slotSeleccionado = null;
  }

  // Gestionar turno existente
  gestionarTurno() {
    if (!this.slotSeleccionado) return;

    // Navegar al módulo de gestión de turnos con el ID
    this.router.navigate(["/turnos"], {
      queryParams: {
        turnoId: this.slotSeleccionado.id,
        pacienteId: this.slotSeleccionado.pacienteId,
      },
    });
  }

  // Asignar paciente a slot disponible
  asignarTurno() {
    if (!this.slotSeleccionado) return;

    // Navegar al módulo de turnos para crear uno nuevo
    this.router.navigate(["/turnos"], {
      queryParams: {
        slotId: this.slotSeleccionado.id,
        fecha: this.slotSeleccionado.fecha,
        horaInicio: this.slotSeleccionado.horaInicio,
        horaFin: this.slotSeleccionado.horaFin,
        staffMedicoId: this.slotSeleccionado.staffMedicoId,
        accion: "crear",
      },
    });
  }

  // ==================== MÉTODOS DEL MAPA DE CENTROS ====================

  mostrarMapaCentros() {
    this.showMapaModal = true;
  }

  cerrarMapaModal() {
    this.showMapaModal = false;
  }

  onCentroSeleccionadoDelMapa(centro: CentroAtencion) {
    this.centroAtencionSeleccionado = centro.id || null;
    this.actualizarFiltrosDinamicos();
    this.aplicarFiltros();
    this.cerrarMapaModal();
  }

  // ==================== MÉTODOS DE NAVEGACIÓN ====================

  goBack() {
    this.router.navigate(["/operador-dashboard"]);
  }

  // ==================== MÉTODOS DE LIMPIEZA DE FILTROS ====================

  limpiarEspecialidad() {
    this.especialidadSeleccionada = "";
    this.onEspecialidadChange();
  }

  limpiarStaffMedico() {
    this.staffMedicoSeleccionado = null;
    this.onStaffMedicoChange();
  }

  limpiarCentroAtencion() {
    this.centroAtencionSeleccionado = null;
    this.onCentroAtencionChange();
  }

  limpiarEstado() {
    this.estadoSeleccionado = "";
    this.onEstadoChange();
  }

  limpiarTodosFiltros() {
    this.especialidadSeleccionada = "";
    this.staffMedicoSeleccionado = null;
    this.centroAtencionSeleccionado = null;
    this.estadoSeleccionado = "";

    // Para operador, mantener calendario visible con todos los turnos
    this.slotsDisponibles = [...this.slotsOriginales];
    this.showCalendar = true;
    this.agruparSlotsPorFecha();

    this.cdr.detectChanges();
  }

  // ==================== MÉTODOS AUXILIARES ====================

  // Verificar si hay filtros aplicados
  hayFiltrosAplicados(): boolean {
    return (
      (this.especialidadSeleccionada?.trim() ||
        this.staffMedicoSeleccionado ||
        this.centroAtencionSeleccionado ||
        this.estadoSeleccionado) !== null
    );
  }

  // Obtener nombres para mostrar
  getStaffMedicoNombre(id: number | null): string {
    if (!id) return "Cualquier médico";

    const staff = this.staffMedicos.find((s) => Number(s.id) === Number(id));
    if (staff && staff.medico) {
      return `${staff.medico.nombre} ${staff.medico.apellido}`;
    }

    const slotConMedico = this.slotsOriginales.find(
      (slot) => Number(slot.staffMedicoId) === Number(id)
    );
    if (
      slotConMedico &&
      slotConMedico.staffMedicoNombre &&
      slotConMedico.staffMedicoApellido
    ) {
      return `${slotConMedico.staffMedicoNombre} ${slotConMedico.staffMedicoApellido}`;
    }

    return "Médico no encontrado";
  }

  getCentroAtencionNombre(id: number | null): string {
    if (!id) return "Cualquier centro";

    const centro = this.centrosAtencion.find(
      (c) => Number(c.id) === Number(id)
    );
    if (!centro) {
      return "Centro no encontrado";
    }

    return centro.nombre || `Centro #${id}`;
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case "DISPONIBLE":
        return "Disponibles";
      case "PROGRAMADO":
        return "Programados";
      case "CONFIRMADO":
        return "Confirmados";
      case "REAGENDADO":
        return "Reagendados";
      case "CANCELADO":
        return "Cancelados";
      case "COMPLETO":
        return "Completados";
      default:
        return estado;
    }
  }

  // Obtener clase CSS para badges de estado
  getBadgeClass(estado?: string): string {
    switch (estado) {
      case "PROGRAMADO":
        return "bg-warning";
      case "CONFIRMADO":
        return "bg-success";
      case "REAGENDADO":
        return "bg-info";
      case "CANCELADO":
        return "bg-danger";
      case "COMPLETO":
        return "bg-secondary";
      default:
        return "bg-secondary";
    }
  }

  // ==================== MÉTODOS DE CONTEO Y ESTADÍSTICAS ====================

  // Contar turnos por estado
  contarTurnosPorEstado(estado: string): number {
    switch (estado) {
      case "DISPONIBLE":
        return this.slotsDisponibles.filter(
          (slot) => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot)
        ).length;
      case "OCUPADO":
        return this.slotsDisponibles.filter((slot) => slot.ocupado).length;
      default:
        return this.slotsDisponibles.filter(
          (slot) => slot.estadoTurno === estado
        ).length;
    }
  }

  // Contar turnos por fecha y estado
  contarTurnosPorFechaYEstado(fecha: string, estado: string): number {
    const slotsDelDia = this.slotsPorFecha[fecha] || [];

    switch (estado) {
      case "DISPONIBLE":
        return slotsDelDia.filter(
          (slot) => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot)
        ).length;
      case "OCUPADO":
        return slotsDelDia.filter((slot) => slot.ocupado).length;
      default:
        return slotsDelDia.filter((slot) => slot.estadoTurno === estado).length;
    }
  }

  // ==================== MÉTODOS PARA MANEJO DE FECHAS Y EXCEPCIONES ====================

  // Formatear fecha para mostrar
  formatearFecha(fecha: string): string {
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = fecha.split("-");
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const fechaObj = new Date(year, month, day);
      const opciones: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      return fechaObj.toLocaleDateString("es-ES", opciones);
    }

    const fechaObj = new Date(fecha + "T00:00:00");
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return fechaObj.toLocaleDateString("es-ES", opciones);
  }

  // Verificar si un slot específico está afectado por excepciones
  slotAfectadoPorExcepcion(slot: SlotDisponible): boolean {
    return this.diasExcepcionalesService.slotAfectadoPorExcepcion(slot);
  }

  getTipoExcepcion(
    fecha: string
  ): "FERIADO" | "ATENCION_ESPECIAL" | "MANTENIMIENTO" | null {
    return this.diasExcepcionalesService.getTipoExcepcion(fecha);
  }

  getTipoExcepcionLabel(fecha: string): string {
    const tipo = this.getTipoExcepcion(fecha);
    switch (tipo) {
      case "FERIADO":
        return "Feriado";
      case "MANTENIMIENTO":
        return "Mantenimiento";
      case "ATENCION_ESPECIAL":
        return "Atención Especial";
      default:
        return "Día Excepcional";
    }
  }

  getDescripcionExcepcion(fecha: string): string | null {
    return this.diasExcepcionalesService.getDescripcionExcepcion(fecha);
  }

  getIconoExcepcion(fecha: string): string {
    const tipo = this.getTipoExcepcion(fecha);
    switch (tipo) {
      case "FERIADO":
        return "🏛️";
      case "MANTENIMIENTO":
        return "🔧";
      case "ATENCION_ESPECIAL":
        return "⭐";
      default:
        return "⚠️";
    }
  }

  // Verificar si el médico ha cambiado respecto al slot anterior
  esCambioMedico(fecha: string, index: number): boolean {
    const slotsDelDia = this.slotsPorFecha[fecha];
    if (!slotsDelDia || index === 0) {
      return false;
    }

    const slotActual = slotsDelDia[index];
    const slotAnterior = slotsDelDia[index - 1];

    const medicoActual = `${slotActual.staffMedicoNombre} ${slotActual.staffMedicoApellido}`;
    const medicoAnterior = `${slotAnterior.staffMedicoNombre} ${slotAnterior.staffMedicoApellido}`;

    return medicoActual !== medicoAnterior;
  }

  // Obtener el nombre completo del médico de un slot
  getNombreMedico(slot: SlotDisponible): string {
    return `${slot.staffMedicoNombre} ${slot.staffMedicoApellido}`;
  }

  // Agrupar slots por fecha para mostrar en el calendario
  private agruparSlotsPorFecha() {
    this.slotsPorFecha = {};

    // Agrupar slots por fecha
    this.slotsDisponibles.forEach((slot) => {
      if (!this.slotsPorFecha[slot.fecha]) {
        this.slotsPorFecha[slot.fecha] = [];
      }
      this.slotsPorFecha[slot.fecha].push(slot);
    });

    // Ordenar fechas y slots dentro de cada fecha
    this.fechasOrdenadas = Object.keys(this.slotsPorFecha).sort();

    // Ordenar slots dentro de cada fecha por médico y luego por hora
    this.fechasOrdenadas.forEach((fecha) => {
      this.slotsPorFecha[fecha].sort((a, b) => {
        // Primero por médico
        const medicoA = `${a.staffMedicoNombre} ${a.staffMedicoApellido}`;
        const medicoB = `${b.staffMedicoNombre} ${b.staffMedicoApellido}`;
        if (medicoA !== medicoB) {
          return medicoA.localeCompare(medicoB);
        }
        // Luego por hora
        return a.horaInicio.localeCompare(b.horaInicio);
      });
    });
  }
}
