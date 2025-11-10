import { Routes } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { InicioSesionComponent } from "./inicio-sesion/inicio-sesion.component";
import { RegistroUsuarioComponent } from "./registro-usuario/registro-usuario.component";
import { RecuperarContrasenaComponent } from "./recuperacionContrasena/recuperacionContrasena.component";
import { ActivacionCuentaComponent } from "./activacion-cuenta/activacion-cuenta.component";
import { DeepLinkBridgeComponent } from "./deep-link/deep-link-bridge.component";
import { TurnosComponent } from "./turnos/turnos.component";
import { TurnoDetailComponent } from "./turnos/turno-detail.component";
import { AdminAgendaComponent } from "./agenda/admin-agenda.component";
import { DiasExcepcionalesComponent } from "./agenda/dias-excepcionales.component";
import { PacientesComponent } from "./pacientes/pacientes.component";
import { PacienteDetailComponent } from "./pacientes/paciente-detail.component";
import { EspecialidadesComponent } from "./especialidades/especialidades.component";
import { EspecialidadDetailComponent } from "./especialidades/especialidad-detail.component";
import { CentrosAtencionComponent } from "./centrosAtencion/centrosAtencion.component";
import { CentroAtencionDetailRefactoredComponent } from "./centrosAtencion/centroAtencion-detail-refactored.component";
import { ConsultoriosComponent } from "./consultorios/consultorios.component";
import { ConsultorioDetailComponent } from "./consultorios/consultorio-detail.component";
import { MedicosComponent } from "./medicos/medicos.component";
import { StaffMedicosComponent } from "./staffMedicos/staffMedicos.component";
import { StaffMedicoDetailComponent } from "./staffMedicos/staffMedico-detail.component";
import { MedicoDetailComponent } from "./medicos/medico-detail.component";
import { DisponibilidadMedicoComponent } from "./disponibilidadMedicos/disponibilidadMedico.component";
import { DisponibilidadMedicoDetailComponent } from "./disponibilidadMedicos/disponibilidadMedico-detail.component";
import { EsquemaTurnoComponent } from "./esquemaTurno/esquemaTurno.component";
import { EsquemaTurnoDetailComponent } from "./esquemaTurno/esquemaTurno-detail.component";
import { ObraSocialComponent } from "./obraSocial/obraSocial.component";
import { ObraSocialDetailComponent } from "./obraSocial/obraSocial-detail.component";
import { PacienteDashboardComponent } from "./pacientes/paciente-dashboard.component";
import { PacienteAgendaComponent } from "./pacientes/paciente-agenda.component";
import { PacienteReagendarTurnoComponent } from "./pacientes/paciente-reagendar-turno.component";
import { PacienteNotificacionesComponent } from "./pacientes/paciente-notificaciones.component";

// Medico components
import { MedicoDashboardComponent } from "./medicos/medico-dashboard.component";
import { MedicoHorariosComponent } from "./medicos/medico-horarios.component";
import { MedicoEstadisticasComponent } from "./medicos/medico-estadisticas.component";
import { MedicoPerfilComponent } from "./medicos/medico-perfil.component";

// Audit components
import { TurnoAdvancedSearchComponent } from "./turnos/turno-advanced-search.component";
import { AuditDashboardComponent } from "./turnos/audit-dashboard.component";

import { AdminGuard } from "./guards/admin.guard";
import { PatientGuard } from "./guards/patient.guard";
import { MedicoGuard } from "./guards/medico.guard";
import { OperadorGuard } from "./guards/operador.guard";
import { AdminOperadorGuard } from "./guards/admin-operador.guard";

import { OperadorDashboardComponent } from "./operador/operador-dashboard.component";
//import { OperadorAgendaComponent } from "./operador/operador-agenda.component";
import { OperadoresComponent } from "./operador/operadores.component";
import { OperadorDetailComponent } from "./operador/operador-detail.component";
import { OperadorAgendaComponent } from "./operador/operador-agenda.component";
import { OperadorPerfilComponent } from "./operador/operador-perfil.component";
import { AdminPerfilComponent } from "./admin/admin-perfil.component";
import { TokenStatusComponent } from "./components/token-status.component";
import { AdminDashboardComponent } from "./admin/admin-dashboard.component";
import { AdminConfigComponent } from "./admin/admin-config.component";
import { AdminListComponent } from "./admin-management/admin-list.component";
import { AdminDetailComponent } from "./admin-management/admin-detail.component";
import { DashboardGestionComponent } from "./dashboard-gestion/dashboard-gestion.component";
import { HistorialTurnosComponent } from "./turnos/historial-turnos.component";
import { ListaEsperaComponent } from "./lista-espera/lista-espera.component";
import { PreferenciasPacienteComponent } from "./pacientes/preferencias-paciente/preferencias-paciente.component";
import { ListaEsperaFormComponent } from "./lista-espera/lista-espera-form.component";
import { ListaEsperaEstadisticasComponent } from "./lista-espera/lista-espera-estadisticas.component";

