import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CentroAtencionService } from './centroAtencion.service';
import { CentroAtencion } from './centroAtencion';
import { ModalService } from '../modal/modal.service';
import { ResultsPage } from '../results-page';
import { PaginationComponent } from '../pagination/pagination.component';
import { UserContextService } from '../services/user-context.service';

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
  
  // Multi-tenant: Control de acceso por rol
  isSuperAdmin: boolean = false;

  constructor(
    private centroAtencionService: CentroAtencionService,
    private modalService: ModalService,
    public router: Router,
    private route: ActivatedRoute,
    private userContextService: UserContextService
  ) {
    this.modoEdicion = this.route.snapshot.queryParamMap.get('edit') === 'true';
  }

  ngOnInit() {
    // Verificar rol del usuario para control de acceso multi-tenant
    this.isSuperAdmin = this.userContextService.isSuperAdmin;
    
    // Si es ADMIN (no SUPERADMIN), redirigir a "Mi Centro"
    if (this.userContextService.isAdmin && !this.isSuperAdmin) {
      const centroId = this.userContextService.tenantId;
      if (centroId) {
        console.log('ADMIN detectado, redirigiendo a su centro:', centroId);
        this.router.navigate(['/centrosAtencion', centroId]);
        return;
      } else {
        console.error('ADMIN sin centroAtencionId asignado');
        this.router.navigate(['/']);
        return;
      }
    }
    
    // Solo SUPERADMIN puede ver el listado completo
    if (!this.isSuperAdmin) {
      console.warn('Acceso denegado: solo SUPERADMIN puede gestionar centros');
      this.router.navigate(['/']);
      return;
    }
    
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