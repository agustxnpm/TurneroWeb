import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-comentarios-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comentarios-modal.component.html',
  styleUrls: ['./comentarios-modal.component.css']
})
export class ComentariosModalComponent {
  @Input() title: string = 'Comentarios de Pacientes';
  @Input() comentarios: string[] = [];

  constructor(public activeModal: NgbActiveModal) {}

  close() {
    this.activeModal.close();
  }
}