export const routes: Routes = [
  { path: "", component: HomeComponent },

  // Ruta puente para deep linking (enlimport { ListaEsperaFormComponent } from "./lista-espera/lista-espera-form.component";
  //aces desde email)
  {
    path: "link-verificacion",
    component: DeepLinkBridgeComponent
  },

  // Rutas de Operador (protegidas por OperadorGuard)
  {
    path: "operador-dashboard",
    component: OperadorDashboardComponent,
    canActivate: [OperadorGuard],
  },

  {
    path: "operador-agenda",
    component: OperadorAgendaComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "operadores",
    component: OperadoresComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "operadores/new",
    component: OperadorDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "operadores/:id",
    component: OperadorDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "operador-perfil",
    component: OperadorPerfilComponent,
    canActivate: [OperadorGuard],
  },
  {
    path: "admin-perfil",
    component: AdminPerfilComponent,
    canActivate: [AdminGuard],
  },

  // rutas de autenticación
  { path: "ingresar", component: InicioSesionComponent },
  { path: "registro-usuario", component: RegistroUsuarioComponent },
  { path: "recuperar-contrasena", component: RecuperarContrasenaComponent },
  { path: "reset-password", component: RecuperarContrasenaComponent },
  { path: "activate-account", component: ActivacionCuentaComponent },

  // Patient Routes
  {
    path: "paciente-dashboard",
    component: PacienteDashboardComponent,
    canActivate: [PatientGuard],
  },
  {
    path: "paciente-agenda",
    component: PacienteAgendaComponent,
    // ruta desprotegida para poder usar el banner anonimo
  },
  {
    path: "paciente-notificaciones",
    component: PacienteNotificacionesComponent,
    canActivate: [PatientGuard],
  },
  {
    path: "paciente-historial",
    component: HistorialTurnosComponent,
    canActivate: [PatientGuard],
  },
  {
    path: "paciente-preferencias",
    component: PreferenciasPacienteComponent,
    canActivate: [PatientGuard],
  },
  {
    path: "paciente-perfil",
    component: PacienteDetailComponent,
    canActivate: [PatientGuard],
  },
  {
    path: "paciente-reagendar-turno/:id",
    component: PacienteReagendarTurnoComponent,
    canActivate: [PatientGuard],
  },

  // Medico Routes
  {
    path: "medico-dashboard",
    component: MedicoDashboardComponent,
    canActivate: [MedicoGuard],
  },
  {
    path: "medico-horarios",
    component: MedicoHorariosComponent,
    canActivate: [MedicoGuard],
  },
  {
    path: "medico-estadisticas",
    component: MedicoEstadisticasComponent,
    canActivate: [MedicoGuard],
  },
  {
    path: "medico-perfil",
    component: MedicoPerfilComponent,
    canActivate: [MedicoGuard],
  },
  {
    path: "turnos/new",
    component: TurnoDetailComponent,
    canActivate: [MedicoGuard],
  },

  { path: "debug/tokens", component: TokenStatusComponent }, // ruta para debug de tokens
  // Lista de Espera Routes
  {
    path: "lista-espera",
    component: ListaEsperaComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "lista-espera-form",
    component: ListaEsperaFormComponent,
    canActivate: [PatientGuard],
  },
  {
    path: "lista-espera-estadisticas",
    component: ListaEsperaEstadisticasComponent,
    canActivate: [AdminOperadorGuard],
  },

  // Admin Routes (protected)
  {
    path: "turnos",
    component: TurnosComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "turnos/new",
    component: TurnoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "turnos/advanced-search",
    component: TurnoAdvancedSearchComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "turnos/audit-dashboard",
    component: AuditDashboardComponent,
    canActivate: [AdminGuard],
  },
  {
    path: "turnos/:id",
    component: TurnoDetailComponent,
    canActivate: [AdminGuard],
  },
  {
    path: "turnos/:id/edit",
    component: TurnoDetailComponent,
    canActivate: [AdminGuard],
  },
  {
    path: "agenda",
    component: AdminAgendaComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "agenda/dias-excepcionales",
    component: DiasExcepcionalesComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "pacientes",
    component: PacientesComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "pacientes/new",
    component: PacienteDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "pacientes/:id",
    component: PacienteDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "obraSocial",
    component: ObraSocialComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "obraSocial/new",
    component: ObraSocialDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "obraSocial/:id",
    component: ObraSocialDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "especialidades",
    component: EspecialidadesComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "especialidades/new",
    component: EspecialidadDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "especialidades/:id",
    component: EspecialidadDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "centrosAtencion",
    component: CentrosAtencionComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "centrosAtencion/new",
    component: CentroAtencionDetailRefactoredComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "centrosAtencion/:id",
    component: CentroAtencionDetailRefactoredComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "consultorios",
    component: ConsultoriosComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "consultorios/new",
    component: ConsultorioDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "consultorios/:id",
    component: ConsultorioDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "medicos",
    component: MedicosComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "medicos/new",
    component: MedicoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "medicos/:id",
    component: MedicoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "staffMedico",
    component: StaffMedicosComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "staffMedico/new",
    component: StaffMedicoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "staffMedico/:id",
    component: StaffMedicoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "disponibilidades-medico",
    component: DisponibilidadMedicoComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "disponibilidades-medico/new",
    component: DisponibilidadMedicoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "disponibilidades-medico/:id",
    component: DisponibilidadMedicoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "esquema-turno",
    component: EsquemaTurnoComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "esquema-turno/new",
    component: EsquemaTurnoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "esquema-turno/:id",
    component: EsquemaTurnoDetailComponent,
    canActivate: [AdminOperadorGuard],
  },
  {
    path: "admin-dashboard",
    component: AdminDashboardComponent,
    canActivate: [AdminGuard],
  },
  {
    path: "dashboard-gestion",
    component: DashboardGestionComponent,
    canActivate: [AdminGuard],
  },
  // Admin management (admins list / create / edit)
  {
    path: "admin/users",
    component: AdminListComponent,
    canActivate: [AdminGuard]
  },
  {
    path: "admin/users/new",
    component: AdminDetailComponent,
    canActivate: [AdminGuard]
  },
  {
    path: "admin/users/:id",
    component: AdminDetailComponent,
    canActivate: [AdminGuard]
  },
  {
    path: "config",  // O "admin-config" si prefieres algo más descriptivo
    component: AdminConfigComponent,
    canActivate: [AdminOperadorGuard],  // Protege para admins y operadores
  },
];
