import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TurnoService } from '../turnos/turno.service';
import { DisponibilidadMedicoService } from '../disponibilidadMedicos/disponibilidadMedico.service';
import { MedicoService } from './medico.service';
import { Turno } from '../turnos/turno';
import { DisponibilidadMedico } from '../disponibilidadMedicos/disponibilidadMedico';
import { Medico } from './medico';
import { AuthService } from '../inicio-sesion/auth.service';
import { StaffMedicoService } from '../staffMedicos/staffMedico.service';

interface DashboardStats {
  turnosHoy: number;
  turnosManana: number;
  turnosSemana: number;
  turnosPendientes: number;
}

@Component({
  selector: 'app-medico-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medico-dashboard.component.html',
  styleUrl: './medico-dashboard.component.css'
})
export class MedicoDashboardComponent implements OnInit {
  medicoActual: Medico | null = null;
  staffMedicoId: number | null = null; // ID para consultar turnos
  stats: DashboardStats = {
    turnosHoy: 0,
    turnosManana: 0,
    turnosSemana: 0,
    turnosPendientes: 0
  };
  turnosHoy: Turno[] = [];
  proximosTurnos: Turno[] = [];
  disponibilidadActual: DisponibilidadMedico[] = [];
  fechaHoy: Date = new Date();

  // === NUEVA FUNCIONALIDAD: GESTIÓN COMPLETA DE TURNOS ===
  allTurnos: any[] = [];          // Todos los turnos del médico
  filteredTurnos: any[] = [];     // Turnos filtrados según el tab activo
  currentFilter = 'upcoming';     // 'upcoming', 'past', 'all'
  isLoadingTurnos = false;        // Estado de carga

  // Particles for background animation
  particles: Array<{ x: number, y: number }> = [];

  constructor(
    private router: Router,
    private turnoService: TurnoService,
    private disponibilidadService: DisponibilidadMedicoService,
    private medicoService: MedicoService,
    private authService: AuthService,
    private staffMedicoService: StaffMedicoService
  ) {
    this.initializeParticles();
  }

  /**
   * Valida y corrige problemas comunes en localStorage
   */
  private validarYCorregirLocalStorage() {
    console.log('🔍 Validando localStorage...');

    const medicoId = localStorage.getItem('medicoId');
    const staffMedicoId = localStorage.getItem('staffMedicoId');
    const currentUser = localStorage.getItem('currentUser');

    console.log('📋 Estado actual del localStorage:', {
      medicoId,
      staffMedicoId,
      currentUser: currentUser ? 'exists' : 'null'
    });

    // Verificar si tenemos los IDs correctos
    if (!medicoId || medicoId === '0' || medicoId === 'null') {
      console.warn('⚠️ medicoId faltante o inválido');

      // Intentar recuperar desde currentUser
      if (currentUser) {
        try {
          const user = JSON.parse(currentUser);
          if (user.medicoId && user.medicoId !== 0) {
            console.log('🔧 Corrigiendo medicoId desde currentUser:', user.medicoId);
            localStorage.setItem('medicoId', user.medicoId.toString());
          } else if (user.id && user.id !== 0 && user.id !== parseInt(staffMedicoId || '0', 10)) {
            console.log('🔧 Usando user.id como medicoId:', user.id);
            localStorage.setItem('medicoId', user.id.toString());
          }
        } catch (e) {
          console.error('Error parseando currentUser:', e);
        }
      }
    }

    // Verificar que medicoId y staffMedicoId no sean el mismo (común error)
    const finalMedicoId = localStorage.getItem('medicoId');
    const finalStaffMedicoId = localStorage.getItem('staffMedicoId');

    if (finalMedicoId === finalStaffMedicoId && finalMedicoId && finalMedicoId !== '0') {
      console.warn('🚨 PROBLEMA: medicoId y staffMedicoId son iguales!', {
        medicoId: finalMedicoId,
        staffMedicoId: finalStaffMedicoId
      });
      // No limpiar automáticamente, pero alertar del problema
      console.warn('Esto puede causar errores de autenticación');
    }

    console.log('✅ Validación de localStorage completada');
  }

  async ngOnInit() {
    // Validar y corregir localStorage al inicializar
    this.validarYCorregirLocalStorage();

    // Asegurar que staffMedicoId esté disponible en localStorage
    await this.getOrFetchStaffMedicoId();

    // Primero cargar los datos del médico (esto puede actualizar localStorage con el ID real)
    await this.cargarDatosMedicoAsync();

    // Luego cargar disponibilidades para obtener el staffMedicoId correcto
    this.cargarDisponibilidadYDatos();
  }

  private cargarDatosMedicoAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      const medicoId = this.getMedicoIdFromLocalStorage();

