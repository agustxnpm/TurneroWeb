import { Component, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbTypeaheadModule } from "@ng-bootstrap/ng-bootstrap";
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
} from "rxjs";

import { Consultorio, HorarioConsultorio } from "./consultorio";
import { CentroAtencion } from "../centrosAtencion/centroAtencion";
import { ConsultorioService } from "./consultorio.service";
import { CentroAtencionService } from "../centrosAtencion/centroAtencion.service";
import { ModalService } from "../modal/modal.service";

@Component({
  selector: "app-consultorio-detail",
  standalone: true,
  imports: [FormsModule, CommonModule, NgbTypeaheadModule],
  templateUrl: './consultorio-detail.component.html',
  styleUrl: './consultorio-detail.component.css' 
})
export class ConsultorioDetailComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  
  consultorio: Consultorio = {
    id: 0,
    numero: 0,
    nombre: "",
    especialidad: "",
    medicoAsignado: "",
    telefono: "",
    centroAtencion: {} as CentroAtencion,
  };
  centrosAtencion: CentroAtencion[] = [];
  selectedCentroAtencion!: CentroAtencion;
  modoEdicion = false;
  esNuevo = false;
  centroSearch = '';
  tipoHorario: 'general' | 'especifico' = 'general';

  // Parámetros de navegación de retorno
  fromCentro: string | null = null;
  returnTab: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private consultorioService: ConsultorioService,
    private centroAtencionService: CentroAtencionService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    // Capturar parámetros de navegación de retorno desde centro de atención
    this.fromCentro = this.route.snapshot.queryParamMap.get('fromCentro');
    this.returnTab = this.route.snapshot.queryParamMap.get('returnTab');

    const path = this.route.snapshot.routeConfig?.path;
    if (path === "consultorios/new") {
      // Nuevo consultorio
      this.modoEdicion = true;
      this.esNuevo = true;
      this.consultorio = {
        id: 0,
        numero: 0,
        nombre: "",
        especialidad: "",
        medicoAsignado: "",
        telefono: "",
        centroAtencion: {} as CentroAtencion,
        horaAperturaDefault: "",
        horaCierreDefault: ""
      };
      this.initializeWeeklySchedule();
      this.selectedCentroAtencion = undefined!;
    } else {
      // Edición o vista
      this.esNuevo = false;
      
      // Capturar parámetros de navegación de retorno también en modo edición
      this.fromCentro = this.route.snapshot.queryParamMap.get('fromCentro');
      this.returnTab = this.route.snapshot.queryParamMap.get('returnTab');
      
      this.route.queryParams.subscribe(params => {
        this.modoEdicion = params['edit'] === 'true';
      });
      this.loadConsultorio();
    }
    this.getCentrosAtencion();
  }

  /**
   * Inicializa los horarios semanales con valores por defecto
   * Solo debe usarse cuando no hay horarios por defecto definidos
   */
  private initializeWeeklySchedule(): void {
    const diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
    
    // Usar los horarios por defecto del consultorio si existen, sino usar hardcodeados
    const horaApertura = this.consultorio.horaAperturaDefault || "08:00";
    const horaCierre = this.consultorio.horaCierreDefault || "17:00";
    
    this.consultorio.horariosSemanales = diasSemana.map(dia => ({
      diaSemana: dia,
      horaApertura: horaApertura,
      horaCierre: horaCierre,
      activo: dia !== 'SABADO' && dia !== 'DOMINGO' // Activo de lunes a viernes por defecto
    }));
    
    console.log('Horarios semanales inicializados:', this.consultorio.horariosSemanales);
  }

  /**
   * Valida que los horarios sean consistentes según el tipo seleccionado
   */
  private validateSchedule(): boolean {
    if (this.tipoHorario === 'general') {
      // Validar horarios por defecto
      if (!this.consultorio.horaAperturaDefault || !this.consultorio.horaCierreDefault) {
        this.modalService.alert('Error de Validación', 'Debe configurar la hora de apertura y cierre general.');
        return false;
      }
      
      if (this.consultorio.horaAperturaDefault >= this.consultorio.horaCierreDefault) {
        this.modalService.alert('Error de Validación', 'La hora de apertura debe ser anterior a la hora de cierre.');
        return false;
      }
    } else if (this.tipoHorario === 'especifico') {
      // Validar horarios semanales
      if (!this.consultorio.horariosSemanales || this.consultorio.horariosSemanales.length === 0) {
        this.modalService.alert('Error de Validación', 'Debe configurar los horarios semanales.');
        return false;
      }

      const horariosActivos = this.consultorio.horariosSemanales.filter(h => h.activo);
      if (horariosActivos.length === 0) {
        this.modalService.alert('Error de Validación', 'Debe activar al menos un día de la semana.');
        return false;
      }

      for (const horario of horariosActivos) {
        if (!horario.horaApertura || !horario.horaCierre) {
          this.modalService.alert('Error de Validación', 
            `Debe configurar hora de apertura y cierre para ${horario.diaSemana}.`);
          return false;
        }
        
        if (horario.horaApertura >= horario.horaCierre) {
          this.modalService.alert('Error de Validación', 
            `En ${horario.diaSemana}: la hora de apertura debe ser anterior a la hora de cierre.`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Navega de vuelta según los parámetros de retorno
   */
  private navigateBack(): void {
    if (this.fromCentro && this.returnTab) {
      // Regresar al detalle del centro de atención con el tab específico
      this.router.navigate(['/centrosAtencion', this.fromCentro], {
        queryParams: { activeTab: this.returnTab } // Usar query param en lugar de fragment
      });
    } else if (this.fromCentro) {
      // Regresar al detalle del centro de atención sin tab específico
      this.router.navigate(['/centrosAtencion', this.fromCentro]);
    } else {
      // Regresar a la lista de consultorios por defecto
      this.router.navigate(['/consultorios']);
    }
  }

  goBack(): void {
    this.navigateBack();
  }

  save(): void {
    if (!this.selectedCentroAtencion?.id) {
      this.modalService.alert(
        "Error",
        "Debe seleccionar un Centro de Atención válido."
      );
      return;
    }

    // Validar horarios antes de guardar
    if (!this.validateSchedule()) {
      return;
    }

    // Asegurar que los datos del centro estén asignados
    this.consultorio.centroAtencion = this.selectedCentroAtencion;
    this.consultorio.centroId = this.selectedCentroAtencion.id;
    this.consultorio.nombreCentro = this.selectedCentroAtencion.nombre;

    // console.log('Horarios antes de procesar:', this.consultorio.horariosSemanales);
    // console.log('Horarios por defecto:', {
    //   apertura: this.consultorio.horaAperturaDefault,
    //   cierre: this.consultorio.horaCierreDefault
    // });

    // console.log('=== DEBUG: Procesando horarios según tipo:', this.tipoHorario);
    
    // Procesar según el tipo de horario seleccionado
    if (this.tipoHorario === 'general') {
      // Modo horario general: usar horarios por defecto y limpiar horarios específicos
      if (!this.consultorio.horaAperturaDefault || !this.consultorio.horaCierreDefault) {
        this.modalService.alert('Error', 'Debe configurar los horarios generales.');
        return;
      }
      
      // Limpiar horarios específicos en modo general
      this.consultorio.horariosSemanales = [];
      
    } else if (this.tipoHorario === 'especifico') {
      // Modo horario específico: usar horarios semanales y limpiar horarios por defecto
      const tieneHorariosActivos = this.consultorio.horariosSemanales?.some(h => h.activo);
      if (!tieneHorariosActivos) {
        this.modalService.alert('Error', 'Debe configurar al menos un día con horarios específicos.');
        return;
      }
      
      // Limpiar horarios por defecto en modo específico
      this.consultorio.horaAperturaDefault = '';
      this.consultorio.horaCierreDefault = '';
      
      // Procesar horarios semanales
      this.consultorio.horariosSemanales = this.consultorio.horariosSemanales?.map(horario => ({
        diaSemana: horario.diaSemana,
        horaApertura: horario.activo ? horario.horaApertura : undefined,
        horaCierre: horario.activo ? horario.horaCierre : undefined,
        activo: horario.activo
      })) || [];
    }

    // console.log('Horarios después de procesar:', this.consultorio.horariosSemanales);

    // Crear copia del consultorio para envío
    const consultorioParaEnvio = {
      ...this.consultorio,
      centroAtencion: undefined, // No enviar el objeto completo para evitar conflictos
      horaAperturaDefault: this.convertTimeToBackend(this.consultorio.horaAperturaDefault || ''),
      horaCierreDefault: this.convertTimeToBackend(this.consultorio.horaCierreDefault || '')
    };

    // console.log('=== DEBUG: Valores convertidos para envío ===');
    // console.log('horaAperturaDefault para envío:', consultorioParaEnvio.horaAperturaDefault);
    // console.log('horaCierreDefault para envío:', consultorioParaEnvio.horaCierreDefault);
    // console.log('Datos del consultorio a enviar:', consultorioParaEnvio);

    const op = this.consultorio.id
      ? this.consultorioService.update(this.consultorio.id, consultorioParaEnvio)
      : this.consultorioService.create(consultorioParaEnvio);

    op.subscribe({
      next: (response) => {
        // console.log('Consultorio guardado exitosamente:', response);
        this.navigateBack();
      },
      error: (err) => {
        console.error('Error al guardar el consultorio:', err);
        this.modalService.alert("Error", "No se pudo guardar el consultorio.");
      },
    });
  }  /**
   * Convierte tiempo del formato del backend (HH:MM:SS) al formato del frontend (HH:MM)
   */
  private convertTimeFromBackend(time: string): string {
    if (!time) return '';
    // Si ya está en formato HH:MM, lo devolvemos tal como está
    if (time.length === 5) return time;
    // Si está en formato HH:MM:SS, cortamos los segundos
    return time.substring(0, 5);
  }

  /**
   * Convierte tiempo del formato del frontend (HH:MM) al formato del backend (HH:MM:SS)
   */
  private convertTimeToBackend(time: string): string {
    if (!time) return '';
    // Si ya está en formato HH:MM:SS, lo devolvemos tal como está
    if (time.length === 8) return time;
    // Si está en formato HH:MM, agregamos :00
    return time + ':00';
  }

  private loadConsultorio(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.consultorioService.getById(id).subscribe({
      next: (pkg) => {
        // console.log('Consultorio cargado:', pkg.data);
        // console.log('=== DEBUG: Valores de horarios del backend ===');
        // console.log('horaAperturaDefault del backend:', pkg.data.horaAperturaDefault);
        // console.log('horaCierreDefault del backend:', pkg.data.horaCierreDefault);
        
        this.consultorio = pkg.data;

        // Convertir formatos de tiempo del backend al frontend
        if (this.consultorio.horaAperturaDefault) {
          this.consultorio.horaAperturaDefault = this.convertTimeFromBackend(this.consultorio.horaAperturaDefault);
        }
        if (this.consultorio.horaCierreDefault) {
          this.consultorio.horaCierreDefault = this.convertTimeFromBackend(this.consultorio.horaCierreDefault);
        }

        // console.log('=== DEBUG: Valores después de conversión ===');
        // console.log('horaAperturaDefault convertida:', this.consultorio.horaAperturaDefault);
        // console.log('horaCierreDefault convertida:', this.consultorio.horaCierreDefault);

        // Asignar el centro de atención usando los datos que ya vienen del backend
        if (this.consultorio.centroId && this.consultorio.nombreCentro) {
          this.consultorio.centroAtencion = {
            id: this.consultorio.centroId,
            nombre: this.consultorio.nombreCentro,
          } as CentroAtencion;
          this.selectedCentroAtencion = this.consultorio.centroAtencion;
          // Inicializar el campo de búsqueda con el nombre del centro
          this.centroSearch = this.consultorio.nombreCentro;
          // console.log('Centro de atención asignado:', this.selectedCentroAtencion);
        }

        // Inicializar horarios si no existen o están vacíos
        if (!this.consultorio.horariosSemanales || this.consultorio.horariosSemanales.length === 0) {
          console.log('Inicializando horarios semanales porque no existen...');
          this.initializeWeeklySchedule();
        } else {
          console.log('Horarios semanales existentes:', this.consultorio.horariosSemanales);
        }

        // Determinar qué tipo de horario está configurado
        this.determinarTipoHorario();


      },
      error: (err) => {
        console.error('Error al cargar el consultorio:', err);
        this.modalService.alert('Error', 'No se pudo cargar la información del consultorio.');
      }
    });
  }

  /**
   * Determina automáticamente qué tipo de horario usar basándose en los datos existentes
   */
  private determinarTipoHorario(): void {
    // Si hay horarios específicos configurados (al menos uno activo con horarios diferentes al default)
    const tieneHorariosEspecificos = this.consultorio.horariosSemanales?.some(horario => 
      horario.activo && (
        horario.horaApertura !== this.consultorio.horaAperturaDefault ||
        horario.horaCierre !== this.consultorio.horaCierreDefault
      )
    );

    // Si hay horarios por defecto pero no horarios específicos configurados
    const tieneHorariosGenerales = this.consultorio.horaAperturaDefault && 
                                   this.consultorio.horaCierreDefault && 
                                   !tieneHorariosEspecificos;

    if (tieneHorariosEspecificos) {
      this.tipoHorario = 'especifico';
    } else {
      this.tipoHorario = 'general';
    }

    console.log('Tipo de horario determinado:', this.tipoHorario);
  }

  /**
   * Verifica si hay horarios específicos configurados
   */
  tieneHorariosEspecificos(): boolean {
    return this.consultorio.horariosSemanales?.some(h => h.activo) || false;
  }


  /**
   * Maneja el cambio de tipo de horario
   */
  onTipoHorarioChange(): void {
    console.log('Cambio de tipo de horario a:', this.tipoHorario);
    
    if (this.tipoHorario === 'general') {
      // Si cambia a general, limpiar horarios específicos y usar valores por defecto
      this.limpiarHorariosEspecificos();
    } else if (this.tipoHorario === 'especifico') {
      // Si cambia a específico, inicializar horarios semanales basándose en los horarios generales
      this.inicializarHorariosEspecificosDesdeGenerales();
    }
  }

  /**
   * Limpia los horarios específicos cuando se selecciona horario general
   */
  private limpiarHorariosEspecificos(): void {
    if (this.consultorio.horariosSemanales) {
      this.consultorio.horariosSemanales = this.consultorio.horariosSemanales.map(horario => ({
        ...horario,
        horaApertura: '',
        horaCierre: '',
        activo: false
      }));
    }
  }

  /**
   * Inicializa horarios específicos basándose en los horarios generales
   */
  private inicializarHorariosEspecificosDesdeGenerales(): void {
    const horaApertura = this.consultorio.horaAperturaDefault || "08:00";
    const horaCierre = this.consultorio.horaCierreDefault || "17:00";
    
    if (!this.consultorio.horariosSemanales || this.consultorio.horariosSemanales.length === 0) {
      this.initializeWeeklySchedule();
    } else {
      // Actualizar horarios existentes con los valores generales
      this.consultorio.horariosSemanales = this.consultorio.horariosSemanales.map(horario => ({
        ...horario,
        horaApertura: horaApertura,
        horaCierre: horaCierre,
        activo: horario.diaSemana !== 'SABADO' && horario.diaSemana !== 'DOMINGO'
      }));
    }
  }

  private getCentrosAtencion(): void {
    this.centroAtencionService.getAll().subscribe((res) => {
      this.centrosAtencion = res.data;
    });
  }

  // Autocomplete para el centro de atención
  searchCentros = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) =>
        this.centroAtencionService.search(term).pipe(map((resp) => resp.data))
      )
    );

  formatCentro = (c: CentroAtencion) => c.nombre;

  onSelectCentro(event: any): void {
    this.selectedCentroAtencion = event.item;
    // Actualizar el campo de búsqueda con el nombre del centro seleccionado
    this.centroSearch = event.item.nombre;
    console.log('Centro seleccionado:', this.selectedCentroAtencion);
  }

  remove(): void {
    if (!this.consultorio.id) {
      this.modalService.alert('Error', 'No se puede eliminar: el consultorio no tiene ID.');
      return;
    }
    
    this.modalService
      .confirm(
        "Eliminar Consultorio",
        "¿Está seguro que desea eliminar este consultorio?",
        "Si elimina el consultorio no lo podrá utilizar luego"
      )
      .then(() => {
        this.consultorioService.delete(this.consultorio.id!).subscribe({
          next: () => {
            this.goBack(); // Redirige al usuario a la lista
          },
          error: (err) => {
            console.error('Error al eliminar el consultorio:', err);
            this.modalService.alert('Error', 'No se pudo eliminar el consultorio. Intente nuevamente.');
          }
        });
      });
  }

  activarEdicion(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: true },
      queryParamsHandling: 'merge'
    });
    this.modoEdicion = true;
  }

  cancelar(): void {
    if (!this.esNuevo) {
      // Si estamos editando un consultorio existente, solo salimos del modo edición
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        queryParamsHandling: 'merge'
      });
      this.modoEdicion = false;
    } else {
      // Si es un nuevo consultorio, usamos navegación de retorno
      this.navigateBack();
    }
  }
}
