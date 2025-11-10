import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { TurnoService } from "../turnos/turno.service";
import { Turno } from "../turnos/turno";
import { DataPackage } from "../data.package";
import { NotificacionService } from "../services/notificacion.service";
import { AuthService } from "../inicio-sesion/auth.service";
import { OperadorService } from "./operador.service"; // Asumiendo que existe este servicio para operadores

@Component({
  selector: "app-operador-dashboard",
  imports: [CommonModule, FormsModule],
  templateUrl: "./operador-dashboard.component.html",
  styleUrl: "./operador-dashboard.component.css",
})
export class OperadorDashboardComponent implements OnInit {
  operatorName: string = "";
  operatorEmail: string = "";
  allTurnos: any[] = [];
  filteredTurnos: any[] = [];
  isLoadingTurnos = false;
  currentFilter: "pending" | "upcoming" | "past" | "all" = "pending";
  searchQuery: string = "";

  // Notificaciones
  contadorNotificaciones = 0;

  // Modal de cancelación con motivo
  showReasonModal: boolean = false;
  selectedTurno: any = null;
  motivo: string = "";
  isSubmitting: boolean = false;

  // Particles for background animation
  particles: { x: number; y: number }[] = [];

  constructor(
    private router: Router,
    private turnoService: TurnoService,
    private notificacionService: NotificacionService,
    private authService: AuthService,
    private operadorService: OperadorService // Servicio para operadores
  ) {
    // Obtener datos del usuario autenticado
    this.operatorEmail = this.authService.getUserEmail() || "";
    this.operatorName = this.authService.getUserName() || "";
    this.generateParticles();
  }

