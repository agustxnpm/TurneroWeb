import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ListaEsperaService } from './lista-espera.service';
import { EspecialidadService } from '../especialidades/especialidad.service';
import { CentroAtencionService } from '../centrosAtencion/centroAtencion.service';
import { DataPackage } from '../data.package';
import { Especialidad } from '../especialidades/especialidad';
import { CentroAtencion } from '../centrosAtencion/centroAtencion';

interface EstadisticasGenerales {
    totalSolicitudes: number;
    pendientes: number;
    urgentes: number;
    tiempoPromedioEsperaDias: number;
    porNivelUrgencia?: { [key: string]: number };
}

interface EstadisticaEspecialidad {
    especialidad: string;
    total: number;
    urgentes: number;
    tiempoPromedio: number;
}

@Component({
    selector: 'app-lista-espera-estadisticas',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './lista-espera-estadisticas.component.html',
    styleUrls: ['./lista-espera-estadisticas.component.css']
})
export class ListaEsperaEstadisticasComponent implements OnInit {
    // Formulario de filtros
    filtrosForm: FormGroup;

    // Datos
    estadisticasGenerales: EstadisticasGenerales | null = null;
    estadisticasDemanda: Map<string, number> = new Map();
    rankingEspecialidades: any[] = [];
    especialidades: Especialidad[] = [];
    centros: CentroAtencion[] = [];

    // Estado de carga
    cargando = false;
    error: string | null = null;

    // Configuración de períodos
    periodos = [
        { value: 'mes_actual', label: 'Mes Actual' },
        { value: 'ultimo_trimestre', label: 'Último Trimestre' }
    ];

    // Configuración de niveles de urgencia
    nivelesUrgencia = [
        { value: 'BAJA', label: 'Baja', color: '#4caf50', icon: 'priority' },
        { value: 'MEDIA', label: 'Media', color: '#ff9800', icon: 'priority_high' },
        { value: 'ALTA', label: 'Alta', color: '#f44336', icon: 'warning' },
        { value: 'URGENTE', label: 'Urgente', color: '#d32f2f', icon: 'emergency' }
    ];

    constructor(
        private fb: FormBuilder,
        private listaEsperaService: ListaEsperaService,
        private especialidadService: EspecialidadService,
        private centroService: CentroAtencionService
    ) {
        this.filtrosForm = this.fb.group({
            periodo: ['mes_actual'],
            especialidadId: [null]
        });
    }

    ngOnInit(): void {
        this.cargarDatosIniciales();
        this.cargarEstadisticas();

        // Recargar estadísticas cuando cambien los filtros
        this.filtrosForm.valueChanges.subscribe(() => {
            this.cargarEstadisticas();
        });
    }

    cargarDatosIniciales(): void {
        // Cargar especialidades para el filtro
        this.especialidadService.all().subscribe({
            next: (response: DataPackage<Especialidad[]>) => {
                this.especialidades = response.data || [];
            },
            error: (err) => console.error('Error cargando especialidades:', err)
        });

        // Cargar centros de atención
        this.centroService.getAll().subscribe({
            next: (response) => {
                this.centros = response.data || [];
            },
            error: (err) => console.error('Error cargando centros:', err)
        });
    }

    cargarEstadisticas(): void {
        this.cargando = true;
        this.error = null;

        // 1. Cargar estadísticas generales
        this.listaEsperaService.getEstadisticasGenerales().subscribe({
            next: (response: DataPackage<any>) => {
                if (response.status_code === 200) {
                    this.estadisticasGenerales = response.data;
                }
            },
            error: (err) => {
                console.error('Error cargando estadísticas generales:', err);
                this.error = 'Error al cargar las estadísticas generales';
            }
        });

        // 2. Cargar estadísticas de demanda según período
        const periodo = this.filtrosForm.get('periodo')?.value || 'mes_actual';
        this.listaEsperaService.getEstadisticasDemanda(periodo).subscribe({
            next: (response: DataPackage<any>) => {
                if (response.status_code === 200) {
                    this.estadisticasDemanda = new Map(Object.entries(response.data));
                    this.procesarRankingEspecialidades();
                }
                this.cargando = false;
            },
            error: (err) => {
                console.error('Error cargando estadísticas de demanda:', err);
                this.error = 'Error al cargar las estadísticas de demanda';
                this.cargando = false;
            }
        });
    }

    procesarRankingEspecialidades(): void {
        this.rankingEspecialidades = Array.from(this.estadisticasDemanda.entries())
            .map(([especialidad, cantidad]) => ({ especialidad, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 10); // Top 10
    }

    // Métodos auxiliares para cálculos y visualización
    getPorcentajeUrgencia(nivel: string): number {
        if (!this.estadisticasGenerales?.porNivelUrgencia) return 0;
        const total = this.estadisticasGenerales.pendientes;
        const cantidad = this.estadisticasGenerales.porNivelUrgencia[nivel] || 0;
        return total > 0 ? (cantidad / total) * 100 : 0;
    }

    getCantidadPorNivel(nivel: string): number {
        if (!this.estadisticasGenerales?.porNivelUrgencia) return 0;
        return this.estadisticasGenerales.porNivelUrgencia[nivel] || 0;
    }

    getColorNivel(nivel: string): string {
        const nivelObj = this.nivelesUrgencia.find(n => n.value === nivel);
        return nivelObj?.color || '#6c757d';
    }

    getMaximaDemanda(): number {
        if (this.rankingEspecialidades.length === 0) return 1;
        return Math.max(...this.rankingEspecialidades.map(e => e.cantidad));
    }

    getAnchoBarraPorcentaje(cantidad: number): number {
        const max = this.getMaximaDemanda();
        return max > 0 ? (cantidad / max) * 100 : 0;
    }

    formatearNumero(num: number): string {
        return num.toLocaleString('es-AR');
    }

    formatearDias(dias: number): string {
        if (dias === 0) return 'Hoy';
        if (dias === 1) return '1 día';
        return `${Math.round(dias)} días`;
    }

    exportarCSV(): void {
        // Implementación básica de exportación a CSV
        let csv = 'Especialidad,Solicitudes Pendientes\n';

        this.rankingEspecialidades.forEach(item => {
            csv += `"${item.especialidad}",${item.cantidad}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `estadisticas-lista-espera-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    imprimirReporte(): void {
        window.print();
    }
}