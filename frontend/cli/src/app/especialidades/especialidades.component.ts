// src/app/playType/play-types.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { EspecialidadService } from './especialidad.service';
import { Especialidad } from './especialidad';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
  selector: 'app-especialidades',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginationComponent],
  templateUrl: './especialidades.component.html', 
  styleUrl: './especialidades.component.css'
})
export class EspecialidadesComponent {
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
  selectedId: number | null = null;

  constructor(
    private especialidadService: EspecialidadService,
    public router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    this.getEspecialidades();
  }

  getEspecialidades(): void {
    this.especialidadService.byPage(this.currentPage, 10).subscribe(dataPackage => {
      this.resultsPage = dataPackage.data; 
    });
  }

  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.getEspecialidades();
  }

  goToDetail(id: number): void {
    this.router.navigate(['/especialidades', id]);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/especialidades', id], { queryParams: { edit: true } });
  }

  remove(especialidad: Especialidad): void {
    if (!especialidad.id) {
      alert('No se puede eliminar: la especialidad no tiene ID.');
      return;
    }
    this.modalService
      .confirm(
        "Eliminar especialidad",
        "¿Está seguro que desea eliminar esta especialidad?",
        "Esta acción no se puede deshacer"
      )
      .then(() => {
        this.especialidadService.remove(especialidad.id).subscribe({
          next: (response: any) => {
            if (response?.status_code === 400) {
              alert('No se puede eliminar la especialidad porque tiene dependencias asociadas.');
            } else {
              this.getEspecialidades();
            }
          },
          error: (err) => {
            if (err?.status === 400) {
              alert('No se puede eliminar la especialidad porque tiene dependencias asociadas.');
            } else {
              alert('No se pudo eliminar la especialidad. Intente nuevamente.');
            }
          }
        });
      });
  }

  onRowHover(id: number): void {
    this.selectedId = id;
  }

  onRowLeave(): void {
    this.selectedId = null;
  }
}