  private generateParticles() {
    this.particles = [];
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x:
          Math.random() *
          (typeof window !== "undefined" ? window.innerWidth : 1200),
        y:
          Math.random() *
          (typeof window !== "undefined" ? window.innerHeight : 800),
      });
    }
  }
  isAuthenticated(): boolean {
    const userRole = localStorage.getItem("userRole");
    return userRole !== null && userRole !== "";
  }

  getUserName(): string {
    return this.authService.getUserName() || "Usuario";
  }
  getUserEmail(): string {
    return this.authService.getUserEmail() || "Usuario";
  }

  ngOnInit() {
    this.cargarTurnos();
    this.cargarContadorNotificaciones();
  }

  getFilterCount(filter: "pending" | "upcoming" | "past" | "all"): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    switch (filter) {
      case "pending":
        return this.allTurnos.filter((turno) => {
          return turno.status === "programado";
        }).length;

      case "upcoming":
        return this.allTurnos.filter((turno) => {
          const fechaTurno = this.parseFecha(turno);
          return (
            fechaTurno >= hoy &&
            (turno.status === "confirmado" || turno.status === "reagendado")
          );
        }).length;

      case "past":
        return this.allTurnos.filter((turno) => {
          const fechaTurno = this.parseFecha(turno);
          return fechaTurno < hoy || turno.status === "completo";
        }).length;

      case "all":
        return this.allTurnos.length;

      default:
        return 0;
    }
  }

  trackByTurno(index: number, turno: any): any {
    return turno.id || index;
  }

  private cargarContadorNotificaciones() {
    const operadorId = parseInt(localStorage.getItem("operadorId") || "0");
    if (operadorId > 0) {
      this.notificacionService
        .contarNotificacionesNoLeidas(operadorId)
        .subscribe({
          next: (count) => {
            this.contadorNotificaciones = count;
          },
          error: (error) => {
            console.error("Error cargando contador de notificaciones:", error);
          },
        });
    }
  }

  cargarTurnos() {
    this.isLoadingTurnos = true;
    console.log("Cargando todos los turnos para operador");

    this.turnoService.all().subscribe({
      next: (dataPackage: DataPackage<Turno[]>) => {
        console.log("Turnos recibidos en dashboard operador:", dataPackage);
        const turnos = dataPackage.data || [];

        // Convertir todos los turnos para el dashboard
        this.allTurnos = turnos.map((turno) =>
          this.convertirTurnoParaDashboard(turno)
        );

        // Aplicar filtro inicial
        this.applyFilter();

        this.isLoadingTurnos = false;
      },
      error: (error) => {
        console.error("Error cargando turnos:", error);
        this.isLoadingTurnos = false;
      },
    });
  }

  applyFilter() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let list = this.allTurnos;

    switch (this.currentFilter) {
      case "pending":
        list = list
          .filter((turno) => turno.status === "programado")
          .sort(
            (a, b) =>
              this.parseFecha(a).getTime() - this.parseFecha(b).getTime()
          );
        break;

      case "upcoming":
        list = list
          .filter((turno) => {
            const fechaTurno = this.parseFecha(turno);
            return (
              fechaTurno >= hoy &&
              (turno.status === "confirmado" || turno.status === "reagendado")
            );
          })
          .sort(
            (a, b) =>
              this.parseFecha(a).getTime() - this.parseFecha(b).getTime()
          );
        break;

      case "past":
        list = list
          .filter((turno) => {
            const fechaTurno = this.parseFecha(turno);
            return fechaTurno < hoy || turno.status === "completo";
          })
          .sort(
            (a, b) =>
              this.parseFecha(b).getTime() - this.parseFecha(a).getTime()
          );
        break;

      case "all":
        list = [...this.allTurnos].sort(
          (a, b) => this.parseFecha(b).getTime() - this.parseFecha(a).getTime()
        );
        break;
    }

    this.filteredTurnos = list;
    this.applySearch(); // Aplicar búsqueda sobre el filtro
  }

  private parseFecha(turno: any): Date {
    const meses = [
      "ENE",
      "FEB",
      "MAR",
      "ABR",
      "MAY",
      "JUN",
      "JUL",
      "AGO",
      "SEP",
      "OCT",
      "NOV",
      "DIC",
    ];
    const monthIndex = meses.indexOf(turno.month);
    return new Date(
      turno.year || new Date().getFullYear(),
      monthIndex,
      parseInt(turno.day)
    );
  }

  setFilter(filter: "pending" | "upcoming" | "past" | "all") {
    this.currentFilter = filter;
    this.applyFilter();
  }

  applySearch() {
    if (!this.searchQuery.trim()) {
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredTurnos = this.filteredTurnos.filter(
      (turno) =>
        turno.patientName.toLowerCase().includes(query) ||
        turno.doctor.toLowerCase().includes(query) ||
        turno.location.toLowerCase().includes(query) ||
        // turno.patientDNI.includes(query) ||
        turno.id.toString().includes(query)
    );
  }

  // Métodos para verificar qué acciones se pueden realizar
  canPerformActions(turno: any): boolean {
    return turno.status !== "cancelado" && turno.status !== "completo";
  }

  canConfirm(turno: any): boolean {
    return turno.status === "programado" || turno.status === "reagendado";
  }

  canReschedule(turno: any): boolean {
    return (
      turno.status === "programado" ||
      turno.status === "confirmado" ||
      turno.status === "reagendado"
    );
  }

  canCancel(turno: any): boolean {
    return (
      turno.status === "programado" ||
      turno.status === "confirmado" ||
      turno.status === "reagendado"
    );
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      confirmado: "check_circle",
      programado: "schedule",
      reagendado: "event_repeat",
      completo: "task_alt",
      cancelado: "cancel",
    };
    return iconMap[status] || "schedule";
  }

  getEmptyStateText(): string {
    switch (this.currentFilter) {
      case "pending":
        return "pendientes";
      case "upcoming":
        return "próximos";
      case "past":
        return "pasados";
      case "all":
        return "registrados";
      default:
        return "";
    }
  }

  getEmptyStateDescription(): string {
    switch (this.currentFilter) {
      case "pending":
        return "No hay turnos pendientes de confirmación.";
      case "upcoming":
        return "No hay turnos próximos programados.";
      case "past":
        return "No hay turnos pasados registrados.";
      case "all":
        return "No hay turnos en el sistema.";
      default:
        return "";
    }
  }

  private convertirTurnoParaDashboard(turno: Turno): any {
    // Parsear fecha sin conversión a UTC para evitar problemas de zona horaria
    const [year, month, day] = turno.fecha.split("-").map(Number);
    const fecha = new Date(year, month - 1, day); // month es 0-indexed
    const meses = [
      "ENE",
      "FEB",
      "MAR",
      "ABR",
      "MAY",
      "JUN",
      "JUL",
      "AGO",
      "SEP",
      "OCT",
      "NOV",
      "DIC",
    ];

    return {
      id: turno.id,
      day: fecha.getDate().toString().padStart(2, "0"),
      month: meses[fecha.getMonth()],
      year: fecha.getFullYear(),
      time: turno.horaInicio,
      patientName: `${turno.nombrePaciente} ${turno.apellidoPaciente}`,
      doctor: `${turno.staffMedicoNombre} ${turno.staffMedicoApellido}`,
      specialty: turno.especialidadStaffMedico,
      location: turno.nombreCentro,
      status: turno.estado?.toLowerCase() || "programado",
    };
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      confirmado: "Confirmado",
      programado: "Programado",
      reagendado: "Reagendar",
      completo: "Completado",
      cancelado: "Cancelado",
    };
    return statusMap[status] || status;
  }

  confirmarTurno(turno: any) {
    const confirmMessage = `¿Deseas confirmar este turno?\n\nFecha: ${turno.day}/${turno.month}\nHora: ${turno.time}\nPaciente: ${turno.patientName}`;

    if (confirm(confirmMessage)) {
      this.turnoService.confirmar(turno.id).subscribe({
        next: (response) => {
          console.log("Turno confirmado exitosamente:", response);
          // Actualizar el estado localmente
          turno.status = "confirmado";
          // Mostrar mensaje de éxito
          alert("Turno confirmado exitosamente.");
          // Recargar la lista de turnos para reflejar cambios
          this.cargarTurnos();
        },
        error: (error) => {
          console.error("Error confirmando el turno:", error);
          alert(
            "No se pudo confirmar el turno. Por favor, intenta nuevamente."
          );
        },
      });
    }
  }

  reprogramarTurno(turno: any) {
    // Redirigir al componente de reagendamiento con el ID del turno
    this.router.navigate(["/operador-reagendar-turno", turno.id]); // Asumiendo una ruta específica para operador
  }

  cancelarTurno(turno: any) {
    this.selectedTurno = turno;
    this.motivo = "";
    this.showReasonModal = true;
  }

  closeModal() {
    this.showReasonModal = false;
    this.motivo = "";
    this.selectedTurno = null;
    this.isSubmitting = false;
  }

  submitReason() {
    if (!this.motivo.trim()) {
      alert("Por favor, ingresa un motivo.");
      return;
    }

    if (this.motivo.trim().length < 5) {
      alert("El motivo debe tener al menos 5 caracteres.");
      return;
    }

    this.isSubmitting = true;

    this.turnoService
      .updateEstado(this.selectedTurno.id, "CANCELADO", this.motivo.trim())
      .subscribe({
        next: (response) => {
          console.log("Turno cancelado exitosamente:", response);
          alert("Turno cancelado exitosamente.");
          this.cargarTurnos();
          this.closeModal();
        },
        error: (error) => {
          console.error("Error cancelando el turno:", error);
          let errorMessage = "No se pudo cancelar el turno.";
          if (error.error && error.error.status_text) {
            errorMessage += " Motivo: " + error.error.status_text;
          }
          alert(errorMessage);
          this.isSubmitting = false;
        },
      });
  }

  verDetalle(turnoId: number) {
    this.router.navigate(["/turnos", turnoId]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(["/"]);
  }

  scheduleAppointment() {
    this.router.navigate(["/turnos"]); // Ruta para agendar turno como operador
  }

  goToTurnos() {
    this.router.navigate(["/turnos"]);
  }

  goToOperadores() {
    this.router.navigate(["/operadores"]);
  }

  goToCentros() {
    this.router.navigate(["/centrosAtencion"]);
  }

  goToReportes() {
    this.router.navigate(["/turnos/audit-dashboard"]);
  }

  viewNotifications() {
    this.router.navigate(["/operador-notificaciones"]); // Ruta adaptada para operador
  }

  // Navegación para gestión de pacientes
  goToPacientes() {
    this.router.navigate(["/pacientes"]);
  }

  createPaciente() {
    this.router.navigate(["/pacientes/new"]);
  }

  // Navegación para gestión de médicos
  goToMedicos() {
    this.router.navigate(["/medicos"]);
  }

  createMedico() {
    this.router.navigate(["/medicos/new"]);
  }
}
