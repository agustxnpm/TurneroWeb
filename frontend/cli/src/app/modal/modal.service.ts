import { Injectable, Type } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from './modal.component';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private currentModal?: NgbModalRef;

  constructor(private modalService: NgbModal) { }

  confirm(title: string, message: string, description: string): Promise<any> {
    const modal = this.modalService.open(ModalComponent);
    modal.componentInstance.title = title;
    modal.componentInstance.message = message;
    modal.componentInstance.description = description;
    return modal.result;
  }

  alert(title: string, message: string): void {
    const modal = this.modalService.open(ModalComponent);
    modal.componentInstance.title = title;
    modal.componentInstance.message = message;
    modal.componentInstance.description = ''; // Opcional, si no necesitas descripción
    modal.componentInstance.isAlert = true; // Puedes usar esta bandera en el componente para diferenciar entre alert y confirm
  }

  /**
   * Abre un modal con un componente específico
   * @param component Componente a mostrar en el modal
   * @param options Opciones de configuración del modal
   * @returns Referencia al modal abierto
   */
  open<T>(component: Type<T>, options?: any): NgbModalRef {
    const modalOptions = {
      backdrop: 'static', // No se cierra al hacer clic fuera
      keyboard: false,    // No se cierra con ESC
      centered: true,
      size: 'lg',
      ...options
    };
    
    this.currentModal = this.modalService.open(component, modalOptions);
    return this.currentModal;
  }

  /**
   * Cierra el modal actual
   * @param result Resultado opcional a devolver
   */
  close(result?: any): void {
    if (this.currentModal) {
      this.currentModal.close(result);
      this.currentModal = undefined;
    }
  }

  /**
   * Descarta el modal actual
   * @param reason Razón del descarte
   */
  dismiss(reason?: any): void {
    if (this.currentModal) {
      this.currentModal.dismiss(reason);
      this.currentModal = undefined;
    }
  }
}

