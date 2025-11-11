import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { TurnoService } from "../turnos/turno.service";
import { Turno } from "../turnos/turno";
import { DataPackage } from "../data.package";
import { NotificacionService } from "../services/notificacion.service";
import { EncuestaService } from "../services/encuesta.service";
import { AuthService } from "../inicio-sesion/auth.service";
import { ModalService } from "../modal/modal.service";

@Component({
  selector: "app-paciente-dashboard",
  imports: [CommonModule, FormsModule],
  templateUrl: "./paciente-dashboard.component.html",
  styleUrl: "./paciente-dashboard.component.css",
})
export class PacienteDashboardComponent implements OnInit, OnDestroy {
  patientDNI: string = "";
  patientName: string = "";
  patientEmail: string = "";
  proximosTurnos: any[] = [];
  allTurnos: any[] = [];
  filteredTurnos: any[] = [];
  isLoadingTurnos = false;
  currentFilter: "upcoming" | "past" | "all" = "upcoming";

  // Notificaciones
  contadorNotificaciones = 0;
  // Mapa de encuestas pendientes por turnoId
  surveyPendingMap: { [turnoId: number]: boolean } = {};

  // Modal de cancelación con motivo
  showReasonModal: boolean = false;
  selectedTurno: any = null;
  motivo: string = "";
  isSubmitting: boolean = false;
  showErrorModal: boolean = false;
  errorMessage: string = '';
  // Particles for background animation
  particles: { x: number; y: number }[] = [];
  // Intervalo para verificar nuevos turnos cada 5 minutos
  private verificacionInterval: any;

  readonly ESTADOS_FLUJO: string[] = [
    'PROGRAMADO',   // Estado inicial
    'CONFIRMADO',   // Estado confirmado
    'COMPLETO'      // Estado final exitoso
  ];


  // Antes del constructor

  /**
   * Calcula el progreso visual del turno según su estado
   */
  getProgresoTurno(estado: string): {
    progress: number;
    colorClass: string;
    isTerminal: boolean;
    texto: string;
  } {
    const estadoUpper = estado?.toUpperCase() || 'PROGRAMADO';

    // Estados terminales
    if (estadoUpper === 'COMPLETO') {
      return {
        progress: 100,
        colorClass: 'bg-success',
        isTerminal: true,
        texto: 'Completado'
      };
    }

    if (estadoUpper === 'CANCELADO') {
      return {
        progress: 100,
        colorClass: 'bg-danger',
        isTerminal: true,
        texto: 'Cancelado'
      };
    }

    // Estados del flujo normal
    const indice = this.ESTADOS_FLUJO.findIndex(
      e => e === estadoUpper
    );

    if (indice === -1) {
      // Estado desconocido
      return {
        progress: 0,
        colorClass: 'bg-secondary',
        isTerminal: false,
        texto: 'Desconocido'
      };
    }

    // Calcular progreso: 0% (Programado), 50% (Confirmado), 100% (Completo)
    const progress = (indice / (this.ESTADOS_FLUJO.length - 1)) * 100;

    // Determinar color según el estado
    let colorClass = 'bg-primary';
    if (estadoUpper === 'PROGRAMADO' || estadoUpper === 'REAGENDADO') {
      colorClass = 'bg-warning';
    } else if (estadoUpper === 'CONFIRMADO') {
      colorClass = 'bg-info';
    }

    return {
      progress: Math.round(progress),
      colorClass: colorClass,
      isTerminal: false,
      texto: this.getTextoEstado(estadoUpper)
    };
  }

  /**
   * Convierte el estado técnico a texto amigable
   */
  getTextoEstado(estado: string): string {
    const estadoMap: { [key: string]: string } = {
      'PROGRAMADO': 'Programado',
      'CONFIRMADO': 'Confirmado',
      'REAGENDADO': 'Reagendado',
      'COMPLETO': 'Completado',
      'CANCELADO': 'Cancelado'
    };

    return estadoMap[estado?.toUpperCase()] || estado;
  }


