import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfigService } from '../services/config.service';
import { AuthService } from '../inicio-sesion/auth.service';

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-config.component.html',
  styleUrls: ['./admin-config.component.css']
})
export class AdminConfigComponent implements OnInit {
  particles: { x: number; y: number }[] = Array(20).fill(0).map(() => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight
  }));

  configTurnos: any = {
    dias_min_confirmacion: null,
    dias_max_no_confirm: null,
    hora_corte_confirmacion: null,
    habilitar_cancelacion_automatica: false,
    habilitar_recordatorios: false,
    dias_recordatorio_confirmacion: null,
    hora_envio_recordatorios: null
  };
  configNotif: any = {
    habilitar_email: true,
    habilitar_sms: false,
    nombre_clinica: '',
    email_notificaciones: ''
  };
  ultimaModificacion: { fecha: string, usuario: string } | null = null;
  isSaving = false;
  isResetting = false;
  diasMinError = false;
  saveSuccess = false;
  saveError: string | null = null;
  originalConfigTurnos: any = {};

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.cargarConfigs();
    this.cargarUltimaModificacion();
  }

  cargarConfigs() {
    this.configService.getResumenTurnos().subscribe({
      next: (res) => {
        console.log('Respuesta del backend (turnos):', res);
        this.configTurnos = {
          dias_min_confirmacion: res.dias_min_confirmacion ?? 2,
          dias_max_no_confirm: res.dias_max_no_confirm ?? 7,
          hora_corte_confirmacion: res.hora_corte_confirmacion ?? '00:00',
          habilitar_cancelacion_automatica: res.cancelacion_automatica_habilitada ?? false,
          habilitar_recordatorios: res.recordatorios_habilitados ?? false,
          dias_recordatorio_confirmacion: res.dias_recordatorio ?? 4,
          hora_envio_recordatorios: res.hora_envio_recordatorios ?? '09:00'
        };
        this.originalConfigTurnos = { ...this.configTurnos };
        console.log('configTurnos después de cargar:', this.configTurnos);
        this.validateDiasMin();
      },
      error: (err) => {
        console.error('Error al cargar configuraciones de turnos:', err);
        alert('Error al cargar configuraciones: ' + (err.error?.message || err.message));
      }
    });

    this.configService.getResumenNotificaciones().subscribe({
      next: (res) => {
        console.log('Respuesta del backend (notificaciones):', res);
        this.configNotif = {
          habilitar_email: res.email_habilitado ?? true,
          habilitar_sms: res.sms_habilitado ?? false,
          nombre_clinica: res.nombre_clinica ?? 'Clínica Médica',
          email_notificaciones: res.email_notificaciones ?? 'notificaciones@clinica.com'
        };
      },
      error: (err) => {
        console.error('Error al cargar configuraciones de notificaciones:', err);
        alert('Error al cargar configuraciones: ' + (err.error?.message || err.message));
      }
    });
  }

  cargarUltimaModificacion() {
    this.configService.getUltimaMod().subscribe({
      next: (res) => {
        if (res) {
          this.ultimaModificacion = {
            fecha: res.performedAt,
            usuario: res.performedBy
          };
        }
      },
      error: (err) => {
        this.saveError = `Error al cargar última modificación: ${err.error?.message || err.message}`;
        console.error('Error al cargar última modificación:', err);
      }
    });
  }

  validateDiasMin() {
    if (this.configTurnos.dias_min_confirmacion == null || this.configTurnos.dias_max_no_confirm == null) {
      this.diasMinError = false;
      console.log('Validación omitida: valores no cargados aún');
      return;
    }

    const diasMin = Number(this.configTurnos.dias_min_confirmacion);
    const diasMax = Number(this.configTurnos.dias_max_no_confirm);

    this.diasMinError = isNaN(diasMin) || isNaN(diasMax) ||
      diasMin < 1 ||
      diasMin >= diasMax;

    console.log(`Validación diasMinError: ${this.diasMinError}, dias_min_confirmacion: ${diasMin}, dias_max_no_confirm: ${diasMax}`);
  }

  testClick(event: MouseEvent) {
    console.log('Botón clicado:', event);
    this.guardarCambios();
  }

  guardarCambios() {
    console.log('guardarCambios() ejecutado');
    this.validateDiasMin();
    if (this.diasMinError) {
      console.log('No se puede guardar: diasMinError es true');
      this.saveError = 'Por favor, corrige los errores en los días de confirmación antes de guardar.';
      return;
    }

    this.isSaving = true;
    this.saveError = null;
    const updates = [
      ...Object.entries(this.configTurnos).map(([key, value]) => ({
        clave: `turnos.${key}`,
        valor: value,
        changed: JSON.stringify(this.originalConfigTurnos[key]) !== JSON.stringify(value)
      })),
      ...Object.entries(this.configNotif).map(([key, value]) => ({
        clave: `notificaciones.${key}`,
        valor: value,
        changed: true
      }))
    ].filter(update => update.valor !== undefined && update.valor !== null && update.changed);

    console.log('Cambios a enviar:', updates);

    if (updates.length === 0) {
      this.isSaving = false;
      this.saveError = 'No hay cambios para guardar.';
      return;
    }

    let completed = 0;
    updates.forEach(update => {
      const payload = { clave: update.clave, valor: update.valor }; // Excluir 'changed'
      console.log(`Enviando actualización para ${update.clave}: ${update.valor}`);
      this.configService.updateConfig(payload).subscribe({
        next: (response) => { // Ahora recibe string
          console.log(`Actualización exitosa para ${update.clave}: ${response}`);
          completed++;
          if (completed === updates.length) {
            this.isSaving = false;
            this.saveSuccess = true;
            this.originalConfigTurnos = { ...this.configTurnos };
            this.cargarUltimaModificacion();
            setTimeout(() => this.saveSuccess = false, 5000);
          }
        },
        error: (err) => {
          this.isSaving = false;
          this.saveError = `Error al guardar ${update.clave}: ${err.error || err.message || 'Error desconocido'}`;
          console.error(`Error al guardar ${update.clave}:`, err);
        }
      });
    });
  }

  restaurarDefaults() {
    console.log('restaurarDefaults() ejecutado');
    this.isResetting = true;
    this.configService.resetDefaults().subscribe({
      next: () => {
        this.isResetting = false;
        alert('Configuraciones restauradas a valores por defecto.');
        this.cargarConfigs();
        this.cargarUltimaModificacion();
      },
      error: (err) => {
        this.isResetting = false;
        console.error('Error al restaurar defaults:', err);
        alert('Error al restaurar defaults: ' + (err.error?.message || err.message));
      }
    });
  }

  logout() {
    console.log('logout() ejecutado');
    this.authService.logout();
    this.router.navigate(['/']);
  }
}