import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  constructor(public modal: NgbActiveModal) {}

  title!: string;
  message!: string;
  description!: string;
  isAlert: boolean = false; // Nueva propiedad para diferenciar alertas

  close(): void {
    this.modal.close();
  }

  dismiss(): void {
    this.modal.dismiss();
  }
}