  constructor(
    private router: Router,
    private turnoService: TurnoService,
    private notificacionService: NotificacionService,
    private authService: AuthService,
    private encuestaService: EncuestaService,
    private modalService: ModalService
  ) {
    // Obtener datos del usuario autenticado
    this.patientEmail = this.authService.getUserEmail() || "";
    this.patientName = this.authService.getUserName() || "";
    // Para el DNI, lo obtenemos del localStorage por ahora
    this.patientDNI = localStorage.getItem("patientDNI") || "";
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

  ngOnInit() {
    this.cargarTurnosPaciente();
    this.cargarContadorNotificaciones();
    this.cargarNotificacionesNoLeidas();


    // Verificar cada 5 minutos si hay turnos que deben completarse
    this.verificacionInterval = setInterval(() => {
      this.verificarYActualizarTurnosPasados();
    }, 5 * 60 * 1000); // 5 minutos
  }


  // Agregar método de limpieza
  ngOnDestroy() {
    if (this.verificacionInterval) {
      clearInterval(this.verificacionInterval);
    }
  }

  // Agregar método de verificación periódica
  private verificarYActualizarTurnosPasados() {
    const pacienteId = this.authService.getCurrentPatientId();

    if (!pacienteId) {
      console.error("No se encontró ID del paciente en localStorage");
      return;
    }

    this.turnoService.getByPacienteId(pacienteId).subscribe({
      next: (dataPackage: DataPackage<Turno[]>) => {
        const turnos = dataPackage.data || [];
        let huboActualizaciones = false;

        const actualizaciones: Promise<void>[] = turnos.map(turno => {
          return new Promise((resolve) => {
            // ✅ Validar que el turno tenga ID antes de usarlo
            if (!turno.id) {
              console.warn("Turno sin ID encontrado, se omite.");
              resolve();
              return;
            }

            // ✅ Solo actualizar si corresponde
            if ((turno.estado === 'CONFIRMADO' || turno.estado === 'PROGRAMADO') && this.turnoYaPaso(turno)) {
              console.log(`Actualizando turno ${turno.id} a COMPLETO (verificación periódica)`);

              this.turnoService.updateEstado(
                turno.id, // ahora seguro no es undefined
                'COMPLETO',
                'Turno completado automáticamente'
              ).subscribe({
                next: () => {
                  huboActualizaciones = true;
                  resolve();
                },
                error: (error) => {
                  console.error(`Error actualizando turno ${turno.id}:`, error);
                  resolve();
                }
              });
            } else {
              resolve();
            }
          });
        });

        // Esperar a que terminen las actualizaciones
        Promise.all(actualizaciones).then(() => {
          if (huboActualizaciones) {
            console.log("Se detectaron actualizaciones, recargando turnos...");
            setTimeout(() => this.cargarTurnosPaciente(), 1000);
          }
        });
      },
      error: (error) => {
        console.error("Error obteniendo turnos del paciente:", error);
      }
    });
  }



  getFilterCount(filter: "upcoming" | "past" | "all"): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    switch (filter) {
      case "upcoming":
        return this.allTurnos.filter((turno) => {
          const fechaTurno = this.parseFecha(turno);
          return (
            fechaTurno >= hoy &&
            (turno.status === "confirmado" ||
              turno.status === "programado" ||
              turno.status === "reagendado")
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
    const pacienteId = this.authService.getCurrentPatientId();
    if (pacienteId && pacienteId > 0) {
      this.notificacionService
        .contarNotificacionesNoLeidas(pacienteId)
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

  cargarTurnosPaciente() {
    const pacienteId = this.authService.getCurrentPatientId();

    if (!pacienteId) {
      console.error("No se encontró ID del paciente en localStorage");
      return;
    }

    this.isLoadingTurnos = true;
    console.log("Cargando todos los turnos para paciente ID:", pacienteId);

    this.turnoService.getByPacienteId(pacienteId).subscribe({
      next: (dataPackage: DataPackage<Turno[]>) => {
        console.log("Turnos recibidos en dashboard:", dataPackage);
        const turnos = dataPackage.data || [];

        // Procesar turnos y actualizar los que ya pasaron
        const turnosActualizados: Promise<Turno>[] = turnos.map(turno => {
          return new Promise((resolve) => {
            // Validar que el turno tenga ID antes de procesar
            if (!turno.id) {
              console.warn('Turno sin ID encontrado, se omite');
              resolve(turno);
              return;
            }

            // Si el turno está CONFIRMADO/PROGRAMADO y ya pasó, actualizarlo a COMPLETO
            if ((turno.estado === 'CONFIRMADO' || turno.estado === 'PROGRAMADO') &&
              this.turnoYaPaso(turno)) {

              console.log(`Actualizando turno ${turno.id} a COMPLETO (fecha/hora pasada)`);

              this.turnoService.updateEstado(
                turno.id, // Ahora TypeScript sabe que no es undefined
                'COMPLETO',
                'Turno completado automáticamente'
              ).subscribe({
                next: () => {
                  turno.estado = 'COMPLETO';
                  resolve(turno);
                },
                error: (error) => {
                  console.error(`Error actualizando turno ${turno.id}:`, error);
                  resolve(turno);
                }
              });
            } else {
              resolve(turno);
            }
          });
        });

        // Esperar a que todos los turnos se procesen
        Promise.all(turnosActualizados).then((turnosProcesados) => {
          this.allTurnos = turnosProcesados.map((turno) =>
            this.convertirTurnoParaDashboard(turno)
          );

          this.applyFilter();
          this.isLoadingTurnos = false;
          // Después de cargar turnos, reconstruir el mapa de encuestas pendientes
          this.buildSurveyMapFromNotifications();
        });
      },
      error: (error) => {
        console.error("Error cargando turnos:", error);
        this.isLoadingTurnos = false;
      },
    });
  }

  private cargarNotificacionesNoLeidas() {
    const pacienteId = this.authService.getCurrentPatientId();
    if (!pacienteId) return;

    this.notificacionService.obtenerNotificacionesNoLeidas(pacienteId).subscribe({
      next: (notis) => {
        // Construir mapa inicial
        this.surveyPendingMap = {};
        (notis || []).forEach(n => {
          if (n && n.tipo === 'ENCUESTA_PENDIENTE' && n.turnoId) {
            this.surveyPendingMap[n.turnoId] = true;
          }
        });
      },
      error: (err) => console.error('Error cargando notificaciones no leidas:', err)
    });
  }

  private buildSurveyMapFromNotifications() {
    // Re-query current notificaciones no leidas to ensure map updated
    const pacienteId = this.authService.getCurrentPatientId();
    if (!pacienteId) return;
    this.notificacionService.obtenerNotificacionesNoLeidas(pacienteId).subscribe({
      next: (notis) => {
        this.surveyPendingMap = {};
        (notis || []).forEach(n => {
          if (n && n.tipo === 'ENCUESTA_PENDIENTE' && n.turnoId) {
            this.surveyPendingMap[n.turnoId] = true;
          }
        });
      },
      error: (err) => console.error('Error reconstruyendo mapa de encuestas:', err)
    });
    
    // Además, para los turnos que están en estado COMPLETO pero no tienen
    // notificación, consultar al backend si hay una encuesta pendiente y
    // actualizar el mapa para mostrar el botón.
    this.checkSurveyPendingForCompletedTurnos();
  }

  private checkSurveyPendingForCompletedTurnos() {
    const pacienteId = this.authService.getCurrentPatientId();
    if (!pacienteId) return;

    // Recorrer turnos completados y consultar si hay encuesta pendiente
    (this.allTurnos || []).forEach(turno => {
      if (turno && turno.status === 'completo' && !this.surveyPendingMap[turno.id]) {
        this.encuestaService.isEncuestaPendiente(turno.id).subscribe({
          next: (dp: any) => {
            // El backend devuelve { pending: boolean } en data
            const pending = dp && dp.data && (dp.data.pending === true || dp.data === true);
            if (pending) {
              this.surveyPendingMap[turno.id] = true;
            }
          },
          error: (err: any) => {
            console.error('Error verificando encuesta pendiente para turno', turno.id, err);
          }
        });
      }
    });
  }
  applyFilter() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    switch (this.currentFilter) {
      case "upcoming":
        this.filteredTurnos = this.allTurnos
          .filter((turno) => {
            const fechaTurno = this.parseFecha(turno);
            return (
              fechaTurno >= hoy &&
              (turno.status === "confirmado" ||
                turno.status === "programado" ||
                turno.status === "reagendado")
            );
          })
          .sort(
            (a, b) =>
              this.parseFecha(a).getTime() - this.parseFecha(b).getTime()
          );
        break;

      case "past":
        this.filteredTurnos = this.allTurnos
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
        this.filteredTurnos = [...this.allTurnos].sort(
          (a, b) => this.parseFecha(b).getTime() - this.parseFecha(a).getTime()
        );
        break;
    }
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

  setFilter(filter: "upcoming" | "past" | "all") {
    this.currentFilter = filter;
    this.applyFilter();
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
      case "upcoming":
        return "¡Programa tu próxima cita médica!";
      case "past":
        return "Aún no has tenido consultas médicas.";
      case "all":
        return "¡Programa tu primera cita médica!";
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
      completed: "Completado",
      cancelled: "Cancelado",
    };
    return statusMap[status] || status;
  }

  confirmarTurno(turno: any) {
    const confirmTitle = 'Confirmar Turno';
    const confirmMessage = `¿Deseas confirmar este turno?\n\nFecha: ${turno.day}/${turno.month}\nHora: ${turno.time}\nMédico: ${turno.doctor}`;

    this.modalService
      .confirm(confirmTitle, 'Confirmar', confirmMessage)
      .then(() => {
        // Usuario confirmó
        this.turnoService.confirmar(turno.id).subscribe({
          next: (response) => {

            // VERIFICAR SI LA RESPUESTA CONTIENE UN ERROR
            if (response.status_code && response.status_code >= 400) {
              // Es un error disfrazado de éxito
              console.error("Error detectado en respuesta exitosa:", response);

              this.errorMessage = response.status_text || 'Ocurrió un error al confirmar el turno';
              this.showErrorModal = true;
              return; // Detener ejecución
            }

            // Respuesta exitosa real
            console.log("Turno confirmado exitosamente:", response);
            turno.status = "confirmado";

            // Mostrar modal de éxito en lugar de alert
            this.modalService.alert(
              'Turno Confirmado',
              'Turno confirmado exitosamente. Te esperamos en la fecha y hora programada.'
            );

            this.cargarTurnosPaciente();
          },
          error: (error) => {
            // Extraer mensaje específico del backend
            if (error.error && error.error.status_text) {
              this.errorMessage = error.error.status_text;
            } else if (error.error && typeof error.error === 'string') {
              this.errorMessage = error.error;
            } else if (error.message) {
              this.errorMessage = error.message;
            } else {
              this.errorMessage = 'Ocurrió un error inesperado al intentar confirmar el turno. Por favor, intenta nuevamente.';
            }

            this.showErrorModal = true;
          },
        });
      })
      .catch(() => {
        // Usuario canceló - no hacer nada
        console.log('Confirmación de turno cancelada por el usuario');
      });
  }
  closeErrorModal() {
    console.log('Cerrando modal de error');
    this.showErrorModal = false;
    this.errorMessage = '';
  }
  reprogramarTurno(turno: any) {
    // Redirigir al componente de reagendamiento con el ID del turno
    this.router.navigate(["/paciente-reagendar-turno", turno.id]);
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

    // Solo se usa para cancelar, ya que reagendar redirige a otro componente
    this.turnoService
      .updateEstado(this.selectedTurno.id, "CANCELADO", this.motivo.trim())
      .subscribe({
        next: (response) => {
          console.log("Turno cancelado exitosamente:", response);
          alert("Turno cancelado exitosamente.");
          this.cargarTurnosPaciente();
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

  logout() {
    this.authService.logout();
    this.router.navigate(["/"]);
  }

  scheduleAppointment() {
    this.router.navigate(["/paciente-agenda"]);
  }

  viewAgenda() {
    this.router.navigate(["/paciente-agenda"]);
  }

  viewProfile() {
    // Navegar a la ruta específica para el perfil del paciente
    this.router.navigate(["/paciente-perfil"]);
  }

  viewPreferencias() {
    this.router.navigate(["/paciente-preferencias"]);
  }

  viewNotifications() {
    this.router.navigate(["/paciente-notificaciones"]);
  }

  viewHistorial() {
    this.router.navigate(["/paciente-historial"]);
  }

  abrirEncuesta(turnoId: number) {
    if (!turnoId) return;
    this.router.navigate(["/paciente/encuesta", turnoId]);
  }


  /**
   * Verifica si la fecha y hora de un turno ya pasaron
   */
  private turnoYaPaso(turno: Turno): boolean {
    const ahora = new Date();

    // Parsear fecha del turno
    const [year, month, day] = turno.fecha.split('-').map(Number);
    const fechaTurno = new Date(year, month - 1, day);

    // Parsear hora de fin del turno
    const [horas, minutos] = turno.horaFin.split(':').map(Number);
    fechaTurno.setHours(horas, minutos, 0, 0);

    return ahora > fechaTurno;
  }


  // Nuevo método: Valor de progreso % basado en status (para barra visible siempre)
  getProgressValue(status: string): number {
    const progressMap: { [key: string]: number } = {
      programado: 25,
      confirmado: 75,
      reagendado: 50,
      completo: 100,
      cancelado: 100
    };
    return progressMap[status] || 0;
  }
  // Nuevo método: Clase Bootstrap para color de barra
  getProgressClass(status: string): string {
    const classMap: { [key: string]: string } = {
      programado: 'progress-bar-programado',
      confirmado: 'progress-bar-confirmado',
      reagendado: 'progress-bar-reagendado',
      completo: 'progress-bar-completo',
      cancelado: 'progress-bar-cancelado'
    };
    return classMap[status] || 'progress-bar-secondary';
  }

  // Nuevo método: Label descriptivo para la barra
  getProgressLabel(status: string): string {
    const labelMap: { [key: string]: string } = {
      programado: 'Pendiente de confirmación',
      confirmado: 'Listo para asistir',
      reagendado: 'Reprogramando',
      completo: 'Atendido exitosamente',
      cancelado: 'Cancelado'
    };
    return labelMap[status] || 'Estado desconocido';
  }

  trackByTurnoId(index: number, turno: any): number {
    return turno.id;
  }
}
