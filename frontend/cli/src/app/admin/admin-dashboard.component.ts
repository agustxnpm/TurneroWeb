import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { AuthService } from "../inicio-sesion/auth.service";
import { DashboardService } from "../services/dashboard.service";
import { ModalService } from "../modal/modal.service";
import { ComentariosModalComponent } from "../modal/comentarios-modal.component";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-dashboard.component.html",
  styleUrls: ["./admin-dashboard.component.css"],
})
export class AdminDashboardComponent implements OnInit {
  particles: { x: number; y: number }[] = [];
  activeUsersCount: number = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dashboardService: DashboardService,
    private modalService: ModalService
  ) { }

  ngOnInit() {
    this.loadMetricasCalidad();
    this.loadActiveUsersCount();
  }

  // ==== Calidad =====
  calidad: any = null;

  openComentariosModal() {
    const filtros = { fechaDesde: undefined, fechaHasta: undefined };
    this.dashboardService.getComentarios(filtros).subscribe({
      next: (resp) => {
        if (resp.status_code == 200) {
        const comentarios = resp.data || [];
        this.modalService.open(ComentariosModalComponent, { size: 'lg' }).componentInstance.comentarios = comentarios;
        } else {
          alert('Error al obtener comentarios de encuestas');
          return;
        }
      },
      error: (err) => {
        console.error('Error cargando comentarios', err);
      }
    });
  }

  loadMetricasCalidad() {
    const filtros = { fechaDesde: undefined, fechaHasta: undefined };
    this.dashboardService.getMetricasCalidad(filtros).subscribe({
      next: (resp) => {
        if (resp.status_code == 200) {
          this.calidad = resp.data;
        } else {
          alert('Error al obtener métricas de calidad');
          return;
        }
      },
      error: (err) => {
        console.error('Error cargando métricas de calidad', err);
      }
    });
  }

  loadActiveUsersCount() {
    this.dashboardService.getActiveUsersCount().subscribe({
      next: (resp) => {
        if (resp.status_code == 200)
        this.activeUsersCount = resp.data?.activeUsersCount ?? 0
        else {
          alert('Error al obtener conteo de usuarios activos');
          this.activeUsersCount = 0;
        }
      },
      error: (err) => {
        console.error('Error cargando conteo de usuarios activos', err);
        this.activeUsersCount = 0;
      }
    });
  }



  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  getUserName(): string {
    return this.authService.getUserName() || "Administrador";
  }

  getUserEmail(): string {
    return this.authService.getUserEmail() || "admin@correo.com";
  }

  logout() {
    this.authService.logout();
    this.router.navigate(["/ingresar"]);
  }

  goToAudit() {
    this.router.navigate(["/turnos/audit-dashboard"]);
  }

  goToUsers() {
    this.router.navigate(["/operadores"]);
  }
  goToConfigSis() {
    this.router.navigate(["/config"]);  // Cambiar de '/admin-perfil' a '/config'
  }
  goToConfig() {
    this.router.navigate(["/admin-perfil"]);
  }

  goToReports() {
    this.router.navigate(["/turnos/audit-dashboard"]);
  }

  getActiveUsersCount(): number {
    return this.activeUsersCount;
  }
}
