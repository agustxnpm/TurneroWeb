import { Component, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { OperadorService } from "./operador.service";
import { Operador } from "./operador";
import { DataPackage } from "../data.package";
import { ModalService } from "../modal/modal.service";

@Component({
  selector: "app-operador-detail",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./operador-detail.component.html",
  styleUrl: './operador-detail.component.css',
})
export class OperadorDetailComponent implements OnInit {
  @ViewChild("form", { static: false }) form!: NgForm;
  operador: Operador = {
    id: 0,
    nombre: "",
    apellido: "",
    dni: null,
    email: "",
    activo: true,
    telefono: "",
  };

  modoEdicion = false;

  // Campos para manejar contraseñas en el front
  password: string = "";
  confirmPassword: string = "";
  cambiarPassword: boolean = false;

  constructor(
    private operadorService: OperadorService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path;
    if (path === "operadores/new") {
      this.modoEdicion = true;
    } else {
      const idParam = this.route.snapshot.paramMap.get("id");
      const id = idParam ? +idParam : 0;
      if (id <= 0) {
        // si no existe id válido, volver a la lista o mostrar error
        console.error("ID inválido para operador:", idParam);
        this.router.navigate(["/operadores"]);
        return;
      }

      this.operadorService.get(id).subscribe(
        (dp: DataPackage<Operador>) => {
          this.operador = dp.data;
          this.route.queryParams.subscribe((params) => {
            this.modoEdicion = params["edit"] === "true";
          });
        },
        (err) => {
          console.error("Error cargando operador:", err);
        }
      );
    }
  }

  esNuevo(): boolean {
    return !this.operador.id || this.operador.id === 0;
  }

  isInvalidField(field: any): boolean {
    return field.invalid && (field.dirty || field.touched);
  }

  passwordMismatch(): boolean {
    // Solo verificar match si estamos cambiando contraseña en edición (no en creación)
    if (!this.esNuevo() && this.cambiarPassword) {
      return (
        !!(this.password || this.confirmPassword) &&
        this.password !== this.confirmPassword
      );
    }
    return false;
  }

  toggleCambiarPassword() {
    this.cambiarPassword = !this.cambiarPassword;
    if (!this.cambiarPassword) {
      this.password = "";
      this.confirmPassword = "";
    }
  }

  save(): void {
    // marcar controles tocados para mostrar errores
    if (this.form.invalid || (!this.esNuevo() && this.cambiarPassword && this.passwordMismatch())) {
      Object.keys(this.form.controls).forEach((key) =>
        this.form.controls[key].markAsTouched()
      );
      return;
    }

    // Preparar payload
    const payload: any = { ...this.operador };
    
    if (this.esNuevo()) {
      // Para nuevos operadores: no incluir contraseña, se genera automáticamente
      delete payload.password;
    } else if (this.cambiarPassword) {
      // Para edición con cambio de contraseña: validar y agregar password
      if (!this.password || this.password.length < 6) {
        this.modalService.alert(
          "Error",
          "La contraseña debe tener al menos 6 caracteres."
        );
        return;
      }
      payload.password = this.password;
    } else {
      // Para edición sin cambio de contraseña: no incluir password
      delete payload.password;
    }

    // Seleccionar el método correcto según el caso
    const op$ = this.operador.id
      ? this.operadorService.update(this.operador.id, payload)
      : this.operadorService.createByAdmin(payload);

    op$.subscribe({
      next: (response) => {
        console.log("Respuesta recibida en next:", response);
        
        // Verificar si la respuesta indica un error (status_code diferente de 200)
        if (response.status_code && response.status_code !== 200) {
          const errorMessage = response.status_text || "Error al guardar el operador.";
          this.modalService.alert("Error", errorMessage);
          console.log("Error detectado en respuesta exitosa:", errorMessage);
          return;
        }

        // Si llegamos aquí, es una respuesta exitosa
        this.modalService.alert(
          "Éxito",
          this.esNuevo()
            ? "Operador creado correctamente. Se ha enviado una contraseña automática por correo electrónico."
            : "Operador actualizado correctamente"
        );
        this.router.navigate(["/operadores"]);
      },
      error: (err) => {
        console.log("Respuesta recibida en error:", err);
        let errorMessage = "Error al guardar el operador.";
        
        if (err?.error?.status_text) {
          errorMessage = err.error.status_text;
        } else if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.modalService.alert("Error", errorMessage);
        console.error("Error al guardar operador:", err);
      },
    });
  }

  goBack(): void {
    this.router.navigate(["/operadores"]);
  }

  cancelar(): void {
    this.modoEdicion = false;
    this.password = "";
    this.confirmPassword = "";
    this.cambiarPassword = false;
    if (this.esNuevo()) {
      this.router.navigate(["/operadores"]);
    }
  }

  activarEdicion(): void {
    this.modoEdicion = true;
  }

  remove(): void {
    if (!this.operador.id) return;
    this.operadorService.remove(this.operador.id).subscribe({
      next: () => {
        this.modalService.alert("Éxito", "Operador eliminado correctamente");
        this.goBack();
      },
      error: (err) => {
        this.modalService.alert(
          "Error",
          err?.error?.message || "Error al eliminar operador."
        );
      },
    });
  }

  confirmDelete(): void {
    this.modalService
      .confirm(
        "Eliminar operador",
        "Confirmar eliminación",
        `¿Está seguro que desea eliminar el operador ${this.operador.nombre} ${this.operador.apellido}?`
      )
      .then(() => this.remove())
      .catch(() => {});
  }
}
