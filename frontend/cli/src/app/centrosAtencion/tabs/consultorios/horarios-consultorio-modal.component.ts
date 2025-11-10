import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Consultorio, HorarioConsultorio } from '../../../consultorios/consultorio';
import { ConsultorioService } from '../../../consultorios/consultorio.service';
import { DataPackage } from '../../../data.package';

@Component({
  selector: 'app-horarios-consultorio-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horarios-consultorio-modal.component.html',
  styleUrl: './horarios-consultorio-modal.component.css' 
})
export class HorariosConsultorioModalComponent implements OnInit {
  consultorio?: Consultorio;
  horariosSemanales: HorarioConsultorio[] = [];
  
  mensajeError = '';
  mensajeExito = '';
  guardando = false;

  private diasSemana = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

  constructor(
    public activeModal: NgbActiveModal,
    private consultorioService: ConsultorioService
  ) {}

  ngOnInit(): void {
    this.inicializarHorarios();
  }

  private inicializarHorarios(): void {
    if (this.consultorio?.horariosSemanales && this.consultorio.horariosSemanales.length > 0) {
      // Usar horarios existentes
      this.horariosSemanales = [...this.consultorio.horariosSemanales];
    } else {
      // Crear horarios por defecto
      this.horariosSemanales = this.diasSemana.map(dia => ({
        diaSemana: dia,
        horaApertura: this.consultorio?.horaAperturaDefault || '08:00:00',
        horaCierre: this.consultorio?.horaCierreDefault || '17:00:00',
        activo: true
      }));
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

  aplicarHorarioTodos(apertura: string, cierre: string): void {
    this.horariosSemanales.forEach(horario => {
      horario.horaApertura = apertura + ':00';
      horario.horaCierre = cierre + ':00';
      horario.activo = true;
    });
  }

  aplicarHorarioLaborables(apertura: string, cierre: string): void {
    this.horariosSemanales.forEach(horario => {
      if (['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'].includes(horario.diaSemana)) {
        horario.horaApertura = apertura + ':00';
        horario.horaCierre = cierre + ':00';
        horario.activo = true;
      }
    });
  }

  cerrarFinesDesemana(): void {
    this.horariosSemanales.forEach(horario => {
      if (['SABADO', 'DOMINGO'].includes(horario.diaSemana)) {
        horario.activo = false;
      }
    });
  }

  guardarHorarios(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    // Validar horarios
    for (const horario of this.horariosSemanales) {
      if (horario.activo && (!horario.horaApertura || !horario.horaCierre)) {
        this.mensajeError = `Por favor, complete los horarios para ${this.getDiaNombre(horario.diaSemana)}`;
        return;
      }
      
      if (horario.activo && horario.horaApertura && horario.horaCierre) {
        const apertura = new Date(`1970-01-01T${horario.horaApertura}`);
        const cierre = new Date(`1970-01-01T${horario.horaCierre}`);
        
        if (apertura >= cierre) {
          this.mensajeError = `La hora de apertura debe ser anterior a la hora de cierre en ${this.getDiaNombre(horario.diaSemana)}`;
          return;
        }
      }
    }

    this.guardando = true;

    // Actualizar el consultorio con los nuevos horarios
    const consultorioActualizado = {
      ...this.consultorio,
      horariosSemanales: this.horariosSemanales
    };

    this.consultorioService.updateHorarios(this.consultorio!.id!, this.horariosSemanales).subscribe({
      next: (response: DataPackage<Consultorio>) => {
        this.guardando = false;
        this.mensajeExito = 'Horarios actualizados correctamente';
        
        setTimeout(() => {
          this.activeModal.close(consultorioActualizado);
        }, 1500);
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al actualizar horarios:', error);
        this.mensajeError = 'Error al actualizar los horarios. Por favor, intente nuevamente.';
      }
    });
  }
}