      // Caso especial: buscar por email usando AuthService
      if (medicoId === -1) {
        const userEmail = this.authService.getUserEmail();
        if (!userEmail) {
          console.error('No se pudo obtener el email del usuario autenticado');
          alert('Error: Sesión inválida. Por favor, inicie sesión nuevamente.');
          this.router.navigate(['/ingresar']);
          reject('No email found');
          return;
        }

        console.log('Buscando médico por email:', userEmail);
        this.medicoService.findByEmail(userEmail).subscribe({
          next: (response: any) => {
            if (response && response.data) {
              this.medicoActual = response.data;
              console.log('Médico cargado exitosamente por email:', this.medicoActual);
              // Guardar el ID para futuros usos
              if (this.medicoActual && this.medicoActual.id) {
                localStorage.setItem('medicoId', this.medicoActual.id.toString());
                console.log('✅ ID del médico guardado en localStorage:', this.medicoActual.id);
              }
              resolve();
            } else {
              console.error('No se encontró médico con email:', userEmail);
              alert('Error: No se encontró un médico asociado a esta cuenta.');
              this.router.navigate(['/ingresar']);
              reject('Médico no encontrado');
            }
          },
          error: (error: any) => {
            console.error('Error buscando médico por email:', error);
            alert('Error al cargar datos del médico. Por favor, inicie sesión nuevamente.');
            this.router.navigate(['/ingresar']);
            reject(error);
          }
        });
        return;
      }

      if (!medicoId || medicoId <= 0) {
        console.error('No se pudo obtener el ID del médico');
        console.log('Debug localStorage:', {
          staffMedicoId: localStorage.getItem('staffMedicoId'),
          medicoId: localStorage.getItem('medicoId'),
          currentUser: localStorage.getItem('currentUser')
        });
        alert('Error: No se pudo obtener el ID del médico. Por favor, inicie sesión nuevamente.');
        this.router.navigate(['/ingresar']);
        reject('ID inválido');
        return;
      }

      console.log('Cargando médico con ID:', medicoId);

