import { Component, OnInit, OnDestroy, ChangeDetectorRef, LOCALE_ID } from "@angular/core";
import { CommonModule, registerLocaleData } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Services
import { TurnoService } from "../turnos/turno.service";
import { EspecialidadService } from "../especialidades/especialidad.service";
import { StaffMedicoService } from "../staffMedicos/staffMedico.service";
import { CentroAtencionService } from "../centrosAtencion/centroAtencion.service";
import { AgendaService } from "../agenda/agenda.service";
import { DiasExcepcionalesService } from "../agenda/dias-excepcionales.service";
import { DeepLinkService } from "../services/deep-link.service";
import { AuthService, Role } from "../inicio-sesion/auth.service";
import { UserContextService } from "../services/user-context.service";
import { CentrosMapaModalComponent } from "../modal/centros-mapa-modal.component";
import { Turno } from "../turnos/turno";
import { Especialidad } from "../especialidades/especialidad";
import { StaffMedico } from "../staffMedicos/staffMedico";
import { CentroAtencion } from "../centrosAtencion/centroAtencion";
import { DataPackage } from "../data.package";
import localeEsAr from "@angular/common/locales/es-AR";

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
}

registerLocaleData(localeEsAr);

@Component({
  selector: "app-paciente-agenda",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, CentrosMapaModalComponent],
  templateUrl: "./paciente-agenda.component.html",
  styleUrl: "./paciente-agenda.component.css", 
  providers: [
    { provide: LOCALE_ID, useValue: "es-AR" } // 👈 Fuerza locale en este componente
  ]
})
export class PacienteAgendaComponent implements OnInit, OnDestroy {
  // 🔥 FORMULARIO REACTIVO - ÚNICA FUENTE DE VERDAD
  filtrosForm!: FormGroup;

  // Estado de autenticación
  estaAutenticado: boolean = false;

  // Estados de carga
  isLoadingTurnos = false;
  isLoadingEspecialidades = false;
  isLoadingStaffMedicos = false;
  isLoadingCentros = false;

  // 🗑️ DEPRECATED: Ya no usar estas variables directamente, usar filtrosForm
  // especialidadSeleccionada = "";
  // staffMedicoSeleccionado: number | null = null;
  // centroAtencionSeleccionado: number | null = null;

  // Listas completas (sin filtrar)
  especialidadesCompletas: Especialidad[] = [];
  staffMedicosCompletos: StaffMedico[] = [];
  centrosAtencionCompletos: CentroAtencion[] = [];

  // Listas filtradas que se muestran en los dropdowns
  especialidades: Especialidad[] = [];
  staffMedicos: StaffMedico[] = [];
  centrosAtencion: CentroAtencion[] = [];

  // Slots y calendario
  showCalendar = false;
  filtrosAplicados = false; // Indica si se aplicaron filtros (para mostrar mensajes)
  slotsOriginales: SlotDisponible[] = []; // Slots sin filtrar del backend
  slotsDisponibles: SlotDisponible[] = []; // Slots filtrados que se muestran
  slotsPorFecha: { [fecha: string]: SlotDisponible[] } = {};
  fechasOrdenadas: string[] = [];
  turnosDisponibles: any[] = []; // Para compatibilidad con el template
  semanas: number = 4;

  // Modal de reserva
  showBookingModal = false;
  slotSeleccionado: SlotDisponible | null = null;
  selectedTurnoDisponible: any = null; // Para el modal
  isBooking = false;

  // Modal de mapa de centros
  showMapaModal = false;
  // Para Filtrar
  textoBusqueda: string = '';

  // Agrupación por médico para vista compacta
  medicosSlotsAgrupados: Map<string, SlotDisponible[]> = new Map();
  medicosExpandidos: Set<string> = new Set();
  diasExpandidos: Map<string, Set<string>> = new Map(); // medicoKey -> Set de fechas expandidas

  // Paginación
  paginaActual: number = 1;
  medicosPorPagina: number = 5; // Cantidad de médicos a mostrar por página

  // Propiedades cacheadas para evitar re-cálculos en cada change detection
  medicosPaginadosCache: Array<{ key: string; value: SlotDisponible[] }> = [];
  totalPaginasCache: number = 0;
  rangoPaginacionCache: string = '';

  constructor(
    private fb: FormBuilder,
    private turnoService: TurnoService,
    private especialidadService: EspecialidadService,
    private staffMedicoService: StaffMedicoService,
    private centroAtencionService: CentroAtencionService,
    private agendaService: AgendaService,
    private diasExcepcionalesService: DiasExcepcionalesService,
    private deepLinkService: DeepLinkService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private userContextService: UserContextService
  ) { }

  // 🎯 GETTERS para mantener compatibilidad con el template durante la migración
  get especialidadSeleccionada(): string {
    return this.filtrosForm?.get('especialidad')?.value || '';
  }
  
  set especialidadSeleccionada(value: string) {
    this.filtrosForm?.patchValue({ especialidad: value });
  }

  get staffMedicoSeleccionado(): number | null {
    return this.filtrosForm?.get('medico')?.value || null;
  }
  
  set staffMedicoSeleccionado(value: number | null) {
    this.filtrosForm?.patchValue({ medico: value });
  }

  get centroAtencionSeleccionado(): number | null {
    return this.filtrosForm?.get('centroAtencion')?.value || null;
  }
  
  set centroAtencionSeleccionado(value: number | null) {
    this.filtrosForm?.patchValue({ centroAtencion: value });
  }

  ngOnInit() {
    // PASO 1: Inicializar formulario reactivo - ÚNICA FUENTE DE VERDAD
    this.filtrosForm = this.fb.group({
      centroAtencion: [null],
      especialidad: [''],
      medico: [null],
      filtrarPorPreferencia: [false] // Filtro de preferencias horarias del paciente
    });

    // PASO 2: Configurar suscripciones reactivas a cambios en filtros
    this.configurarSuscripcionesFiltros();

    // Verificar estado de autenticación
    this.estaAutenticado = this.authService.isAuthenticated();
    console.log('🔐 Estado de autenticación:', this.estaAutenticado ? 'Autenticado' : 'Anónimo');

    // PASO 3: Leer parámetro centroId de la URL si existe y actualizar el FORMULARIO
    const centroIdParam = this.route.snapshot.queryParamMap.get('centroId');
    if (centroIdParam) {
      const centroId = parseInt(centroIdParam, 10);
      this.filtrosForm.patchValue({ centroAtencion: centroId }, { emitEvent: false }); // No emitir evento todavía
      console.log('🏥 Centro seleccionado desde URL:', centroId);
    }

    // PASO 4: Cargar todos los datos necesarios al inicio
    this.cargarDiasExcepcionales();
    this.cargarEspecialidades();
    this.cargarTodosLosStaffMedicos();
    this.cargarCentrosAtencion();
    
    // PASO 5: Cargar turnos - MÉTODO CENTRALIZADO
    this.cargarTurnos();

    // Verificar si hay contexto de deep link (usuario viene desde un email)
    this.aplicarContextoDeepLink();

    // Listener para reposicionar modal en resize
    this.resizeListener = () => {
      if (this.showBookingModal) {
        this.modalPosition = {
          top: window.innerWidth <= 768 ? window.innerHeight / 2 - 200 : (window.innerHeight - 400) / 2,
          left: window.innerWidth <= 768 ? window.innerWidth / 2 - 200 : (window.innerWidth - 500) / 2,
        };
      }
    };
    window.addEventListener("resize", this.resizeListener);
  }

