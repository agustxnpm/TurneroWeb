import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CentroAtencionService } from './centroAtencion.service';
import { CentroAtencion } from './centroAtencion';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
  selector: 'app-centros-atencion',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginationComponent],
  templateUrl: './centrosAtencion.component.html',
  styleUrl: './centrosAtencion.component.css' 
})
export class CentrosAtencionComponent {
  resultsPage: ResultsPage = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 10,
    numberOfElements: 0,
    first: true,
    last: true
  };
  currentPage: number = 1;
  modoEdicion: boolean = false;
  selectedId?: number;

  constructor(
    private centroAtencionService: CentroAtencionService,
    private modalService: ModalService,
    public router: Router,
    private route: ActivatedRoute
  ) {
    this.modoEdicion = this.route.snapshot.queryParamMap.get('edit') === 'true';
  }

  ngOnInit() {
    this.getCentrosAtencion();
  }

  getCentrosAtencion(): void {
    this.centroAtencionService.byPage(this.currentPage, 10).subscribe(dataPackage => {
      this.resultsPage = <ResultsPage>dataPackage.data;
    });
  }

  remove(centro: CentroAtencion): void {
    if (centro.id === undefined) {
      alert('No se puede eliminar: el centro no tiene ID.');
      return;
    }
    this.modalService
      .confirm(
        "Eliminar centro de atención",
        "¿Está seguro que desea eliminar el centro de atención?",
        "Si elimina el centro no lo podrá utilizar luego"
      )
      .then(() => {
        this.centroAtencionService.delete(centro.id!).subscribe({
          next: (response: any) => {
            if (response?.status_code === 400) {
              alert('No se puede eliminar el centro porque tiene dependencias asociadas.');
            } else {
              this.getCentrosAtencion();
            }
          },
          error: (err) => {
            alert('No se pudo eliminar el centro. Intente nuevamente.');
          }
        });
      });
  }

  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.getCentrosAtencion();
  }

  goToDetail(id: number): void {
    this.router.navigate(['/centrosAtencion', id]);
  }

  goToEdit(id: number): void {
  this.router.navigate(['/centrosAtencion', id], { queryParams: { edit: true } });
}
}