import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ObraSocialService } from './obraSocial.service';
import { ObraSocial } from './obraSocial';
import { ModalService } from '../modal/modal.service';
import { DataPackage } from '../data.package';

@Component({
  selector: 'app-obra-social-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './obraSocial-detail.component.html', 
  styleUrl: './obraSocial-detail.component.css'
})
export class ObraSocialDetailComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  
  obraSocial: ObraSocial = { id: 0, nombre: '', codigo: '', descripcion: '' };
  modoEdicion = false;
  esNuevo = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private obraSocialService: ObraSocialService,
    private modalService: ModalService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path;

    if (path === 'obraSocial/new') {
      this.modoEdicion = true;
      this.esNuevo = true;
    } else {
      const id = +this.route.snapshot.paramMap.get('id')!;
      this.obraSocialService.get(id).subscribe({
        next: (dp: DataPackage<ObraSocial>) => {
          this.obraSocial = dp.data;
          this.route.queryParams.subscribe(params => {
            this.modoEdicion = params['edit'] === 'true';
          });
        },
        error: (err) => {
          const mensaje = err?.error?.message || "No se pudo cargar la información de la obra social";
          this.modalService.alert("Error", mensaje);
          console.error('Error al cargar obra social:', err);
          this.goBack();
        }
      });
    }
  }

  save(): void {
    // Validar campos requeridos manualmente si el form no está disponible
    if (!this.obraSocial.nombre || !this.obraSocial.codigo) {
      this.modalService.alert(
        "Error", 
        "Por favor, complete correctamente todos los campos requeridos (Nombre y Código)."
      );
      return;
    }

    if (this.form && !this.form.valid) {
      this.modalService.alert(
        "Error", 
        "Por favor, complete correctamente todos los campos requeridos."
      );
      return;
    }
    
    const operacion = this.esNuevo ? 'crear' : 'actualizar';
    const op = this.obraSocial.id && this.obraSocial.id !== 0
      ? this.obraSocialService.update(this.obraSocial.id, this.obraSocial)
      : this.obraSocialService.create(this.obraSocial);
      
    op.subscribe({
      next: () => {
        this.router.navigate(['/obraSocial']);
      },
      error: (err) => {
        const mensaje = err?.error?.message || `No se pudo ${operacion} la obra social. Intente nuevamente.`;
        this.modalService.alert("Error", mensaje);
        console.error(`Error al ${operacion} obra social:`, err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/obraSocial']);
  }
  
  cancelar(): void {
    if (this.obraSocial.id) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        queryParamsHandling: 'merge'
      });
      this.modoEdicion = false;
    } else {
      this.goBack();
    }
  }

  activarEdicion(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: true },
      queryParamsHandling: 'merge'
    });
    this.modoEdicion = true;
  }

  allFieldsEmpty(): boolean {
    return !this.obraSocial?.nombre && 
           !this.obraSocial?.codigo && 
           !this.obraSocial?.descripcion;
  }

  isFormValid(): boolean {
    return !!(this.obraSocial?.nombre && this.obraSocial?.codigo);
  }

  remove(): void {
    if (!this.obraSocial.id) {
      this.modalService.alert('Error', 'No se puede eliminar: la obra social no tiene ID.');
      return;
    }
    
    this.modalService
      .confirm(
        "Eliminar Obra Social",
        "¿Está seguro que desea eliminar esta obra social?",
        "Si elimina la obra social no la podrá utilizar luego"
      )
      .then(() => {
        this.obraSocialService.remove(this.obraSocial.id!).subscribe({
          next: () => {
            this.goBack(); // Redirige al usuario a la lista
          },
          error: (err: any) => {
            console.error('Error al eliminar la obra social:', err);
            this.modalService.alert('Error', 'No se pudo eliminar la obra social. Intente nuevamente.');
          }
        });
      });
  }
}