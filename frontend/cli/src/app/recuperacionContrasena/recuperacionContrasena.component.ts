
import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { RecuperarContrasenaService } from "./recuperarContrasena.service";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
  selector: "app-recuperar-contrasena",
  standalone: true,
  templateUrl: "./recuperar-contrasena.component.html",
  styleUrls: ["./recuperar-contrasena.component.css"],
  imports: [CommonModule, ReactiveFormsModule],
})
export class RecuperarContrasenaComponent implements OnInit {

  correoForm!: FormGroup;
  passwordForm!: FormGroup;
  enviando = false;
  enviadoOk: boolean | null = null;
  mensaje = "";
  token: string | null = null;
  tokenValid: boolean | null = null;
  tokenChecked = false;
  resetSuccess = false;
  resetError = '';


  constructor(
    private fb: FormBuilder,
    private svc: RecuperarContrasenaService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.correoForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
    });
    this.passwordForm = this.fb.group({
      password: ["", [Validators.required, Validators.minLength(8)]],
      confirmPassword: ["", [Validators.required]],
    }, { validators: this.passwordsMatchValidator });

    // Detectar token en la URL
    this.token = this.route.snapshot.queryParams['token'] || null;
    if (this.token) {
      this.validarTokenRecuperacion(this.token);
    }
  }
  enviarSolicitud() {
    if (this.correoForm.invalid) {
      this.correoForm.markAllAsTouched();
      return;
    }
    this.enviando = true;
    this.enviadoOk = null;
    const email = this.correoForm.value.email;
    this.svc.requestReset(email).subscribe({
      next: (response) => {
        this.enviadoOk = response.status_code === 200;
        this.mensaje = response.status_text || "Se ha enviado un correo con instrucciones si la cuenta existe.";
        this.enviando = false;
      },
      error: (err) => {
        console.error("Error requestReset", err);
        // No revelar existencia de cuenta — mensaje genérico
        this.enviadoOk = false;
        this.mensaje = err?.error?.status_text || "Si el correo existe, recibirá instrucciones por email.";
        this.enviando = false;
      },
    });
  }

  // Validar token recibido en la URL
  private validarTokenRecuperacion(token: string) {
    this.tokenChecked = false;
    this.svc.validateResetToken(token).subscribe({
      next: (resp) => {
        this.tokenValid = resp.status_code === 200 && resp.data?.valid !== false;
        this.tokenChecked = true;
        if (!this.tokenValid) {
          this.resetError = resp.status_text || 'El enlace de recuperación es inválido o ha expirado.';
        }
      },
      error: (err) => {
        this.tokenValid = false;
        this.tokenChecked = true;
        this.resetError = err?.error?.status_text || 'El enlace de recuperación es inválido o ha expirado.';
      }
    });
  }

  // Enviar nueva contraseña
  enviarNuevaContrasena() {
    if (this.passwordForm.invalid || !this.token) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.enviando = true;
    this.svc.resetPassword(this.token, this.passwordForm.value.password).subscribe({
      next: (resp) => {
        this.enviando = false;
        if (resp.status_code === 200) {
          this.resetSuccess = true;
          this.resetError = '';
        } else {
          this.resetSuccess = false;
          this.resetError = resp.status_text || 'No se pudo restablecer la contraseña.';
        }
      },
      error: (err) => {
        this.enviando = false;
        this.resetSuccess = false;
        this.resetError = err?.error?.status_text || 'No se pudo restablecer la contraseña.';
      }
    });
  }

  // Validador para que las contraseñas coincidan
  private passwordsMatchValidator(form: FormGroup) {
    const pass = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pass === confirm ? null : { passwordsMismatch: true };
  }


  get emailControl() {
    return this.correoForm.get("email");
  }
  get passwordControl() {
    return this.passwordForm.get("password");
  }
  get confirmPasswordControl() {
    return this.passwordForm.get("confirmPassword");
  }
}
