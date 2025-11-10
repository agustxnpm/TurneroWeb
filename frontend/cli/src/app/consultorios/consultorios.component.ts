import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConsultorioService } from './consultorio.service';
import { Consultorio } from './consultorio';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
  selector: 'app-consultorios',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './consultorios.component.html',
  styleUrl: './consultorios.component.css'
})
export class ConsultoriosComponent implements OnInit {
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
    private consultorioService: ConsultorioService,
    public router: Router,
    private modal: ModalService
  ) { }

  ngOnInit(): void {
    this.getConsultorios();
  }

  getConsultorios(): void {
    this.consultorioService.byPage(this.currentPage, 10).subscribe({
      next: (dataPackage) => {
        this.resultsPage = <ResultsPage>dataPackage.data;
      },
      error: (err) => {
        console.error('Error al cargar consultorios:', err);
        this.modal.alert('Error', 'No se pudieron cargar los consultorios.');
      }
    });
  }

  onPageChangeRequested(page: number): void {
    this.currentPage = page;
    this.getConsultorios();
  }

  confirmDelete(id: number): void {
    this.modal
      .confirm('Eliminando consultorio', 'Eliminar consultorio', '¿Estás seguro que deseas eliminarlo?')
      .then(() => this.delete(id))
      .catch(() => { }); // si cancela, no hacemos nada
  }

  delete(id: number): void {
    this.consultorioService.delete(id).subscribe({
      next: () => this.getConsultorios(),              // recarga la página actual
      error: (err) => {
        console.error('Error al eliminar el consultorio:', err);
        this.modal.alert('Error', 'No se pudo eliminar el consultorio');
      }
    });
  }

  goToDetail(id: number): void {
    this.router.navigate(['/consultorios', id]);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/consultorios', id], { queryParams: { edit: true } });
  }
}
