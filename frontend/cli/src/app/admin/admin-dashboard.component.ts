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

  constructor(
    private authService: AuthService,
    private router: Router,
    private dashboardService: DashboardService,
    private modalService: ModalService
  ) { }

  ngOnInit() {
    this.generateParticles();
    this.loadMetricasCalidad();
  }

  // ==== Calidad =====
  calidad: any = null;

  openComentariosModal() {
    const filtros = { fechaDesde: undefined, fechaHasta: undefined };
    this.dashboardService.getComentarios(filtros).subscribe({
      next: (resp) => {
        const comentarios = resp.data || [];
        this.modalService.open(ComentariosModalComponent, { size: 'lg' }).componentInstance.comentarios = comentarios;
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
        this.calidad = resp.data;
      },
      error: (err) => {
        console.error('Error cargando métricas de calidad', err);
      }
    });
  }

  generateParticles() {
    this.particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1200),
      y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
    }));
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
    this.router.navigate(["/audit-dashboard"]);
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
    // Mock implementation - en producción conectar con servicio real
    return Math.floor(Math.random() * 50) + 10;
  }
}
