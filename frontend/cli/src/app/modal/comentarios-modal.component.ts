import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { EncuestaDetalle } from '../models/encuesta-detalle';

@Component({
  selector: 'app-comentarios-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comentarios-modal.component.html',
  styleUrls: ['./comentarios-modal.component.css']
})
export class ComentariosModalComponent {
  @Input() title: string = 'Encuestas de Pacientes';
  @Input() encuestas: EncuestaDetalle[] = [];

  constructor(public activeModal: NgbActiveModal) {}

  close() {
    this.activeModal.close();
  }

  /**
   * Obtener el valor de una respuesta específica por tipo
   */
  getRespuesta(encuesta: EncuestaDetalle, tipo: string): any {
    return encuesta.respuestas[tipo];
  }

  /**
   * Verificar si una encuesta tiene un tipo de respuesta específico
   */
  tieneRespuesta(encuesta: EncuestaDetalle, tipo: string): boolean {
    return encuesta.respuestas && encuesta.respuestas[tipo] !== undefined && encuesta.respuestas[tipo] !== null;
  }

  /**
   * Generar array de estrellas para visualizar RATING
   */
  getEstrellas(valor: number): number[] {
    return Array(valor).fill(0);
  }

  /**
   * Obtener clases de color según el valor NPS/CSAT
   */
  getColorClass(valor: number, max: number): string {
    const porcentaje = (valor / max) * 100;
    if (porcentaje >= 80) return 'score-high';
    if (porcentaje >= 50) return 'score-medium';
    return 'score-low';
  }
}