  /**
   *  MÉTODO CLAVE: Configurar suscripciones a cambios en el formulario
   * Maneja dropdowns dependientes y filtrado automático
   */
  private configurarSuscripcionesFiltros(): void {
    // Cuando cambia el centro de atención
    this.filtrosForm.get('centroAtencion')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(centroId => {
        console.log('🏥 Centro cambió a:', centroId);
        
        // Limpiar selecciones dependientes
        this.filtrosForm.patchValue({
          especialidad: '',
          medico: null
        }, { emitEvent: false });

        // Recargar listas dependientes
        this.actualizarListasFiltradasPorCentro(centroId);
        
        // Recargar turnos con el nuevo filtro
        this.cargarTurnos();
      });

    // Cuando cambia la especialidad
    this.filtrosForm.get('especialidad')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(especialidad => {
        console.log('🩺 Especialidad cambió a:', especialidad);
        
        // Limpiar médico seleccionado
        this.filtrosForm.patchValue({ medico: null }, { emitEvent: false });
        
        // Recargar lista de médicos
        this.actualizarListaMedicos();
        
        // Recargar turnos con el nuevo filtro
        this.cargarTurnos();
      });

    // Cuando cambia el médico
    this.filtrosForm.get('medico')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(medicoId => {
        console.log('👨‍⚕️ Médico cambió a:', medicoId);
        
        // Recargar turnos con el nuevo filtro
        this.cargarTurnos();
      });
  }

  /**
   *  MÉTODO CENTRAL: Cargar turnos según estado de autenticación y filtros actuales
   * Esta es la ÚNICA función que debe llamar al backend para obtener turnos
   */
  private cargarTurnos(): void {
    this.isLoadingTurnos = true;
    const filtros = this.filtrosForm.value;

    console.log('� Cargando turnos con filtros:', filtros);

    if (this.estaAutenticado) {
      // Usuario autenticado: usar endpoint privado con filtros
      this.cargarTurnosPrivados(filtros);
    } else {
      // Usuario anónimo: usar endpoint público con filtros
      this.cargarTurnosPublicos(filtros);
    }
  }

  /**
   * Cargar turnos para usuarios autenticados
   */
  private cargarTurnosPrivados(filtros: any): void {
    const params: any = {};
    
    if (filtros.centroAtencion) {
      params.centroId = filtros.centroAtencion;
    }
    if (filtros.especialidad) {
      params.especialidad = filtros.especialidad;
    }
    if (filtros.medico) {
      params.staffMedicoId = filtros.medico;
    }
    
    // 🕐 Agregar filtro por preferencias horarias si está activado
    const filtrarPorPreferencia = filtros.filtrarPorPreferencia || false;
    if (filtrarPorPreferencia) {
      params.filtrarPorPreferencia = true;
      console.log('🕐 Filtrado por preferencias horarias ACTIVADO en agenda privada');
    }

    console.log('🔐 Cargando turnos privados con params:', params);

    this.agendaService.obtenerTodosLosEventos(this.semanas, params).subscribe({
      next: (eventos: any[]) => {
        console.log('✅ Turnos privados recibidos:', eventos.length);
        this.procesarEventosRecibidos(eventos);
      },
      error: (err: any) => {
        console.error('❌ Error cargando turnos privados:', err);
        this.manejarErrorCargaTurnos();
      }
    });
  }

