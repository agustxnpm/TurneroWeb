import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HistorialTurnoDTO } from './historial.service';

@Component({
  selector: 'app-historial-turno-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-turno-detalle.component.html',
  styleUrl: './historial-turno-detalle.component.css', 
})
export class HistorialTurnoDetalleComponent implements OnInit, OnDestroy {
  @Input() turno!: HistorialTurnoDTO;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit() {
    // Bloquear scroll del body cuando el modal se abre
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    // Restaurar scroll del body cuando el modal se cierra
    document.body.style.overflow = 'auto';
  }

  cerrar() {
    this.activeModal.close();
  }
}

