import { Component, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { PacienteService } from "./paciente.service";
import { Paciente } from "./paciente";
import { DataPackage } from "../data.package";
import { ModalService } from "../modal/modal.service";
import { AuthService } from "../inicio-sesion/auth.service";

@Component({
  selector: "app-paciente-detail",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./paciente-detail.component.html", 
  styleUrl: "./paciente-detail.component.css",
})
export class PacienteDetailComponent implements OnInit {
  @ViewChild("form", { static: false }) form!: NgForm;

  paciente: Paciente = {
    id: 0,
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    dni: null,
    fechaNacimiento: "",
  };
  modoEdicion = false;
  obrasSociales: { id: number; nombre: string; codigo: string }[] = [];

  constructor(
    private pacienteService: PacienteService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.pacienteService
      .getObrasSociales()
      .subscribe(
        (dp: DataPackage<{ id: number; nombre: string; codigo: string }[]>) => {
          this.obrasSociales = dp.data;
        }
      );

    const path = this.route.snapshot.routeConfig?.path;
    if (path === "pacientes/new") {
      this.modoEdicion = true;
    } else {
      let id: number;

      // Si estamos en la ruta del perfil del paciente, usar el ID del localStorage
      if (path === "paciente-perfil") {
        console.log("Entrando a ruta paciente-perfil");

        // Usar el método robusto del AuthService para obtener el ID
        const pacienteId = this.authService.getCurrentPatientId();
        console.log("ID del paciente obtenido:", pacienteId);

        if (!pacienteId) {
          console.error("No se pudo obtener el ID del paciente actual");
          alert(
            "No se pudo cargar el perfil. Por favor, inicia sesión nuevamente."
          );
          this.authService.logout();
          this.router.navigate(["/ingresar"]);
          return;
        }

        id = pacienteId;
        console.log("ID final del paciente a buscar:", id);
      } else {
        // Para rutas de admin, usar el parámetro de la URL
        id = +this.route.snapshot.paramMap.get("id")!;
      }

      console.log("Llamando a pacienteService.get con ID:", id);
      this.pacienteService.get(id).subscribe({
        next: (dp: DataPackage<Paciente>) => {
          console.log("Respuesta del servicio de paciente:", dp);
          this.paciente = dp.data;

          // Asignar la obra social asociada al paciente
          if (this.paciente.obraSocial) {
            const obraSocial = this.obrasSociales.find(
              (os) => os.id === this.paciente.obraSocial?.id
            );
            if (obraSocial) {
              this.paciente.obraSocial = obraSocial;
            }
          }

          this.route.queryParams.subscribe((params) => {
            this.modoEdicion = params["edit"] === "true";
          });
        },
        error: (error) => {
          console.error("Error al obtener los datos del paciente:", error);
          alert(
            `Error al cargar el perfil: ${error.message || "Error desconocido"}`
          );
          this.router.navigate(["/paciente-dashboard"]);
        },
      });
    }
  }

  esNuevo(): boolean {
    return !this.paciente.id || this.paciente.id === 0;
  }

  isInvalidField(field: any): boolean {
    return field.invalid && (field.dirty || field.touched) && !field.disabled;
  }

  /**
   * Detecta si el usuario actual es administrador basándose en la ruta y el rol
   */
  private isAdmin(): boolean {
    const path = this.route.snapshot.routeConfig?.path;
    const userRole = this.authService.getUserRole();

    // Verificar por ruta: Las rutas de admin son 'pacientes/new' y 'pacientes/:id'
    // La ruta de paciente es 'paciente-perfil'
    const isAdminRoute = path !== "paciente-perfil";

    // Verificar por rol: ADMINISTRADOR u OPERADOR pueden crear pacientes
    const isAdminRole = userRole === "ADMINISTRADOR" || userRole === "OPERADOR";

    // Solo es admin si tanto la ruta como el rol indican que es admin/operador
    return isAdminRoute && isAdminRole;
  }

  /**
   * Detecta si el usuario actual es operador
   */
  private isOperador(): boolean {
    const userRole = this.authService.getUserRole();
    return userRole === "OPERADOR";
  }

  save(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.controls[key];
        if (!control.disabled) {
          control.markAsTouched();
        }
      });
      return;
    }

    const userRole = this.authService.getUserRole();
    let op;

    if (this.paciente.id) {
      // Para actualizaciones, siempre usar update
      op = this.pacienteService.update(this.paciente.id, this.paciente);
    } else {
      // Para creaciones, usar el endpoint correcto según el tipo de usuario
      const userEmail = this.authService.getUserEmail();
      const userData = this.authService.getUserData();
      
      // Preparar el paciente con la información de auditoría  
      const pacienteToCreate = {
        ...this.paciente,
        performedBy: userEmail || userData?.email || userRole || "UNKNOWN"
      };

      if (userRole === "ADMINISTRADOR") {
        op = this.pacienteService.createByAdmin(pacienteToCreate);
      } else if (userRole === "OPERADOR") {
        op = this.pacienteService.createByOperator(pacienteToCreate);
      } else {
        this.modalService.alert(
          "Error",
          "No tienes permisos para crear pacientes. Solo administradores y operadores pueden crear pacientes."
        );
        return;
      }
    }

    op.subscribe({
      next: (response) => {
        console.log("Respuesta recibida en next:", response);
        // Verificar si la respuesta indica un error (status_code diferente de 200)
        if (response.status_code && response.status_code !== 200) {
          const errorMessage = response.status_text || "Error al guardar el paciente.";
          this.modalService.alert("Error", errorMessage);
          console.log("Error detectado en respuesta exitosa:", errorMessage);
          return;
        }

        // Si llegamos aquí, es una respuesta exitosa
        const roleText = userRole === "ADMINISTRADOR" ? " por administrador" : 
                        userRole === "OPERADOR" ? " por operador" : "";
        const successMessage = this.esNuevo() 
          ? `Paciente creado correctamente${roleText}`
          : "Paciente actualizado correctamente";

        this.modalService.alert("Éxito", successMessage);
        // Redirigir según el contexto
        const path = this.route.snapshot.routeConfig?.path;
        if (path === "paciente-perfil") {
          this.router.navigate(["/paciente-dashboard"]);
        } else {
          this.router.navigate(["/pacientes"]);
        }
      },
      error: (err) => {
        console.log("Respuesta recibida en error:", err);
        let errorMessage = "Error al guardar el paciente.";
        
        if (err?.error?.status_text) {
          errorMessage = err.error.status_text;
        } else if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.modalService.alert("Error", errorMessage);
        console.error("Error al guardar paciente:", err);
      },
    });
  }

  goBack(): void {
    const path = this.route.snapshot.routeConfig?.path;
    if (path === "paciente-perfil") {
      // Si es un paciente viendo su perfil, volver al dashboard del paciente
      this.router.navigate(["/paciente-dashboard"]);
    } else {
      // Si es un admin, volver a la lista de pacientes
      this.router.navigate(["/pacientes"]);
    }
  }

  cancelar(): void {
    if (this.paciente.id) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        queryParamsHandling: "merge",
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
      queryParamsHandling: "merge",
    });
    this.modoEdicion = true;
  }

  remove(): void {
    if (!this.paciente.id) return;

    this.pacienteService.remove(this.paciente.id).subscribe({
      next: () => {
        this.modalService.alert("Éxito", "Paciente eliminado correctamente");
        this.goBack();
      },
      error: (err) => {
        const msg = err?.error?.message || "Error al eliminar el paciente.";
        this.modalService.alert("Error", msg);
        console.error("Error al eliminar paciente:", err);
      },
    });
  }

  confirmDelete(): void {
    this.modalService
      .confirm(
        "Eliminar paciente",
        "Confirmar eliminación",
        `¿Está seguro que desea eliminar el paciente ${this.paciente.nombre} ${this.paciente.apellido}?`
      )
      .then(() => this.remove())
      .catch(() => {});
  }

  esPacienteVendoSuPerfil(): boolean {
    const path = this.route.snapshot.routeConfig?.path;
    return path === "paciente-perfil";
  }

  /**
   * Verifica si el usuario actual puede cambiar contraseña
   * Los roles PACIENTE, OPERADOR y ADMINISTRADOR pueden cambiar su contraseña
   */
  puedeCambiarContrasena(): boolean {
    const userRole = this.authService.getUserRole();
    return userRole === "PACIENTE" || userRole === "OPERADOR" || userRole === "ADMINISTRADOR";
  }

  changePasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  changePassword() {
    if (!this.changePasswordForm.currentPassword ||
        !this.changePasswordForm.newPassword ||
        !this.changePasswordForm.confirmPassword) {
      this.modalService.alert('Error', 'Todos los campos de contraseña son obligatorios');
      return;
    }

    if (this.changePasswordForm.newPassword !== this.changePasswordForm.confirmPassword) {
      this.modalService.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (this.changePasswordForm.newPassword.length < 6) {
      this.modalService.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    const request = {
      currentPassword: this.changePasswordForm.currentPassword,
      newPassword: this.changePasswordForm.newPassword,
      confirmPassword: this.changePasswordForm.confirmPassword
    };

    this.authService.changePassword(request).subscribe({
      next: (response) => {
        if (response.status_code === 200) {
          this.modalService.alert('Éxito', 'Contraseña cambiada correctamente');
          this.changePasswordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };
        } else {
          this.modalService.alert('Error', response.status_text || 'Error al cambiar la contraseña');
        }
      },
      error: (error) => {
        const message = error?.error?.status_text || 'Error al cambiar la contraseña';
        this.modalService.alert('Error', message);
      }
    });
  }
}