  /**
   * Cargar turnos para usuarios anónimos (NO tiene filtro de preferencias)
   */
  private cargarTurnosPublicos(filtros: any): void {
    const params: any = {};
    
    if (filtros.centroAtencion) {
      params.centroId = filtros.centroAtencion;
    }
    if (filtros.especialidad) {
      params.especialidad = filtros.especialidad;
    }
    if (filtros.medico) {
      params.staffMedicoId = filtros.medico;
    }
    
    console.log('👤 Cargando turnos públicos con params:', params);

    this.agendaService.getAgendaPublica(
      params.centroId, 
      params.especialidad, 
      params.staffMedicoId
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Turnos públicos recibidos:', response);
        const eventos = response.data || response;
        
        const eventosMapeados = this.mapEventosToSlots(eventos);

        // Guardar y mostrar resultados
        this.slotsOriginales = eventosMapeados;
        this.slotsDisponibles = eventosMapeados;
        this.turnosDisponibles = eventosMapeados;
        this.showCalendar = eventosMapeados.length > 0;
        this.filtrosAplicados = true;
        
        this.agruparSlotsPorFecha();
        this.isLoadingTurnos = false;
        this.cdr.detectChanges();
        
        console.log('✅ Turnos públicos procesados. Total:', eventosMapeados.length);
      },
      error: (err: any) => {
        console.error('❌ Error cargando turnos públicos:', err);
        this.manejarErrorCargaTurnos();
      }
    });
  }

  /**
   * Procesar eventos recibidos del backend
   */
  private procesarEventosRecibidos(eventos: any[]): void {
    this.slotsOriginales = this.mapEventosToSlots(eventos);
    this.slotsDisponibles = [...this.slotsOriginales];
    this.turnosDisponibles = [...this.slotsOriginales];
    this.showCalendar = this.slotsDisponibles.length > 0;
    this.filtrosAplicados = true;

    this.agruparSlotsPorFecha();
    this.isLoadingTurnos = false;
    this.cdr.detectChanges();

    console.log('✅ Eventos procesados. Total disponibles:', this.slotsDisponibles.length);
  }

  /**
   * Manejar errores al cargar turnos
   */
  private manejarErrorCargaTurnos(): void {
    this.isLoadingTurnos = false;
    this.showCalendar = false;
    this.slotsOriginales = [];
    this.slotsDisponibles = [];
    this.turnosDisponibles = [];
    this.cdr.detectChanges();
  }

  /**
   * Actualizar listas filtradas cuando cambia el centro
   */
  private actualizarListasFiltradasPorCentro(centroId: number | null): void {
    if (!centroId) {
      // Si no hay centro seleccionado, mostrar todas las opciones
      this.especialidades = [...this.especialidadesCompletas];
      this.staffMedicos = [...this.staffMedicosCompletos];
      return;
    }

    // TODO: Aquí podrías hacer peticiones al backend para obtener
    // especialidades y médicos específicos del centro
    // Por ahora, usamos las listas completas
    this.especialidades = [...this.especialidadesCompletas];
    this.staffMedicos = [...this.staffMedicosCompletos];
  }

  /**
   * Actualizar lista de médicos basado en centro y especialidad
   */
  private actualizarListaMedicos(): void {
    const filtros = this.filtrosForm.value;
    
    // TODO: Filtrar médicos según especialidad y centro
    // Por ahora, mostrar todos
    this.staffMedicos = [...this.staffMedicosCompletos];
  }

  ngOnDestroy() {
    // Cleanup resize listener
    if (this.resizeListener) {
      window.removeEventListener("resize", this.resizeListener);
    }
  }

  // Cargar días excepcionales para el calendario
  cargarDiasExcepcionales() {
    // Los días excepcionales se extraen automáticamente de los eventos en cargarTurnosConFiltros()
    // No es necesaria una request adicional
    // Los días excepcionales se cargan automáticamente con los eventos
  }

  // Cargar especialidades al inicializar
  cargarEspecialidades() {
    this.isLoadingEspecialidades = true;
    this.especialidadService.all().subscribe({
      next: (dataPackage: DataPackage<Especialidad[]>) => {
        this.especialidadesCompletas = dataPackage.data || [];
        this.especialidades = [...this.especialidadesCompletas]; // Inicialmente mostrar todas
        this.isLoadingEspecialidades = false;
      },
      error: (error) => {
        this.isLoadingEspecialidades = false;
      },
    });
  }

  // Cargar TODOS los staff médicos al inicio (sin filtrar por especialidad)
  cargarTodosLosStaffMedicos() {
    this.isLoadingStaffMedicos = true;
    this.staffMedicoService.all().subscribe({
      next: (dataPackage: DataPackage<StaffMedico[]>) => {
        this.staffMedicosCompletos = dataPackage.data || [];
        this.staffMedicos = [...this.staffMedicosCompletos]; // Inicialmente mostrar todos

        this.isLoadingStaffMedicos = false;
      },
      error: (error) => {
        console.error("Error cargando staff médicos:", error);
        this.isLoadingStaffMedicos = false;
      },
    });
  }
  // Cargar TODOS los turnos disponibles al inicio (sin filtros)
  cargarTodosLosTurnos() {
    this.isLoadingTurnos = true;

    // Llamar al servicio sin filtros para obtener todos los eventos
    this.agendaService.obtenerTodosLosEventos(this.semanas).subscribe({
      next: (eventosBackend) => {
        // Guardar TODOS los slots sin filtrar
        this.slotsOriginales = this.mapEventosToSlots(eventosBackend);

        // NO mostrar los turnos hasta que se aplique algún filtro
        this.slotsDisponibles = [];
        this.turnosDisponibles = [];
        this.showCalendar = false; // NO mostrar calendario hasta que haya filtros

        this.isLoadingTurnos = false;
        this.cdr.detectChanges();

        console.log(
          "✅ Turnos cargados en memoria. Esperando filtros para mostrar."
        );
      },
      error: (err: unknown) => {
        console.error("❌ Error al cargar todos los turnos:", err);
        this.isLoadingTurnos = false;
        this.showCalendar = false;
        this.slotsOriginales = [];
        this.slotsDisponibles = [];
        this.turnosDisponibles = [];
      },
    });
  }

  /**
   * Cargar agenda pública (sin autenticación requerida)
   * Usa el endpoint público del backend
   */
  cargarAgendaPublica() {
    this.isLoadingTurnos = true;

    // Llamar al servicio público con el centroId si está disponible
    this.agendaService.getAgendaPublica(this.centroAtencionSeleccionado || undefined).subscribe({
      next: (response: any) => {
        console.log('📅 Agenda pública recibida:', response);
        
        // El backend puede devolver los eventos directamente o en un wrapper
        const eventosBackend = response.data || response;
        
        // Guardar TODOS los slots sin filtrar
        this.slotsOriginales = this.mapEventosToSlots(eventosBackend);

        // NO mostrar los turnos hasta que se aplique algún filtro
        this.slotsDisponibles = [];
        this.turnosDisponibles = [];
        this.showCalendar = false;

        this.isLoadingTurnos = false;
        this.cdr.detectChanges();

        console.log("✅ Agenda pública cargada. Esperando filtros para mostrar.");
      },
      error: (err: unknown) => {
        console.error("❌ Error al cargar agenda pública:", err);
        this.isLoadingTurnos = false;
        this.showCalendar = false;
        this.slotsOriginales = [];
        this.slotsDisponibles = [];
        this.turnosDisponibles = [];
      },
    });
  }

  /**
   * Método para seleccionar un turno cuando el usuario no está autenticado
   * Guarda el turno seleccionado y redirige al login
   */
  seleccionarTurno(turno: any) {
    console.log('📝 Usuario anónimo seleccionó turno:', turno);
    
    // Guardar información del turno en localStorage
    if (turno.id) {
      localStorage.setItem('turnoSeleccionadoId', turno.id.toString());
      console.log('💾 Turno guardado en localStorage:', turno.id);
    }
    
    // Redirigir al login
    console.log('🔄 Redirigiendo a login...');
    this.router.navigate(['/ingresar'], {
      queryParams: { returnUrl: '/paciente-agenda' }
    });
  }

  // Cargar staff médicos filtrados por especialidad
  cargarStaffMedicosPorEspecialidad() {
    if (!this.especialidadSeleccionada) return;

    this.isLoadingStaffMedicos = true;
    this.staffMedicoService.all().subscribe({
      next: (dataPackage: DataPackage<StaffMedico[]>) => {
        // Filtrar staff médicos que tengan la especialidad seleccionada
        this.staffMedicos = (dataPackage.data || []).filter(
          (staff) =>
            staff.especialidad?.nombre === this.especialidadSeleccionada
        );

        console.log(
          "🏥 Staff médicos cargados para especialidad:",
          this.especialidadSeleccionada
        );
        console.log(
          "- Total staff médicos filtrados:",
          this.staffMedicos.length
        );
        console.log(
          "- IDs de staff médicos:",
          this.staffMedicos.map((s) => ({
            id: s.id,
            nombre: s.medico?.nombre,
            apellido: s.medico?.apellido,
          }))
        );

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
        this.centrosAtencion = [...this.centrosAtencionCompletos]; // Inicialmente mostrar todos
        this.isLoadingCentros = false;
      },
      error: (error) => {
        console.error("Error cargando centros de atención:", error);
        this.isLoadingCentros = false;
      },
    });
  }
  
  /**
   * Verifica si el usuario tiene capacidades administrativas (staff médico u operador)
   * Gracias a la jerarquía de roles, ADMINISTRADOR hereda automáticamente OPERADOR y MEDICO
   */
  get esOperador(): boolean {
    return this.userContextService.hasAnyRole([Role.OPERADOR, Role.MEDICO]);
  }

  // 🗑️ DEPRECATED: Ya no es necesario, el formulario reactivo maneja los cambios automáticamente
  onEspecialidadChange() {
    // El FormGroup ya tiene suscripciones configuradas, no hacer nada aquí
  }

  // 🗑️ DEPRECATED: Ya no es necesario, el formulario reactivo maneja los cambios automáticamente
  onStaffMedicoChange() {
    // El FormGroup ya tiene suscripciones configuradas, no hacer nada aquí
  }

  // 🗑️ DEPRECATED: Ya no es necesario, el formulario reactivo maneja los cambios automáticamente
  onCentroAtencionChange() {
    // El FormGroup ya tiene suscripciones configuradas, no hacer nada aquí
  }

  // 🗑️ DEPRECATED: Ya no es necesario con el enfoque reactivo
  actualizarFiltrosDinamicos() {
    // Este método complejo ya no es necesario
    // El formulario reactivo maneja las dependencias automáticamente
  }

  // 🗑️ DEPRECATED: Estos métodos ya no son necesarios con el enfoque reactivo
  // Se mantienen solo para compatibilidad temporal
  // Obtener especialidades disponibles basadas en los filtros actuales
  obtenerEspecialidadesDisponibles(): string[] {
    if (!this.slotsOriginales || this.slotsOriginales.length === 0) {
      return [];
    }

    let slotsRelevantes = [...this.slotsOriginales];

    // Filtrar por médico si está seleccionado
    if (this.staffMedicoSeleccionado) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) =>
          Number(slot.staffMedicoId) === Number(this.staffMedicoSeleccionado)
      );
    }

    // Filtrar por centro si está seleccionado
    if (this.centroAtencionSeleccionado) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) =>
          Number(slot.centroId) === Number(this.centroAtencionSeleccionado)
      );
    }

    // Extraer especialidades únicas
    const especialidades = [
      ...new Set(slotsRelevantes.map((slot) => slot.especialidadStaffMedico)),
    ];
    const especialidadesFiltradas = especialidades.filter(
      (esp) => esp && esp.trim()
    );

    return especialidadesFiltradas;
  }

  // Obtener médicos disponibles basados en los filtros actuales
  obtenerMedicosDisponibles(): any[] {
    if (!this.slotsOriginales || this.slotsOriginales.length === 0) {
      return [];
    }

    let slotsRelevantes = [...this.slotsOriginales];

    // Filtrar por especialidad si está seleccionada
    if (this.especialidadSeleccionada) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) => slot.especialidadStaffMedico === this.especialidadSeleccionada
      );
    }

    // Filtrar por centro si está seleccionado
    if (this.centroAtencionSeleccionado) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) =>
          Number(slot.centroId) === Number(this.centroAtencionSeleccionado)
      );
    }

    // Extraer médicos únicos
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

    const medicosArray = Array.from(medicosUnicos.values());
    return medicosArray;
  }

  // Obtener centros disponibles basados en los filtros actuales
  obtenerCentrosDisponibles(): any[] {
    if (!this.slotsOriginales || this.slotsOriginales.length === 0) {
      return [];
    }

    let slotsRelevantes = [...this.slotsOriginales];

    // Filtrar por especialidad si está seleccionada
    if (this.especialidadSeleccionada) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) => slot.especialidadStaffMedico === this.especialidadSeleccionada
      );
    }

    // Filtrar por médico si está seleccionado
    if (this.staffMedicoSeleccionado) {
      slotsRelevantes = slotsRelevantes.filter(
        (slot) =>
          Number(slot.staffMedicoId) === Number(this.staffMedicoSeleccionado)
      );
    }

    // Extraer centros únicos
    const centrosUnicos = new Map();
    slotsRelevantes.forEach((slot) => {
      if (slot.centroId && !centrosUnicos.has(slot.centroId)) {
        centrosUnicos.set(slot.centroId, {
          id: slot.centroId,
          nombre: slot.nombreCentro,
        });
      }
    });

    const centrosArray = Array.from(centrosUnicos.values());

    // Debug para especialidades específicas (comentado - problema resuelto)
    // if (this.especialidadSeleccionada &&
    //     (this.especialidadSeleccionada.toLowerCase().includes('ginecol') ||
    //      this.especialidadSeleccionada === 'Medicina General')) {
    //   console.log(`🏥 [COMPONENTE PADRE] Centros disponibles para "${this.especialidadSeleccionada}":`);
    //   console.log('  - Slots originales totales:', this.slotsOriginales.length);
    //   console.log('  - Slots relevantes después de filtros:', slotsRelevantes.length);
    //   console.log('  - Centros únicos encontrados:', centrosArray.length);
    //   console.log('  - Lista de centros:', centrosArray.map(c => c.nombre));
    // }

    return centrosArray;
  }

  /**
   *  REFACTORIZADO: Método simplificado que solo dispara la recarga de turnos
   * El filtrado real ahora ocurre en el backend mediante cargarTurnos()
   */
  aplicarFiltros() {
    console.log('📋 aplicarFiltros() llamado - delegando a cargarTurnos()');
    this.cargarTurnos();
  }

  // Transformar eventos del backend a slots
  private mapEventosToSlots(eventosBackend: any[]): SlotDisponible[] {
    const slots: SlotDisponible[] = [];

    eventosBackend.forEach((evento, index) => {
      // Debug: mostrar algunos eventos para ver la estructura

      // Validar que el evento tenga los datos necesarios
      if (
        !evento.fecha ||
        !evento.horaInicio ||
        !evento.horaFin ||
        !evento.esSlot
      ) {
        if (index < 5) {
          console.log(`⚠️ Evento ${index + 1} descartado por falta datos:`, {
            fecha: evento.fecha,
            horaInicio: evento.horaInicio,
            horaFin: evento.horaFin,
            esSlot: evento.esSlot,
          });
        }
        return;
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
        ocupado: evento.ocupado || false,
        esSlot: true,
      };

      slots.push(slot);
    });

    return slots;
  }

  // Formatear fecha para mostrar
  formatearFecha(fecha: string): string {
    // Si es fecha en formato YYYY-MM-DD, parsear sin zona horaria para evitar desfases
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = fecha.split("-");
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Los meses en JS van de 0-11
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

    // Para otros formatos, usar el método original
    const fechaObj = new Date(fecha + "T00:00:00");
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return fechaObj.toLocaleDateString("es-ES", opciones);
  }

  // Variables para posicionamiento del modal (solo para el modal de reserva)
  modalPosition = { top: 0, left: 0 };
  private resizeListener?: () => void;

  // Seleccionar slot
  seleccionarSlot(slot: SlotDisponible, event?: MouseEvent) {
    if (slot.ocupado) {
      alert(
        "Este turno ya está ocupado. Por favor, selecciona otro horario disponible."
      );
      return;
    }

    // Verificar si el slot específico está afectado por una excepción
    if (this.slotAfectadoPorExcepcion(slot)) {
      const excepcionesDelDia =
        this.diasExcepcionalesService.getExcepcionesDelDia(slot.fecha);
      const excepcionAfectante = excepcionesDelDia?.find((exc) => {
        if (exc.tipo === "FERIADO") return true;
        if (
          (exc.tipo === "MANTENIMIENTO" || exc.tipo === "ATENCION_ESPECIAL") &&
          exc.horaInicio &&
          exc.horaFin
        ) {
          const inicioSlot = this.convertirHoraAMinutos(slot.horaInicio);
          const finSlot = this.convertirHoraAMinutos(slot.horaFin);
          const inicioExc = this.convertirHoraAMinutos(exc.horaInicio);
          const finExc = this.convertirHoraAMinutos(exc.horaFin);
          return inicioSlot < finExc && finSlot > inicioExc;
        }
        return false;
      });

      if (excepcionAfectante) {
        const tipoLabel =
          excepcionAfectante.tipo === "FERIADO"
            ? "Feriado"
            : excepcionAfectante.tipo === "MANTENIMIENTO"
              ? "Mantenimiento"
              : "Atención Especial";
        alert(
          `Este horario no está disponible por ${tipoLabel}. Por favor, selecciona otro horario.`
        );
      } else {
        alert(
          "Este horario no está disponible. Por favor, selecciona otro horario."
        );
      }
      return;
    }

    // Calcular posición del modal cerca del elemento clickeado
    if (event) {
      this.calculateModalPosition(event);
    }

    this.slotSeleccionado = slot;

    // Crear objeto compatible con el modal existente
    this.selectedTurnoDisponible = {
      start: new Date(`${slot.fecha}T${slot.horaInicio}`),
      end: new Date(`${slot.fecha}T${slot.horaFin}`),
      meta: {
        id: slot.id,
        especialidad: slot.especialidadStaffMedico,
        medico: `${slot.staffMedicoNombre} ${slot.staffMedicoApellido}`,
        centro: slot.nombreCentro,
        consultorio: slot.consultorioNombre,
        staffMedicoId: slot.staffMedicoId,
        staffMedicoNombre: slot.staffMedicoNombre,
        staffMedicoApellido: slot.staffMedicoApellido,
        especialidadStaffMedico: slot.especialidadStaffMedico,
        consultorioId: slot.consultorioId,
        consultorioNombre: slot.consultorioNombre,
        centroId: slot.centroId,
        centroAtencionNombre: slot.nombreCentro,
      },
    };

    this.showBookingModal = true;
    // Bloquear scroll del body cuando se abre el modal
    document.body.style.overflow = 'hidden';
  }

  // Calcular posición del modal cerca del elemento clickeado
  private calculateModalPosition(event: MouseEvent) {
    // En pantallas pequeñas, usar posicionamiento centrado
    if (window.innerWidth <= 768) {
      this.modalPosition = {
        top: window.innerHeight / 2 - 200,
        left: window.innerWidth / 2 - 200,
      };
      return;
    }

    const target = event.target as HTMLElement;
    const slotCard = target.closest(".slot-card") as HTMLElement;

    if (slotCard) {
      const rect = slotCard.getBoundingClientRect();
      const modalWidth = 500; // Ancho aproximado del modal
      const modalHeight = 400; // Alto aproximado del modal
      const offset = 10; // Offset desde el elemento

      // Calcular posición preferida (a la derecha del slot)
      let left = rect.right + offset;
      let top = rect.top;

      // Verificar si el modal se sale de la pantalla por la derecha
      if (left + modalWidth > window.innerWidth) {
        // Posicionar a la izquierda del slot
        left = rect.left - modalWidth - offset;
      }

      // Verificar si el modal se sale de la pantalla por la izquierda
      if (left < 0) {
        // Centrar horizontalmente en la pantalla
        left = (window.innerWidth - modalWidth) / 2;
      }

      // Verificar si el modal se sale de la pantalla por abajo
      if (top + modalHeight > window.innerHeight) {
        // Ajustar para que aparezca arriba
        top = window.innerHeight - modalHeight - offset;
      }

      // Verificar si el modal se sale de la pantalla por arriba
      if (top < 0) {
        top = offset;
      }

      this.modalPosition = { top, left };
    } else {
      // Fallback: centrar el modal
      this.modalPosition = {
        top: (window.innerHeight - 400) / 2,
        left: (window.innerWidth - 500) / 2,
      };
    }
  }

  // Navegación y otros métodos
  goBack() {
    this.router.navigate(["/paciente-dashboard"]);
  }

  // ==================== MÉTODOS DEL MAPA DE CENTROS ====================

  mostrarMapaCentros() {
    this.showMapaModal = true;
    this.cdr.detectChanges(); // Forzar detección de cambios para OnPush
  }

  cerrarMapaModal() {
    this.showMapaModal = false;
    this.cdr.detectChanges(); // Forzar detección de cambios para OnPush
  }

  onCentroSeleccionadoDelMapa(centro: CentroAtencion) {
    // Verificar que el centro tenga turnos disponibles
    const turnosEnCentro = this.slotsOriginales.filter(
      (slot) => Number(slot.centroId) === Number(centro.id)
    );

    if (turnosEnCentro.length === 0) {
      // No hay turnos en este centro
      alert(
        `❌ El centro "${centro.nombre}" no tiene turnos disponibles en este momento.\n\nPor favor, selecciona otro centro o intenta más tarde.`
      );
      return;
    }

    // Verificar si hay turnos compatibles con los filtros actuales
    let turnosCompatibles = [...turnosEnCentro];

    // Filtrar por especialidad si está seleccionada
    if (this.especialidadSeleccionada && this.especialidadSeleccionada.trim()) {
      turnosCompatibles = turnosCompatibles.filter(
        (slot) => slot.especialidadStaffMedico === this.especialidadSeleccionada
      );
    }

    // Filtrar por médico si está seleccionado
    if (this.staffMedicoSeleccionado) {
      turnosCompatibles = turnosCompatibles.filter(
        (slot) =>
          Number(slot.staffMedicoId) === Number(this.staffMedicoSeleccionado)
      );
    }

    if (turnosCompatibles.length === 0) {
      // Hay turnos en el centro pero no compatibles con los filtros actuales
      let mensaje = `⚠️ El centro "${centro.nombre}" tiene turnos disponibles, pero no coinciden con tus filtros actuales:\n\n`;

      if (this.especialidadSeleccionada) {
        mensaje += `• Especialidad seleccionada: ${this.especialidadSeleccionada}\n`;
      }

      if (this.staffMedicoSeleccionado) {
        const nombreMedico = this.getStaffMedicoNombre(
          this.staffMedicoSeleccionado
        );
        mensaje += `• Médico seleccionado: ${nombreMedico}\n`;
      }

      mensaje += `\n¿Deseas limpiar los filtros y buscar solo en este centro?`;

      if (confirm(mensaje)) {
        // Limpiar otros filtros y solo aplicar el centro
        this.especialidadSeleccionada = "";
        this.staffMedicoSeleccionado = null;
        this.centroAtencionSeleccionado = centro.id || null;

        // Actualizar filtros dinámicos y aplicar
        this.actualizarFiltrosDinamicos();
        this.aplicarFiltros();

        // Cerrar el modal
        this.cerrarMapaModal();

        alert(
          `✅ Mostrando ${turnosEnCentro.length} turnos disponibles en "${centro.nombre}"`
        );
      }
      return;
    }

    // Todo OK - aplicar el filtro del centro
    this.centroAtencionSeleccionado = centro.id || null;

    // Actualizar filtros dinámicos y aplicar
    this.actualizarFiltrosDinamicos();
    this.aplicarFiltros();

    // Cerrar el modal
    this.cerrarMapaModal();

    // Mostrar mensaje de confirmación
    alert(
      `✅ Encontrados ${turnosCompatibles.length} turnos disponibles en "${centro.nombre}"`
    );
  }

  // Actualizar slot reservado inmediatamente
  private actualizarSlotReservado(slotId: number) {
    // Encontrar el slot en el array y marcarlo como ocupado
    const slotEncontrado = this.slotsDisponibles.find(
      (slot) => slot.id === slotId
    );

    if (slotEncontrado) {
      slotEncontrado.ocupado = true;

      // Reagrupar slots por fecha para actualizar la vista
      this.agruparSlotsPorFecha();

      // Forzar detección de cambios
      this.cdr.detectChanges();
    }
  }

  // Confirmar reserva de turno
  confirmarReservaTurno() {
    if (!this.selectedTurnoDisponible || !this.slotSeleccionado) return;

    const pacienteId = localStorage.getItem("pacienteId");
    if (!pacienteId) {
      alert(
        "Error: No se encontró la información del paciente. Por favor, inicie sesión nuevamente."
      );
      return;
    }

    this.isBooking = true;

    const turnoDTO = {
      id: this.slotSeleccionado.id,
      fecha: this.slotSeleccionado.fecha,
      horaInicio: this.slotSeleccionado.horaInicio,
      horaFin: this.slotSeleccionado.horaFin,
      pacienteId: parseInt(pacienteId),
      staffMedicoId: this.slotSeleccionado.staffMedicoId,
      staffMedicoNombre: this.slotSeleccionado.staffMedicoNombre,
      staffMedicoApellido: this.slotSeleccionado.staffMedicoApellido,
      especialidadStaffMedico: this.slotSeleccionado.especialidadStaffMedico,
      consultorioId: this.slotSeleccionado.consultorioId,
      consultorioNombre: this.slotSeleccionado.consultorioNombre,
      centroId: this.slotSeleccionado.centroId,
      nombreCentro: this.slotSeleccionado.nombreCentro,
      estado: "PROGRAMADO",
    };

    console.log("Enviando turno DTO:", turnoDTO);

    this.http.post(`/rest/turno/asignar`, turnoDTO).subscribe({
      next: () => {
        alert("¡Turno reservado exitosamente!");

        // Actualizar inmediatamente el slot en el array local
        this.actualizarSlotReservado(this.slotSeleccionado!.id);

        this.closeBookingModal();

        // Recargar los turnos para obtener datos actualizados del servidor
        setTimeout(() => {
          this.cargarTodosLosTurnos();
        }, 500);
      },
      error: (err: any) => {
        console.error("Error al reservar el turno:", err);
        alert("No se pudo reservar el turno. Intente nuevamente.");
        this.isBooking = false;
      },
    });
  }

  // Cerrar modal de reserva
  closeBookingModal() {
    this.showBookingModal = false;
    this.selectedTurnoDisponible = null;
    this.slotSeleccionado = null;
    this.isBooking = false;
    // Restaurar scroll del body cuando se cierra el modal
    document.body.style.overflow = 'auto';
  }

  // Métodos de limpieza de filtros
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

  /**
   * 🔥 REFACTORIZADO: Limpiar todos los filtros usando el formulario reactivo
   */
  limpiarTodosFiltros() {
    // Resetear el formulario reactivo - ÚNICA FUENTE DE VERDAD
    this.filtrosForm.reset({
      centroAtencion: null,
      especialidad: '',
      medico: null
    }, { emitEvent: false }); // No emitir eventos para evitar múltiples llamadas

    // Limpiar los query params de la URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: ''
    });

    // Resetear estado visual
    this.filtrosAplicados = false;
    this.slotsDisponibles = [];
    this.turnosDisponibles = [];
    this.showCalendar = false;
    this.slotsPorFecha = {};
    this.fechasOrdenadas = [];
    this.medicosSlotsAgrupados = new Map();
    
    // Actualizar cache de paginación
    this.actualizarCachePaginacion();

    // Cargar todos los turnos sin filtros
    this.cargarTurnos();

    this.cdr.detectChanges();
  }

  // Métodos auxiliares para obtener nombres
  getStaffMedicoNombre(id: number | null): string {
    if (!id) return "Cualquier médico";

    // Mostrar todos los IDs disponibles

    // Convertir ambos valores a number para asegurar comparación correcta
    const staff = this.staffMedicos.find((s) => Number(s.id) === Number(id));
    if (staff && staff.medico) {
      return `${staff.medico.nombre} ${staff.medico.apellido}`;
    }

    // Si no encontramos el staff médico, buscar en los slots disponibles
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

    console.warn("❌ Staff médico no encontrado con ID:", id);
    console.log(
      "Estructuras de staff médicos:",
      this.staffMedicos.map((s) => ({
        id: s.id,
        tipo: typeof s.id,
        medicoId: s.medicoId,
        medico: s.medico,
      }))
    );
    return "Médico no encontrado";
  }

  getCentroAtencionNombre(id: number | null): string {
    if (!id) return "Cualquier centro";

    // Convertir ambos valores a number para asegurar comparación correcta
    const centro = this.centrosAtencion.find(
      (c) => Number(c.id) === Number(id)
    );
    if (!centro) {
      console.warn("❌ Centro no encontrado con ID:", id);
      return "Centro no encontrado";
    }

    return centro.nombre || `Centro #${id}`;
  }

  // Métodos para manejo de días excepcionales
  esDiaExcepcional(fecha: string): boolean {
    return this.diasExcepcionalesService.esDiaExcepcional(fecha);
  }

  // Verificar si un slot específico está afectado por excepciones - Usa servicio centralizado
  slotAfectadoPorExcepcion(slot: SlotDisponible): boolean {
    return this.diasExcepcionalesService.slotAfectadoPorExcepcion(slot);
  }

  // Función auxiliar para convertir hora "HH:mm" a minutos desde medianoche
  convertirHoraAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return horas * 60 + minutos;
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

  // Agrupar slots por fecha para mostrar en el calendario
  private agruparSlotsPorFecha() {
    this.slotsPorFecha = {};
    this.medicosSlotsAgrupados = new Map();
    this.paginaActual = 1; // Resetear paginación

    // Agrupar slots por fecha
    this.slotsDisponibles.forEach((slot) => {
      if (!this.slotsPorFecha[slot.fecha]) {
        this.slotsPorFecha[slot.fecha] = [];
      }
      this.slotsPorFecha[slot.fecha].push(slot);

      // Agrupar por médico para vista compacta
      const medicoKey = `${slot.staffMedicoId}-${slot.staffMedicoNombre}-${slot.staffMedicoApellido}`;
      if (!this.medicosSlotsAgrupados.has(medicoKey)) {
        this.medicosSlotsAgrupados.set(medicoKey, []);
      }
      this.medicosSlotsAgrupados.get(medicoKey)!.push(slot);
    });

    // Ordenar fechas y slots dentro de cada fecha
    this.fechasOrdenadas = Object.keys(this.slotsPorFecha).sort();

    // Ordenar slots dentro de cada fecha por hora
    this.fechasOrdenadas.forEach((fecha) => {
      this.slotsPorFecha[fecha].sort((a, b) => {
        const medicoA = `${a.staffMedicoNombre} ${a.staffMedicoApellido}`;
        const medicoB = `${b.staffMedicoNombre} ${b.staffMedicoApellido}`;
        if (medicoA !== medicoB) {
          return medicoA.localeCompare(medicoB);
        }
        return a.horaInicio.localeCompare(b.horaInicio);
      });
    });

    // Ordenar slots por médico (por fecha y hora)
    this.medicosSlotsAgrupados.forEach((slots) => {
      slots.sort((a, b) => {
        if (a.fecha !== b.fecha) {
          return a.fecha.localeCompare(b.fecha);
        }
        return a.horaInicio.localeCompare(b.horaInicio);
      });
    });

    // Actualizar cache de paginación después de agrupar
    this.actualizarCachePaginacion();
  }

  /**
   * Actualiza las propiedades cacheadas de paginación para evitar re-cálculos
   * en cada ciclo de detección de cambios
   */
  private actualizarCachePaginacion() {
    // Calcular total de páginas
    const totalMedicos = this.medicosSlotsAgrupados.size;
    this.totalPaginasCache = Math.ceil(totalMedicos / this.medicosPorPagina);

    // Calcular médicos paginados
    const todosLosMedicos = Array.from(this.medicosSlotsAgrupados.entries()).map(([key, value]) => ({
      key,
      value
    }));
    const inicio = (this.paginaActual - 1) * this.medicosPorPagina;
    const fin = inicio + this.medicosPorPagina;
    this.medicosPaginadosCache = todosLosMedicos.slice(inicio, fin);

    // Calcular rango de paginación
    const inicioRango = (this.paginaActual - 1) * this.medicosPorPagina + 1;
    const finRango = Math.min(this.paginaActual * this.medicosPorPagina, totalMedicos);
    this.rangoPaginacionCache = `${inicioRango}-${finRango} de ${totalMedicos}`;
  }

  filtrarPorBusqueda() {
    if (!this.textoBusqueda || this.textoBusqueda.trim() === '') {
      // Si no hay texto de búsqueda, aplicar filtros normales
      this.aplicarFiltros();
      return;
    }

    const textoBuscar = this.textoBusqueda.toLowerCase().trim();

    // Filtrar slots que coincidan con el texto de búsqueda
    let slotsFiltrados = this.slotsOriginales.filter(slot => {
      const nombreCompleto = `${slot.staffMedicoNombre} ${slot.staffMedicoApellido}`.toLowerCase();
      const especialidad = slot.especialidadStaffMedico.toLowerCase();

      return nombreCompleto.includes(textoBuscar) || especialidad.includes(textoBuscar);
    });

    // Aplicar filtros adicionales si están seleccionados
    if (this.centroAtencionSeleccionado) {
      slotsFiltrados = slotsFiltrados.filter(
        slot => Number(slot.centroId) === Number(this.centroAtencionSeleccionado)
      );
    }

    // Actualizar resultados
    this.slotsDisponibles = slotsFiltrados;
    this.turnosDisponibles = slotsFiltrados;
    this.showCalendar = true;

    // Reagrupar y mostrar
    this.agruparSlotsPorFecha();
    this.cdr.detectChanges();
  }

  limpiarBusqueda() {
    this.textoBusqueda = '';
    this.aplicarFiltros();
  }




  // Métodos para vista compacta por médico
  toggleMedicoExpansion(medicoKey: string) {
    if (this.medicosExpandidos.has(medicoKey)) {
      this.medicosExpandidos.delete(medicoKey);
    } else {
      this.medicosExpandidos.add(medicoKey);
    }
  }

  isMedicoExpandido(medicoKey: string): boolean {
    return this.medicosExpandidos.has(medicoKey);
  }

  getMedicoInfo(medicoKey: string): { nombre: string; apellido: string; id: number } {
    const [id, nombre, apellido] = medicoKey.split('-');
    return { id: parseInt(id), nombre, apellido };
  }

  getTurnosDisponiblesPorMedico(slots: SlotDisponible[]): number {
    return slots.filter(slot => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot)).length;
  }

  getCentrosUnicos(slots: SlotDisponible[]): string[] {
    const centros = new Set(slots.map(slot => slot.nombreCentro));
    return Array.from(centros);
  }

  // Agrupar slots de un médico por fecha
  agruparSlotsPorDia(slots: SlotDisponible[]): Map<string, SlotDisponible[]> {
    const slotsPorDia = new Map<string, SlotDisponible[]>();

    slots.forEach(slot => {
      if (!slotsPorDia.has(slot.fecha)) {
        slotsPorDia.set(slot.fecha, []);
      }
      slotsPorDia.get(slot.fecha)!.push(slot);
    });

    // Ordenar los slots dentro de cada día por hora
    slotsPorDia.forEach(slotsDelDia => {
      slotsDelDia.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    });

    return slotsPorDia;
  }

  // Obtener fechas ordenadas de los slots de un médico
  getFechasOrdenadas(slots: SlotDisponible[]): string[] {
    const fechas = new Set(slots.map(slot => slot.fecha));
    return Array.from(fechas).sort();
  }

  // Toggle expansión de un día para un médico
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

  // Verificar si un día está expandido para un médico
  isDiaExpandido(medicoKey: string, fecha: string): boolean {
    const diasSet = this.diasExpandidos.get(medicoKey);
    return diasSet ? diasSet.has(fecha) : false;
  }

  // Obtener slots de un día específico para un médico
  getSlotsPorDia(slots: SlotDisponible[], fecha: string): SlotDisponible[] {
    return slots.filter(slot => slot.fecha === fecha)
               .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  // Contar turnos disponibles por día
  getTurnosDisponiblesPorDia(slots: SlotDisponible[]): number {
    return slots.filter(slot => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot)).length;
  }

  // Obtener el primer turno de un día
  getPrimerTurnoDia(slots: SlotDisponible[]): SlotDisponible | null {
    const slotsOrdenados = slots
      .filter(slot => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot))
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    return slotsOrdenados.length > 0 ? slotsOrdenados[0] : null;
  }

  getEspecialidadesUnicas(slots: SlotDisponible[]): string[] {
    const especialidades = new Set(slots.map(slot => slot.especialidadStaffMedico));
    return Array.from(especialidades);
  }

  // Métodos de paginación (ahora retornan valores cacheados)
  getTotalPaginas(): number {
    return this.totalPaginasCache;
  }

  getMedicosEntries(): Array<{ key: string; value: SlotDisponible[] }> {
    return Array.from(this.medicosSlotsAgrupados.entries()).map(([key, value]) => ({
      key,
      value
    }));
  }

  getMedicosPaginados(): Array<{ key: string; value: SlotDisponible[] }> {
    return this.medicosPaginadosCache;
  }

  cambiarPagina(nuevaPagina: number) {
    const totalPaginas = this.totalPaginasCache;
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      this.paginaActual = nuevaPagina;
      
      // Actualizar cache de paginación
      this.actualizarCachePaginacion();

      // Scroll suave al inicio de la lista de médicos
      setTimeout(() => {
        const elemento = document.querySelector('.medicos-lista-compacta');
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  getRangoPaginacion(): string {
    return this.rangoPaginacionCache;
  }

  getNumeroPaginas(): number[] {
    const total = this.getTotalPaginas();
    return Array.from({ length: total }, (_, i) => i + 1);
  }


  getProximoTurno(slots: SlotDisponible[]): SlotDisponible | null {
    const disponibles = slots.filter(slot => !slot.ocupado && !this.slotAfectadoPorExcepcion(slot));
    return disponibles.length > 0 ? disponibles[0] : null;
  }

  /**
   * Aplica el contexto de deep link si existe
   * Maneja confirmación automática desde email y muestra modal de éxito
   */
  private aplicarContextoDeepLink(): void {
    // Verificar si hay un turno confirmado desde el deep-link
    const turnoConfirmadoStr = sessionStorage.getItem('turno_confirmado');
    if (turnoConfirmadoStr) {
      try {
        const turnoConfirmado = JSON.parse(turnoConfirmadoStr);
        console.log('✅ Turno confirmado desde email:', turnoConfirmado);
        
        // Mostrar modal de éxito
        this.mostrarModalConfirmacionExitosa(turnoConfirmado.mensaje);
        
        // Limpiar el flag
        sessionStorage.removeItem('turno_confirmado');
      } catch (e) {
        console.error('Error al parsear turno_confirmado:', e);
      }
    }
    
    const context = this.deepLinkService.getContext();

    if (!context) {
      return; // No hay contexto, no hacer nada
    }

    console.log('Contexto de deep link disponible:', context);

    // TODO: Implementar pre-selección automática de filtros
    // Funcionalidad pendiente:
    // - Pre-seleccionar especialidad por ID o nombre
    // - Pre-seleccionar centro de atención por ID
    // - Pre-seleccionar médico por ID
    // - Aplicar filtros automáticamente
    // - Mostrar mensaje contextual según el tipo (CANCELACION, CONFIRMACION, etc.)

    // Mensajes informativos según tipo
    if (context.tipo === 'CANCELACION') {
      console.log('Su turno fue cancelado. Agenda disponible para reagendar.');
    } else if (context.tipo === 'CONFIRMACION') {
      console.log('Acceso desde confirmación de turno.');
    }

    // Limpiar el contexto después de usarlo
    this.deepLinkService.clearContext();
  }

  /**
   * Muestra un modal de confirmación exitosa
   */
  private mostrarModalConfirmacionExitosa(mensaje: string): void {
    // Crear modal temporal con Bootstrap
    const modalHtml = `
      <div class="modal fade" id="confirmacionExitosaModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title">
                <i class="fas fa-check-circle me-2"></i>
                ¡Turno Confirmado!
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center py-4">
              <i class="fas fa-calendar-check text-success mb-3" style="font-size: 4rem;"></i>
              <p class="fs-5 mb-3">${mensaje}</p>
              <p class="text-muted">Puedes ver todos tus turnos en esta página.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                <i class="fas fa-check me-2"></i>Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Insertar modal en el DOM
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv.firstElementChild!);
    
    // Mostrar modal usando Bootstrap
    const modalElement = document.getElementById('confirmacionExitosaModal');
    if (modalElement) {
      // @ts-ignore - Bootstrap está disponible globalmente
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      
      // Limpiar el modal del DOM cuando se cierre
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
      });
    }
  }
}
