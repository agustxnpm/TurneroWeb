import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { EspecialidadService } from '../especialidades/especialidad.service';
import { MedicoService } from '../medicos/medico.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DataPackage } from '../data.package';
import { ListaEsperaService } from './lista-espera.service';
import { CentroAtencion } from '../centrosAtencion/centroAtencion';
import { Especialidad } from '../especialidades/especialidad';
import { Medico } from '../medicos/medico';
import { ListaEspera } from './lista-espera.model';
import { ModalService } from '../modal/modal.service';
import { ListaEsperaFormComponent } from './lista-espera-form.component';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
    selector: 'app-lista-espera',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        DatePipe,
        RouterModule
    ],
    templateUrl: './lista-espera.component.html',
    styleUrls: ['./lista-espera.component.css']
})
export class ListaEsperaComponent implements OnInit {
    // Formulario y datos
    filtrosForm: FormGroup;
    listaSolicitudes: ListaEspera[] = [];
    centros: CentroAtencion[] = [];
    especialidades: Especialidad[] = [];
    medicos: Medico[] = [];
    cargando = false;

    // Paginación
    currentPage = 0;
    pageSize = 10;
    totalPages = 0;
    totalElements = 0;

    // Estados y opciones
    estados = [
        { value: '', label: 'Todos' },
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'CUBIERTA', label: 'Cubierta' },
        { value: 'RESUELTA', label: 'Resuelta' },
        { value: 'RESUELTA_POR_OTRO_MEDIO', label: 'Resuelta Manual' }
    ];

    nivelesUrgencia = [
        { value: '', label: 'Todos' },
        { value: 'BAJA', label: 'Baja' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'URGENTE', label: 'Urgente' }
    ];
    constructor(
        private fb: FormBuilder,
        private listaEsperaService: ListaEsperaService,
        private centroService: CentroAtencionService,
        private especialidadService: EspecialidadService,
        private medicoService: MedicoService
        ,
        private modalService: ModalService
    ) {
        this.filtrosForm = this.fb.group({
            especialidadId: [null],
            centroAtencionId: [null],
            medicoId: [null],
            fechaDesde: [null],
            fechaHasta: [null],
            estado: [''],
            urgenciaMedica: [''] // String vacío para "Todos"
        });
    }

    ngOnInit() {
        this.cargarDatosIniciales();
        this.setupFiltrosListener();
    }

    cargarDatosIniciales() {
        this.centroService.getAll().subscribe(
            (response) => this.centros = response.data
        );
        this.especialidadService.all().subscribe(
            (response: DataPackage) => this.especialidades = response.data
        );
        this.medicoService.getAll().subscribe(
            (response: DataPackage) => this.medicos = response.data
        );
        this.buscarSolicitudes();
    }

    setupFiltrosListener() {
        this.filtrosForm.valueChanges
            .pipe(
                debounceTime(500),
                distinctUntilChanged()
            )
            .subscribe(() => {
                this.currentPage = 0;
                this.buscarSolicitudes();
            });
    }

    buscarSolicitudes() {
        this.cargando = true;
        const filtros = { ...this.filtrosForm.value };

        this.listaEsperaService.getListaEspera(filtros).subscribe(
            (response: DataPackage) => {
                if (response.status_code === 200) {
                    this.listaSolicitudes = response.data || [];
                    // al usar /buscar no hay paginación en backend, así que actualizamos contadores básicos
                    this.totalElements = this.listaSolicitudes.length;
                    this.totalPages = this.totalElements > 0 ? 1 : 0;
                }
                this.cargando = false;
            },
            error => {
                console.error('Error al buscar solicitudes:', error);
                this.cargando = false;
            }
        );
    }

    marcarComoResueltaManual(id: number) {
        if (confirm('¿Está seguro de marcar esta solicitud como resuelta manualmente?')) {
            this.listaEsperaService.marcarComoResueltaManual(id).subscribe(
                (response: DataPackage) => {
                    if (response.status_code === 200) {
                        alert('Solicitud marcada como resuelta manualmente');
                        this.buscarSolicitudes();
                    } else {
                        alert(`Error: ${response.status_text}`);
                    }
                },
                error => {
                    console.error('Error al marcar solicitud como resuelta:', error);
                    alert('Error al marcar la solicitud como resuelta');
                }
            );
        }
    }

    mostrarInfoContacto(paciente: ListaEspera) {
        const mensaje = `Información de contacto:
      Teléfono: ${paciente.pacienteTelefono}
      Email: ${paciente.pacienteEmail}`;
        alert(mensaje);
    }

    // Métodos de paginación
    cambiarPagina(pagina: number) {
        if (pagina >= 0 && pagina < this.totalPages) {
            this.currentPage = pagina;
            this.buscarSolicitudes();
        }
    }

    getPaginationArray(): number[] {
        const pages: number[] = [];
        const maxPages = 5;
        let start = Math.max(0, this.currentPage - Math.floor(maxPages / 2));
        let end = Math.min(this.totalPages, start + maxPages);

        if (end - start < maxPages) {
            start = Math.max(0, end - maxPages);
        }

        for (let i = start; i < end; i++) {
            pages.push(i);
        }
        return pages;
    }

    getEstadoClass(estado: string): string {
        switch (estado) {
            case 'PENDIENTE': return 'badge-estado-pendiente';
            case 'CUBIERTA': return 'badge-estado-resuelta';
            case 'RESUELTA': return 'badge-estado-resuelta';
            case 'RESUELTA_POR_OTRO_MEDIO': return 'badge-estado-resuelta';
            case 'CANCELADA': return 'badge-estado-cancelada';
            default: return 'badge-estado-pendiente';
        }
    }

    getEstadoIcon(estado: string): string {
        switch (estado) {
            case 'PENDIENTE': return 'pending';
            case 'CUBIERTA': return 'check_circle';
            case 'RESUELTA': return 'task_alt';
            case 'RESUELTA_POR_OTRO_MEDIO': return 'verified';
            case 'CANCELADA': return 'cancel';
            default: return 'help';
        }
    }

    // Abrir modal para nueva solicitud
    nuevaSolicitud() {
        const modalRef = this.modalService.open(ListaEsperaFormComponent, { size: 'lg' });
        // no data => nuevo
        const comp = modalRef.componentInstance as any;
        
        // 🎭 IMPORTANTE: Setear contexto de operador para habilitar búsqueda de pacientes
        comp.operatorContext = true;
        
        // Suscribir eventos
        comp.save.subscribe((solicitud: ListaEspera) => {
            // crear mediante servicio
            this.listaEsperaService.create(solicitud).subscribe({
                next: (resp) => {
                    if (resp.status_code === 200) {
                        this.buscarSolicitudes();
                        this.modalService.close();
                    } else {
                        alert(`Error: ${resp.status_text}`);
                    }
                },
                error: (err) => {
                    console.error('Error creando solicitud:', err);
                    alert('Error creando la solicitud');
                }
            });
        });

        comp.cancel.subscribe(() => {
            this.modalService.dismiss();
        });
    }

    // Editar solicitud existente
    editarSolicitud(solicitud: ListaEspera) {
        const modalRef = this.modalService.open(ListaEsperaFormComponent, { size: 'lg' });
        const comp = modalRef.componentInstance as any;
        comp.data = solicitud;
        
        // 🎭 IMPORTANTE: Setear contexto de operador para habilitar búsqueda (si es necesario editar paciente)
        comp.operatorContext = true;

        comp.save.subscribe((updated: ListaEspera) => {
            this.listaEsperaService.update(solicitud.id!, updated).subscribe({
                next: (resp) => {
                    if (resp.status_code === 200) {
                        this.buscarSolicitudes();
                        this.modalService.close();
                    } else {
                        alert(`Error: ${resp.status_text}`);
                    }
                },
                error: (err) => {
                    console.error('Error actualizando solicitud:', err);
                    alert('Error actualizando la solicitud');
                }
            });
        });

        comp.cancel.subscribe(() => this.modalService.dismiss());
    }



    getUrgenciaClass(urgencia: string): string {
        switch (urgencia) {
            case 'BAJA': return 'badge-urgencia-baja';
            case 'MEDIA': return 'badge-urgencia-media';
            case 'ALTA': return 'badge-urgencia-alta';
            case 'URGENTE': return 'badge-urgencia-alta';
            default: return 'badge-urgencia-baja';
        }
    }

    getUrgenciaIcon(urgencia: string): string {
        switch (urgencia) {
            case 'BAJA': return 'priority_low';
            case 'MEDIA': return 'priority_high';
            case 'ALTA': return 'warning';
            case 'URGENTE': return 'emergency';
            default: return 'help';
        }
    }

    getUrgenciaLabel(urgencia: string): string {
        const nivel = this.nivelesUrgencia.find(n => n.value === urgencia);
        return nivel ? nivel.label : urgencia;
    }
}