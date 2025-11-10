import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Consultorio } from '../../../consultorios/consultorio';
import { EsquemaTurno } from '../../../esquemaTurno/esquemaTurno';
import { EsquemaTurnoService } from '../../../esquemaTurno/esquemaTurno.service';
import { StaffMedico } from '../../../staffMedicos/staffMedico';
import { EsquemaTurnoModalComponent } from './esquema-turno-modal.component';
import { HorariosConsultorioModalComponent } from './horarios-consultorio-modal.component';

@Component({
  selector: 'app-centro-atencion-consultorios-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './centro-atencion-consultorios-tab.component.html',
  styleUrls: ['./centro-atencion-consultorios-tab.component.css']
})
export class CentroAtencionConsultoriosTabComponent implements OnInit {
  @Input() consultorios: Consultorio[] = [];
  @Input() modoCrearConsultorio: boolean = false;
  @Input() editConsultorioIndex: number | null = null;
  @Input() nuevoConsultorio: { numero: number | null, nombre: string } = { numero: null, nombre: '' };
  @Input() mensajeConsultorio: string = '';
  @Input() tipoMensajeConsultorio: string = '';
  @Input() consultorioExpandido: { [consultorioId: number]: boolean } = {};
  @Input() esquemasSemana: EsquemaTurno[] = [];
  @Input() esquemasConsultorio: { [consultorioId: number]: EsquemaTurno[] } = {};
  @Input() centroId!: number;
  @Input() staffMedicoCentro: StaffMedico[] = [];

  @Output() modoCrearConsultorioChange = new EventEmitter<boolean>();
  @Output() crearNuevoConsultorio = new EventEmitter<void>();
  @Output() crearConsultorio = new EventEmitter<void>();
  @Output() cancelarCrearConsultorio = new EventEmitter<void>();
  @Output() toggleConsultorioExpansion = new EventEmitter<Consultorio>();
  @Output() editarConsultorio = new EventEmitter<number>();
  @Output() editarHorariosConsultorio = new EventEmitter<Consultorio>();
  @Output() guardarEdicionConsultorio = new EventEmitter<number>();
  @Output() cancelarEdicionConsultorio = new EventEmitter<void>();
  @Output() eliminarConsultorio = new EventEmitter<Consultorio>();
  @Output() crearNuevoEsquema = new EventEmitter<Consultorio>();
  @Output() verDetalleEsquema = new EventEmitter<EsquemaTurno>();
  @Output() esquemaEditado = new EventEmitter<EsquemaTurno>();
  @Output() esquemaCreado = new EventEmitter<EsquemaTurno>();

  constructor(
    private modalService: NgbModal,
    private esquemaTurnoService: EsquemaTurnoService
  ) {}

  ngOnInit(): void {
    // Inicialización si es necesaria
    console.log('Consultorios recibidos en tab:', this.consultorios);
    console.log('Consultorio expandido:', this.consultorioExpandido);
  }

  onModoCrearConsultorio(): void {
    this.modoCrearConsultorioChange.emit(true);
  }

  onCrearNuevoConsultorio(): void {
    this.crearNuevoConsultorio.emit();
  }

  onCrearConsultorio(): void {
    this.crearConsultorio.emit();
  }

  onCancelarCrearConsultorio(): void {
    this.modoCrearConsultorioChange.emit(false);
    this.cancelarCrearConsultorio.emit();
  }

  onToggleConsultorioExpansion(consultorio: Consultorio): void {
    console.log('Toggling consultorio:', consultorio);
    console.log('Consultorio numero:', consultorio.numero);
    console.log('Consultorio nombre:', consultorio.nombre);
    this.toggleConsultorioExpansion.emit(consultorio);
  }

  onEditarConsultorio(index: number): void {
    this.editarConsultorio.emit(index);
  }

  onEditarHorariosConsultorio(consultorio: Consultorio): void {
    const modalRef = this.modalService.open(HorariosConsultorioModalComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });

    // Pasar el consultorio al modal
    modalRef.componentInstance.consultorio = consultorio;