      this.medicoService.findById(medicoId).subscribe({
        next: (medico) => {
          this.medicoActual = medico;
          console.log('Médico cargado exitosamente:', medico);
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar médico:', error);
          if (error.status === 404) {
            alert(`Médico con ID ${medicoId} no encontrado. Por favor, contacte al administrador.`);
          } else {
            console.error('Error del servidor:', error.message || error);
            alert(`Error al cargar información del médico: ${error.error?.message || error.message}`);
          }
          reject(error);
        }
      });
    });
  }

  private cargarDisponibilidadYDatos() {
    // Después de cargarDatosMedicoAsync(), el ID real debería estar en localStorage
    let medicoId = this.getMedicoIdFromLocalStorage();

    // Si todavía es -1, intentar obtener el ID real del localStorage actualizado
    if (medicoId === -1) {
      const medicoIdStr = localStorage.getItem('medicoId');
      if (medicoIdStr && medicoIdStr !== 'null' && medicoIdStr !== '0') {
        medicoId = parseInt(medicoIdStr, 10);
        console.log('✅ ID del médico obtenido del localStorage actualizado:', medicoId);
      }
    }

    if (!medicoId || medicoId === -1) {
      console.error('No se pudo obtener el ID del médico para cargar disponibilidad');
      return;
    }

    console.log('Cargando disponibilidades para obtener staffMedicoId...');

    this.disponibilidadService.byMedico(medicoId).subscribe({
      next: (response) => {
        this.disponibilidadActual = response.data || [];

        // Obtener el staffMedicoId de las disponibilidades
        if (this.disponibilidadActual.length > 0) {
          this.staffMedicoId = this.disponibilidadActual[0].staffMedicoId;
          console.log('staffMedicoId obtenido de disponibilidades:', this.staffMedicoId);

          // Ahora cargar los datos de turnos con el staffMedicoId correcto
          this.cargarDatos();
        } else {
          console.warn('No se encontraron disponibilidades. Usando ID del médico como staffMedicoId');
          this.staffMedicoId = medicoId; // Usar el ID real del médico
          console.log('✅ Usando medicoId como staffMedicoId:', this.staffMedicoId);
          this.cargarDatos();
        }
      },
      error: (error) => {
        console.error('Error al cargar disponibilidad:', error);
        console.warn('Usando ID del médico como staffMedicoId por error en disponibilidades');
        this.staffMedicoId = medicoId; // Usar el ID real del médico
        console.log('✅ Usando medicoId como staffMedicoId (fallback):', this.staffMedicoId);
        this.cargarDatos();
      }
    });
  }

  private cargarDatos() {
    // Solo cargar si tenemos el staffMedicoId
    if (!this.staffMedicoId) {
      console.error('No se pudo obtener el staffMedicoId para cargar datos');
      return;
    }

    console.log('Cargando datos con staffMedicoId:', this.staffMedicoId);
    this.cargarEstadisticas();
    // this.cargarTurnosHoy(); // Ya incluido en cargarEstadisticas()
    // this.cargarProximosTurnos(); // Ya incluido en cargarEstadisticas()
  }

  // Helper method to get medico ID from localStorage (fallback) or AuthService
  private getMedicoIdFromLocalStorage(): number | null {
    console.log('=== DEBUG: getMedicoIdFromLocalStorage ===');

    // PRIMERA OPCIÓN: Usar AuthService moderno para obtener el médico por email
    const userEmail = this.authService.getUserEmail();
    if (userEmail) {
      console.log('Usando AuthService - Email del usuario:', userEmail);
      // En lugar de hacer la búsqueda aquí, delegamos a cargarDatosMedico() 
      // para hacer la búsqueda por email
      return -1; // Valor especial para indicar que se debe buscar por email
    }

    // FALLBACK: Intentar obtener de localStorage (sistema legacy)
    const staffMedicoId = localStorage.getItem('staffMedicoId');
    const medicoId = localStorage.getItem('medicoId');
    const currentUser = localStorage.getItem('currentUser');

    console.log('LocalStorage values:', {
      staffMedicoId,
      medicoId,
      currentUser: currentUser ? 'exists' : 'null'
    });

    // First try medicoId (este es el ID correcto del médico)
    if (medicoId && medicoId !== '0' && medicoId !== 'null' && medicoId !== 'undefined') {
      const id = parseInt(medicoId, 10);
      if (!isNaN(id) && id > 0) {
        console.log('✅ Using medicoId:', id);
        return id;
      }
    }

    // Finally try currentUser
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        console.log('Parsed currentUser:', user);

        if (user.medicoId && user.medicoId !== 0) {
          console.log('Using currentUser.medicoId:', user.medicoId);
          return user.medicoId;
        }
        if (user.id && user.id !== 0) {
          console.log('Using currentUser.id:', user.id);
          return user.id;
        }
      } catch (e) {
        console.error('Error parsing currentUser from localStorage:', e);
      }
    }

    console.error('No valid medico ID found in localStorage');
    return null;
  }

  // Helper method to get or fetch staffMedicoId and store it in localStorage
  private getOrFetchStaffMedicoId(): Promise<number | null> {
    return new Promise((resolve) => {
      // First try to get staffMedicoId from localStorage
      const staffMedicoIdStr = localStorage.getItem('staffMedicoId');

      if (staffMedicoIdStr && staffMedicoIdStr !== 'null' && staffMedicoIdStr !== '0') {
        const staffMedicoId = parseInt(staffMedicoIdStr, 10);
        if (!isNaN(staffMedicoId) && staffMedicoId > 0) {
          console.log('✅ Found staffMedicoId in localStorage:', staffMedicoId);
          resolve(staffMedicoId);
          return;
        }
      }

      // If not in localStorage, fetch by medicoId
      const medicoId = this.getMedicoIdFromLocalStorage();
      if (!medicoId || medicoId === -1) {
        console.error('❌ No medicoId found to search for staffMedicoId');
        resolve(null);
        return;
      }

      console.log('🔍 Searching for StaffMedico by medicoId:', medicoId);

      this.staffMedicoService.all().subscribe({
        next: (response: any) => {
          const staffMedicos = response?.data || [];

          // Find all StaffMedicos that belong to this doctor
          const staffMedicosDelMedico = staffMedicos.filter((sm: any) =>
            sm.medico && sm.medico.id === medicoId
          );

          if (staffMedicosDelMedico.length > 0) {
            const staffMedicoId = staffMedicosDelMedico[0].id;
            console.log(`✅ Found ${staffMedicosDelMedico.length} StaffMedico records for doctor. Using first one:`, staffMedicoId);

            // Store in localStorage for future use
            localStorage.setItem('staffMedicoId', staffMedicoId.toString());
            resolve(staffMedicoId);
          } else {
            console.error('❌ No StaffMedico records found for medicoId:', medicoId);
            resolve(null);
          }
        },
        error: (error: any) => {
          console.error('❌ Error fetching StaffMedicos:', error);
          resolve(null);
        }
      });
    });
  }

  private cargarDatosMedico() {
    const medicoId = this.getMedicoIdFromLocalStorage();

    // Caso especial: buscar por email usando AuthService
    if (medicoId === -1) {
      const userEmail = this.authService.getUserEmail();
      if (!userEmail) {
        console.error('No se pudo obtener el email del usuario autenticado');
        alert('Error: Sesión inválida. Por favor, inicie sesión nuevamente.');
        this.router.navigate(['/ingresar']);
        return;
      }

      console.log('Buscando médico por email:', userEmail);
      this.medicoService.findByEmail(userEmail).subscribe({
        next: (response: any) => {
          if (response && response.data) {
            this.medicoActual = response.data;
            console.log('Médico cargado exitosamente por email:', this.medicoActual);
            // Guardar el ID para futuros usos
            if (this.medicoActual && this.medicoActual.id) {
              localStorage.setItem('medicoId', this.medicoActual.id.toString());
            }
          } else {
            console.error('No se encontró médico con email:', userEmail);
            alert('Error: No se encontró un médico asociado a esta cuenta.');
            this.router.navigate(['/ingresar']);
          }
        },
        error: (error: any) => {
          console.error('Error buscando médico por email:', error);
          alert('Error al cargar datos del médico. Por favor, inicie sesión nuevamente.');
          this.router.navigate(['/ingresar']);
        }
      });
      return;
    }

    if (!medicoId || medicoId <= 0) {
      console.error('No se pudo obtener el ID del médico');
      console.log('Debug localStorage:', {
        staffMedicoId: localStorage.getItem('staffMedicoId'),
        medicoId: localStorage.getItem('medicoId'),
        currentUser: localStorage.getItem('currentUser')
      });
      alert('Error: No se pudo obtener el ID del médico. Por favor, inicie sesión nuevamente.');
      this.router.navigate(['/ingresar']);
      return;
    }

    console.log('Cargando médico con ID:', medicoId);

    this.medicoService.findById(medicoId).subscribe({
      next: (medico) => {
        this.medicoActual = medico;
        console.log('Médico cargado exitosamente:', medico);
      },
      error: (error) => {
        console.error('Error al cargar datos del médico:', error);
        console.error('Error details:', error.error);
        console.error('Medico ID usado:', medicoId);
        console.error('StaffMedico ID actual:', this.staffMedicoId);

        if (error.status === 404) {
          console.error(`⚠️ Médico con ID ${medicoId} no encontrado en el servidor`);

          // Verificar si estamos confundiendo staffMedicoId con medicoId
          if (medicoId === this.staffMedicoId) {
            console.error('🚨 PROBLEMA DETECTADO: Se está usando staffMedicoId como medicoId!');
            console.error('StaffMedicoId:', this.staffMedicoId, 'MedicoId:', medicoId);

            // Intentar recuperar el medicoId real desde diferentes fuentes
            const realMedicoId = localStorage.getItem('medicoId');
            if (realMedicoId && realMedicoId !== medicoId.toString()) {
              console.log('🔧 Intentando con el medicoId real desde localStorage:', realMedicoId);
              // No mostrar alert ni redireccionar, intentar cargar con el ID correcto
              return;
            }
          }

          alert(`Error: No se encontró el médico con ID ${medicoId}. 
          
Posible problema de configuración. Verifique:
- ID del médico: ${medicoId}
- StaffMedico ID: ${this.staffMedicoId}
- LocalStorage medicoId: ${localStorage.getItem('medicoId')}
- LocalStorage staffMedicoId: ${localStorage.getItem('staffMedicoId')}

¿Desea continuar o ir al login?`);

          // Solo limpiar localStorage si el usuario lo confirma
          const shouldLogout = confirm('¿Desea cerrar sesión e ir al login?');
          if (shouldLogout) {
            localStorage.clear();
            this.router.navigate(['/login']);
          }
        } else {
          console.error('Error del servidor:', error.message || error);
          alert(`Error al cargar información del médico: ${error.error?.message || error.message}`);
        }
      }
    });
  }

  private cargarEstadisticas() {
    if (!this.staffMedicoId) {
      console.error('No se pudo obtener el staffMedicoId para cargar estadísticas');
      return;
    }

    console.log('� OPTIMIZADO: Cargando TODOS los datos en UNA sola consulta');
    console.log('StaffMedicoId:', this.staffMedicoId);

    const hoy = new Date().toISOString().split('T')[0];
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const inicioSemana = this.getStartOfWeek(new Date()).toISOString().split('T')[0];
    const finSemana = this.getEndOfWeek(new Date()).toISOString().split('T')[0];

    console.log('=== DEBUG FECHAS ===');
    console.log('Fecha hoy:', hoy);
    console.log('Fecha mañana:', manana);
    console.log('Rango semana:', { inicioSemana, finSemana });

    // === UNA SOLA CONSULTA PARA TODOS LOS TURNOS DEL MÉDICO ===
    const filtrosCompletos = {
      staffMedicoId: this.staffMedicoId,
      sortBy: 'fecha',
      size: 100  // Traer todos los turnos del médico
    };
    console.log('🎯 Filtros ÚNICOS para TODOS los turnos:', filtrosCompletos);

    this.turnoService.searchWithFilters(filtrosCompletos).subscribe({
      next: (response) => {
        const todosTurnos = response.data?.content || response.data || [];
        console.log('✅ TODOS los turnos del médico cargados:', todosTurnos.length);
        console.log('✅ Datos completos:', todosTurnos);

        // === FILTRAR EN EL FRONTEND ===

        // Turnos de hoy
        const turnosHoy = todosTurnos.filter((turno: any) => turno.fecha === hoy);
        this.stats.turnosHoy = turnosHoy.length;
        this.turnosHoy = turnosHoy;
        console.log(`📊 Turnos HOY (${hoy}):`, this.stats.turnosHoy);

        // Turnos de mañana  
        const turnosManana = todosTurnos.filter((turno: any) => turno.fecha === manana);
        this.stats.turnosManana = turnosManana.length;
        console.log(`📊 Turnos MAÑANA (${manana}):`, this.stats.turnosManana);

        // Turnos de la semana
        const turnosSemana = todosTurnos.filter((turno: any) => {
          return turno.fecha >= inicioSemana && turno.fecha <= finSemana;
        });
        this.stats.turnosSemana = turnosSemana.length;
        console.log(`📊 Turnos SEMANA (${inicioSemana} - ${finSemana}):`, this.stats.turnosSemana);

        // Turnos pendientes
        const turnosPendientes = todosTurnos.filter((turno: any) => turno.estado === 'PROGRAMADO');
        this.stats.turnosPendientes = turnosPendientes.length;
        console.log(`📊 Turnos PENDIENTES (PROGRAMADO):`, this.stats.turnosPendientes);

        // Próximos turnos (desde mañana)
        const proximosTurnos = todosTurnos.filter((turno: any) => turno.fecha > hoy);
        this.proximosTurnos = proximosTurnos.slice(0, 10); // Solo primeros 10
        console.log(`📊 PRÓXIMOS turnos (después de hoy):`, this.proximosTurnos.length);

        // === NUEVA FUNCIONALIDAD: CARGAR TODOS LOS TURNOS PARA LA SECCIÓN ===
        this.allTurnos = todosTurnos.map((turno: any) => ({
          ...turno,
          // Agregar campos calculados para compatibilidad con el template
          day: this.formatDay(turno.fecha),
          month: this.formatMonth(turno.fecha),
          year: this.formatYear(turno.fecha),
          time: `${turno.horaInicio} - ${turno.horaFin}`,
          doctor: `${this.medicoActual?.nombre || ''} ${this.medicoActual?.apellido || ''}`,
          specialty: this.medicoActual?.especialidad || 'Medicina General',
          location: turno.nombreCentro || 'Centro Médico'
        }));

        this.applyTurnosFilter();
        console.log('🎯 NUEVA SECCIÓN: Todos los turnos cargados para gestión completa:', this.allTurnos.length);

        // Log detallado de turnos de hoy
        if (turnosHoy.length > 0) {
          turnosHoy.forEach((turno: any, index: number) => {
            console.log(`🔍 Turno HOY ${index + 1} - Fecha: ${turno.fecha}, Hora: ${turno.horaInicio}-${turno.horaFin}, Paciente: ${turno.nombrePaciente} ${turno.apellidoPaciente}`);
          });
        }

        console.log('🎉 OPTIMIZACIÓN COMPLETA: 1 consulta en lugar de 6');
      },
      error: (error) => {
        console.error('❌ Error al cargar datos:', error);
        this.stats = { turnosHoy: 0, turnosManana: 0, turnosSemana: 0, turnosPendientes: 0 };
        this.turnosHoy = [];
        this.proximosTurnos = [];
      }
    });
  }

  private cargarTurnosHoy() {
    console.log('⚠️ cargarTurnosHoy() DESHABILITADO - Ya se carga en cargarEstadisticas()');
    console.log('✅ Los turnos de hoy ya están disponibles en this.turnosHoy');
    return;
  }

  private cargarProximosTurnos() {
    if (!this.staffMedicoId) {
      console.error('No se pudo obtener el staffMedicoId para cargar próximos turnos');
      return;
    }

    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('🔍 DEBUG Próximos turnos:');
    console.log('   - staffMedicoId:', this.staffMedicoId);
    console.log('   - fecha desde (mañana):', manana);

    const filtros = {
      staffMedicoId: this.staffMedicoId,
      fechaDesde: manana,
      sortBy: 'fecha',
      size: 10
    };
    console.log('   - filtros completos:', filtros);

    this.turnoService.searchWithFilters(filtros).subscribe({
      next: (response) => {
        const turnos = response.data?.content || response.data || [];
        this.proximosTurnos = turnos;
        console.log('✅ Próximos turnos encontrados:', turnos.length);
        console.log('✅ Datos de próximos turnos:', turnos);

        if (turnos.length === 0) {
          console.log('⚠️ No hay próximos turnos para este médico desde mañana');
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar próximos turnos:', error);
        this.proximosTurnos = [];
      }
    });
  }

  // Navigation methods
  verTurnosHoy() {
    // Cambiar al filtro de próximos turnos para mostrar turnos de hoy y futuros
    this.setTurnosFilter('upcoming');

    // Scroll to the turnos section
    const turnosSection = document.querySelector('.turnos-management');
    if (turnosSection) {
      turnosSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  gestionarHorarios() {
    this.router.navigate(['/medico-horarios']);
  }

  verNotificaciones() {
    // Navegar a una página de notificaciones o mostrar un modal
    this.router.navigate(['/medico-notificaciones']);
  }

  verEstadisticas() {
    this.router.navigate(['/medico-estadisticas']);
  }

  configurarPerfil() {
    this.router.navigate(['/medico-perfil']);
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  private getEndOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  private initializeParticles() {
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight
      });
    }
  }

  // === MÉTODOS PARA LA NUEVA GESTIÓN DE TURNOS ===

  setTurnosFilter(filter: string) {
    console.log('🔍 Cambiando filtro de turnos a:', filter);
    this.currentFilter = filter;
    this.applyTurnosFilter();
  }

  applyTurnosFilter() {
    const today = new Date().toISOString().split('T')[0];

    switch (this.currentFilter) {
      case 'upcoming':
        this.filteredTurnos = this.allTurnos.filter(turno => turno.fecha >= today);
        break;
      case 'past':
        this.filteredTurnos = this.allTurnos.filter(turno => turno.fecha < today);
        break;
      case 'all':
      default:
        this.filteredTurnos = [...this.allTurnos];
        break;
    }

    // Ordenar por fecha y hora
    this.filteredTurnos.sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha);
      if (dateComparison === 0) {
        return a.horaInicio.localeCompare(b.horaInicio);
      }
      return this.currentFilter === 'past' ? dateComparison * -1 : dateComparison;
    });

    console.log(`📊 Filtro '${this.currentFilter}' aplicado:`, this.filteredTurnos.length, 'turnos');
  }

  getFilterCount(filter: string): number {
    const today = new Date().toISOString().split('T')[0];

    switch (filter) {
      case 'upcoming':
        return this.allTurnos.filter(turno => turno.fecha >= today).length;
      case 'past':
        return this.allTurnos.filter(turno => turno.fecha < today).length;
      case 'all':
        return this.allTurnos.length;
      default:
        return 0;
    }
  }

  getEmptyStateMessage(): string {
    switch (this.currentFilter) {
      case 'upcoming':
        return 'No tienes turnos programados próximamente.';
      case 'past':
        return 'No tienes turnos anteriores registrados.';
      case 'all':
        return 'No tienes turnos registrados en el sistema.';
      default:
        return 'No hay turnos para mostrar.';
    }
  }

  // Métodos de formato para las fechas
  /**
   * Parsea una fecha en formato YYYY-MM-DD evitando problemas de zona horaria
   */
  private parsearFecha(fechaStr: string): Date {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
  }

  formatDay(fecha: string): string {
    return this.parsearFecha(fecha).getDate().toString().padStart(2, '0');
  }

  formatMonth(fecha: string): string {
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return months[this.parsearFecha(fecha).getMonth()];
  }

  formatYear(fecha: string): string {
    return this.parsearFecha(fecha).getFullYear().toString();
  }

  // Métodos para iconos y textos de estado
  getStatusIcon(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'CONFIRMADO':
        return 'fa-check-circle';
      case 'PROGRAMADO':
        return 'fa-clock';
      case 'CANCELADO':
        return 'fa-times-circle';
      case 'REAGENDADO':
        return 'fa-calendar-alt';
      default:
        return 'fa-question-circle';
    }
  }

  getStatusText(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'CONFIRMADO':
        return 'Confirmado';
      case 'PROGRAMADO':
        return 'Programado';
      case 'CANCELADO':
        return 'Cancelado';
      case 'REAGENDADO':
        return 'Reagendado';
      default:
        return estado || 'Desconocido';
    }
  }

  // TrackBy function para mejor performance en ngFor
  trackByTurno(index: number, turno: any): any {
    return turno.id;
  }
  // === FUNCIONES DE GESTIÓN DE ASISTENCIA ===

  /** 
   * Verifica si se puede marcar asistencia en el turno
   * Según la Opción 2: permitir en estados PROGRAMADO, CONFIRMADO, COMPLETO, AUSENTE
   * Solo para turnos del día actual o pasados
   */
  isTurnoCompletado(turno: any): boolean {
    // Verificar que el turno sea de hoy o pasado
    // const hoy = new Date().toISOString().split('T')[0];
    // const esPasadoOHoy = turno.fecha <= hoy;
    // 🧪 TESTING: Permite marcar asistencia en turnos de hoy + mañana
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaActual = new Date(hoy);
/*     dosdiasAdelante.setDate(dosdiasAdelante.getDate() + 1); // +1 día = mañana
 */
    const fechaTurno = new Date(turno.fecha);
    const esPasadoOHoy = fechaTurno <= fechaActual;
    // Estados válidos para marcar asistencia
    const estadosValidos = ['PROGRAMADO', 'CONFIRMADO', 'COMPLETO', 'AUSENTE'];
    const tieneEstadoValido = estadosValidos.includes(turno.estado?.toUpperCase());

    // No se puede marcar asistencia en turnos cancelados o reagendados
    const noEsCanceladoNiReagendado =
      turno.estado?.toUpperCase() !== 'CANCELADO' &&
      turno.estado?.toUpperCase() !== 'REAGENDADO';

    return esPasadoOHoy && tieneEstadoValido && noEsCanceladoNiReagendado;
  }

  /** 
   * Determina si la asistencia es de solo lectura
   * Es readonly si ya fue marcado explícitamente (true o false)
   */
  isAttendanceReadOnly(turno: any): boolean {
    // Si ya tiene un valor explícito (true o false), es readonly
    // Esto evita cambios accidentales una vez registrado
    return turno.asistio !== null && turno.asistio !== undefined;
  }

  /** 
   * Marca un turno como AUSENTE
   * Por defecto, todos los turnos se consideran "Asistió" (null = presente por defecto)
   * Solo se marca explícitamente cuando NO asistió
   */
  marcarAusente(turno: any) {
    if (!turno.id) {
      console.error('❌ No se puede marcar ausencia: ID de turno inválido');
      alert('Error: ID de turno inválido');
      return;
    }

    // Verificar si se puede modificar
    if (!this.isTurnoCompletado(turno)) {
      console.warn('⚠️ No se puede marcar ausencia en este turno');
      alert('No se puede marcar ausencia en este turno. Verifica el estado y la fecha.');
      return;
    }

    // Confirmación antes de marcar como ausente
    const nombrePaciente = `${turno.nombrePaciente} ${turno.apellidoPaciente}`;
    const confirmacion = confirm(
      `¿Confirmar que el paciente ${nombrePaciente} NO ASISTIÓ al turno?\n\n` +
      `Fecha: ${this.formatearFechaLegible(turno.fecha)}\n` +
      `Hora: ${turno.horaInicio} - ${turno.horaFin}`
    );

    if (!confirmacion) {
      console.log('❌ Operación cancelada por el usuario');
      return;
    }

    console.log('🔄 Marcando como ausente:', {
      turnoId: turno.id,
      paciente: nombrePaciente,
      fecha: turno.fecha
    });

    // Mostrar indicador de carga
    turno._cargando = true;

    // Marcar como ausente (asistio = false)
    this.turnoService.registrarAsistencia(turno.id, false).subscribe({
      next: (response) => {
        console.log('✅ Ausencia registrada exitosamente:', response);

        // Actualizar el turno en la lista local
        const turnoIndex = this.allTurnos.findIndex(t => t.id === turno.id);
        if (turnoIndex >= 0) {
          this.allTurnos[turnoIndex] = {
            ...this.allTurnos[turnoIndex],
            asistio: false,
            fechaRegistroAsistencia: new Date().toISOString(),
            // Si el backend cambió el estado a AUSENTE, actualizarlo
            estado: response.data?.estado || this.allTurnos[turnoIndex].estado
          };
          this.applyTurnosFilter(); // Re-filtrar para mantener consistencia
        }

        // Ocultar indicador de carga
        turno._cargando = false;

        // Mostrar mensaje de éxito
        this.mostrarMensajeExito(`✅ Ausencia registrada para ${nombrePaciente}`);
      },
      error: (error) => {
        console.error('❌ Error al marcar ausencia:', error);

        // Ocultar indicador de carga
        turno._cargando = false;

        // Mostrar mensaje de error detallado
        let mensajeError = 'Error al registrar la ausencia.';
        if (error.error?.message) {
          mensajeError = error.error.message;
        } else if (error.message) {
          mensajeError = error.message;
        }

        alert(`❌ ${mensajeError}\n\nPor favor, intente nuevamente.`);
      }
    });
  }

  /** 
   * Deshace el marcado de ausencia (volver a presente)
   * Solo disponible si fue marcado explícitamente como ausente
   */
  deshacerAusencia(turno: any) {
    if (!turno.id) {
      console.error('❌ No se puede deshacer ausencia: ID de turno inválido');
      return;
    }

    // Confirmación antes de deshacer
    const nombrePaciente = `${turno.nombrePaciente} ${turno.apellidoPaciente}`;
    const confirmacion = confirm(
      `¿Deshacer la ausencia de ${nombrePaciente}?\n\n` +
      `Esto marcará al paciente como PRESENTE.`
    );

    if (!confirmacion) {
      return;
    }

    console.log('🔄 Deshaciendo ausencia:', {
      turnoId: turno.id,
      paciente: nombrePaciente
    });

    // Mostrar indicador de carga
    turno._cargando = true;

    // Marcar como presente (asistio = true)
    this.turnoService.registrarAsistencia(turno.id, true).subscribe({
      next: (response) => {
        console.log('✅ Presencia registrada exitosamente:', response);

        // Actualizar el turno en la lista local
        const turnoIndex = this.allTurnos.findIndex(t => t.id === turno.id);
        if (turnoIndex >= 0) {
          this.allTurnos[turnoIndex] = {
            ...this.allTurnos[turnoIndex],
            asistio: true,
            fechaRegistroAsistencia: new Date().toISOString(),
            estado: response.data?.estado || this.allTurnos[turnoIndex].estado
          };
          this.applyTurnosFilter();
        }

        // Ocultar indicador de carga
        turno._cargando = false;

        this.mostrarMensajeExito(`✅ ${nombrePaciente} marcado como PRESENTE`);
      },
      error: (error) => {
        console.error('❌ Error al deshacer ausencia:', error);
        turno._cargando = false;
        alert(`❌ Error al deshacer ausencia: ${error.error?.message || error.message}`);
      }
    });
  }

  /** 
   * Obtiene el texto descriptivo del estado de asistencia
   * null o undefined = "Asistió" (por defecto todos asisten)
   * true = "Asistió" (marcado explícitamente)
   * false = "No asistió" (marcado como ausente)
   */
  getAsistenciaLabel(turno: any): string {
    if (turno.asistio === false) {
      return 'No asistió';
    }
    // Por defecto (null, undefined, o true) = asistió
    return 'Asistió';
  }

  /**
   * Obtiene la clase CSS según el estado de asistencia
   */
  getAsistenciaClass(turno: any): string {
    if (turno.asistio === false) {
      return 'no-asistio';
    }
    // Por defecto = asistió
    return 'asistio';
  }

  /**
   * Verifica si el turno fue marcado como ausente
   */
  esAusente(turno: any): boolean {
    return turno.asistio === false;
  }

  /**
   * Verifica si el turno está presente (por defecto o marcado)
   */
  esPresente(turno: any): boolean {
    return turno.asistio !== false;
  }

  /** Helper para formatear fechas de forma legible */
  private formatearFechaLegible(fecha: string): string {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }

  /** Muestra un mensaje de éxito temporal */
  private mostrarMensajeExito(mensaje: string) {
    console.log('📢 Mensaje de éxito:', mensaje);
    alert(mensaje);
    // TODO: Implementar notificación toast más elegante
  }
  /** 
 * Toggle entre Asistió / No asistió
 */
  toggleAsistencia(turno: any) {
    if (!turno.id) {
      console.error('❌ No se puede cambiar asistencia: ID de turno inválido');
      return;
    }

    if (!this.isTurnoCompletado(turno)) {
      alert('No se puede marcar asistencia en este turno.');
      return;
    }

    // Si es null (nunca marcado) o true (presente) → cambiar a false (ausente)
    // Si es false (ausente) → cambiar a true (presente)
    const nuevoEstado = turno.asistio === false ? true : false;

    const nombrePaciente = `${turno.nombrePaciente} ${turno.apellidoPaciente}`;
    const mensaje = nuevoEstado
      ? `¿Confirmar que ${nombrePaciente} SÍ ASISTIÓ?`
      : `¿Confirmar que ${nombrePaciente} NO ASISTIÓ?`;

    if (!confirm(mensaje)) {
      return;
    }

    console.log('🔄 Toggle asistencia:', { turnoId: turno.id, nuevoEstado });
    turno._cargando = true;

    this.turnoService.registrarAsistencia(turno.id, nuevoEstado).subscribe({
      next: (response) => {
        const turnoIndex = this.allTurnos.findIndex(t => t.id === turno.id);
        if (turnoIndex >= 0) {
          this.allTurnos[turnoIndex] = {
            ...this.allTurnos[turnoIndex],
            asistio: nuevoEstado,
            fechaRegistroAsistencia: new Date().toISOString(),
            estado: response.data?.estado || this.allTurnos[turnoIndex].estado
          };
          this.applyTurnosFilter();
        }
        turno._cargando = false;
        this.mostrarMensajeExito(nuevoEstado ? '✅ Marcado como PRESENTE' : '⚠️ Marcado como AUSENTE');
      },
      error: (error) => {
        console.error('❌ Error:', error);
        turno._cargando = false;
        alert(`Error: ${error.error?.message || error.message}`);
      }
    });
  }
}