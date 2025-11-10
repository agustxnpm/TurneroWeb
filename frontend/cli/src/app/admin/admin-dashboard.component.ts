import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { AuthService } from "../inicio-sesion/auth.service";

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
    private router: Router
  ) { }

  ngOnInit() {
    this.generateParticles();
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