    // Manejar el resultado del modal
    modalRef.result.then(
      (consultorioActualizado: Consultorio) => {
        if (consultorioActualizado) {
          // Emitir evento para que el componente padre actualice la lista
          this.editarHorariosConsultorio.emit(consultorioActualizado);
        }
      },
      (dismissed) => {
        // Modal fue cancelado o cerrado sin guardar
        console.log('Modal de horarios cerrado sin guardar');
      }
    );
  }

  /**
   * Verifica si el consultorio tiene horarios configurados (por defecto o semanales)
   */
  tieneHorariosConfigurados(consultorio: Consultorio): boolean {
    return !!(consultorio.horariosSemanales && consultorio.horariosSemanales.length > 0) || 
           !!(consultorio.horaAperturaDefault && consultorio.horaCierreDefault);
  }

  onGuardarEdicionConsultorio(index: number): void {
    this.guardarEdicionConsultorio.emit(index);
  }

  onCancelarEdicionConsultorio(): void {
    this.cancelarEdicionConsultorio.emit();
  }

  onEliminarConsultorio(consultorio: Consultorio): void {
    this.eliminarConsultorio.emit(consultorio);
  }

  onCrearNuevoEsquema(consultorio: Consultorio): void {
    this.abrirModalEsquema(consultorio);
  }

  /**
   * Abre el modal para crear un nuevo esquema de turno
   */
  abrirModalEsquema(consultorio: Consultorio, esquemaEditar?: EsquemaTurno): void {
    console.log('🚀 Abriendo modal de esquema para consultorio:', consultorio);
    console.log('📍 Centro ID:', this.centroId);
    console.log('👥 Staff médicos del centro:', this.staffMedicoCentro);
    console.log('✏️ Esquema a editar:', esquemaEditar);

    const modalRef = this.modalService.open(EsquemaTurnoModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    // Pasar datos al modal
    modalRef.componentInstance.consultorio = consultorio;
    modalRef.componentInstance.centroId = this.centroId;
    modalRef.componentInstance.staffMedicos = this.staffMedicoCentro;
    modalRef.componentInstance.esquemaEditar = esquemaEditar; // Pasar esquema a editar si existe

    console.log('✅ Datos enviados al modal:', {
      consultorio: consultorio,
      centroId: this.centroId,
      staffMedicos: this.staffMedicoCentro,
      esquemaEditar: esquemaEditar
    });

    // Manejar el resultado del modal
    modalRef.result.then(
      (nuevoEsquema: EsquemaTurno) => {
        if (nuevoEsquema) {
          console.log('✅ Esquema guardado exitosamente:', nuevoEsquema);
          // Emitir evento para que el componente padre actualice los esquemas
          this.esquemaCreado.emit(nuevoEsquema);
        }
      },
      (dismissed) => {
        // Modal fue cancelado o cerrado sin guardar
        console.log('❌ Modal de esquema cerrado sin guardar');
      }
    );
  }

  /**
   * Edita un esquema existente
   */
  onEditarEsquema(esquema: EsquemaTurno): void {
    console.log('✏️ Editando esquema:', esquema);
    // Encontrar el consultorio del esquema
    const consultorio = this.consultorios.find(c => c.id === esquema.consultorioId);
    if (consultorio) {
      this.abrirModalEsquema(consultorio, esquema);
    }
  }

  /**
   * Elimina un esquema de turno
   */
  onEliminarEsquema(esquema: EsquemaTurno): void {
    if (confirm(`¿Está seguro que desea eliminar el esquema de ${esquema.nombreStaffMedico}?`)) {
      this.esquemaTurnoService.remove(esquema.id!).subscribe({
        next: () => {
          console.log('✅ Esquema eliminado exitosamente');
          // Emitir evento para actualizar la lista
          this.esquemaCreado.emit({} as EsquemaTurno); // Trigger reload
        },
        error: (error) => {
          console.error('❌ Error al eliminar esquema:', error);
          alert('Error al eliminar el esquema de turno');
        }
      });
    }
  }

  getEsquemasDelConsultorio(consultorioId: number): EsquemaTurno[] {
    // Primero intentar usar esquemasConsultorio si está disponible
    if (this.esquemasConsultorio[consultorioId]) {
      return this.esquemasConsultorio[consultorioId];
    }
    // Fallback a filtrar esquemasSemana
    return this.esquemasSemana.filter(esquema => esquema.consultorioId === consultorioId);
  }

  getEsquemasDelConsultorioPorDia(consultorioId: number, dia: string): EsquemaTurno[] {
    return this.getEsquemasDelConsultorio(consultorioId)
      .filter(esquema => esquema.horarios?.some(horario => horario.dia?.toUpperCase() === dia.toUpperCase()));
  }

  getColorBorde(dia: string): string {
    const colores: { [key: string]: string } = {
      'LUNES': '#007bff',
      'MARTES': '#28a745',
      'MIERCOLES': '#ffc107',
      'JUEVES': '#17a2b8',
      'VIERNES': '#fd7e14',
      'SABADO': '#6f42c1',
      'DOMINGO': '#dc3545'
    };
    return colores[dia.toUpperCase()] || '#6c757d';
  }

  getHorarioEspecifico(consultorio: Consultorio, dia: string): any {
    return consultorio.horariosSemanales?.find(
      horario => horario.diaSemana?.toUpperCase() === dia.toUpperCase()
    );
  }

  getHorariosPorDia(esquema: EsquemaTurno, dia: string): any[] {
    return esquema.horarios?.filter(horario => 
      horario.dia?.toUpperCase() === dia.toUpperCase()
    ) || [];
  }

  onVerDetalleEsquema(esquema: EsquemaTurno): void {
    this.verDetalleEsquema.emit(esquema);
  }

  /**
   * Verifica si el consultorio tiene horarios configurados para un día específico
   */
  tieneHorarioEnDia(consultorio: Consultorio, dia: string): boolean {
    // Verificar si tiene horariosSemanales y encontrar el día específico
    if (consultorio.horariosSemanales && consultorio.horariosSemanales.length > 0) {
      const horarioDia = consultorio.horariosSemanales.find(h => h.diaSemana === dia);
      return horarioDia ? horarioDia.activo : false;
    }
    
    // Fallback a horarios por defecto si no tiene horariosSemanales
    return !!(consultorio.horaAperturaDefault && consultorio.horaCierreDefault);
  }

  /**
   * Obtiene el horario formateado para un día específico del consultorio
   */
  getHorarioConsultorioDia(consultorio: Consultorio, dia: string): string {
    // Usar horariosSemanales si están disponibles
    if (consultorio.horariosSemanales && consultorio.horariosSemanales.length > 0) {
      const horarioDia = consultorio.horariosSemanales.find(h => h.diaSemana === dia);
      if (horarioDia && horarioDia.activo && horarioDia.horaApertura && horarioDia.horaCierre) {
        const apertura = horarioDia.horaApertura.substring(0, 5);
        const cierre = horarioDia.horaCierre.substring(0, 5);
        return `${apertura} - ${cierre}`;
      }
      return '';
    }
    
    // Fallback a horarios por defecto
    if (consultorio.horaAperturaDefault && consultorio.horaCierreDefault) {
      const apertura = consultorio.horaAperturaDefault.substring(0, 5);
      const cierre = consultorio.horaCierreDefault.substring(0, 5);
      return `${apertura} - ${cierre}`;
    }
    
    return '';
  }

  /**
   * Obtiene la string de horario para un día específico de un esquema
   */
  getHorarioStringPorDia(esquema: EsquemaTurno, dia: string): string {
    const horarios = this.getHorariosPorDia(esquema, dia);
    if (horarios.length > 0) {
      const horario = horarios[0]; // Tomar el primer horario del día
      const inicio = horario.horaInicio ? horario.horaInicio.substring(0,5) : '';
      const fin = horario.horaFin ? horario.horaFin.substring(0,5) : '';
      return `${inicio}-${fin}`;
    }
    return '';
  }
}
