import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { CentrosMapaModalComponent } from "../modal/centros-mapa-modal.component";
import { CentroAtencionService } from "../centrosAtencion/centroAtencion.service";
import { EspecialidadService } from "../especialidades/especialidad.service";
import { CentroAtencion } from "../centrosAtencion/centroAtencion";
import { Especialidad } from "../especialidades/especialidad";

@Component({
  selector: "app-home",
  imports: [CommonModule, FormsModule, RouterModule, CentrosMapaModalComponent],
  templateUrl: "./home.html",
  styleUrl: "./home.css",
})
export class HomeComponent {
  // Datos para búsqueda de CAP
  capSearchData = {
    tipoAtencion: "",
    sintomas: ""
  };

  // Variables para el mapa modal
  showMapaModal = false;
  centrosAtencionCompletos: CentroAtencion[] = [];
  especialidadesCompletas: Especialidad[] = [];
  slotsOriginales: any[] = [];

  constructor(
    private router: Router,
    private centroAtencionService: CentroAtencionService,
    private especialidadService: EspecialidadService
  ) {
    this.cargarDatosParaMapa();
  }

  // Método para cargar datos necesarios para el mapa
  cargarDatosParaMapa() {
    // Cargar centros de atención
    this.centroAtencionService.all().subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.centrosAtencionCompletos = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error al cargar centros de atención:', error);
      },
    });

    // Cargar especialidades
    this.especialidadService.all().subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.especialidadesCompletas = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error al cargar especialidades:', error);
      },
    });

    // Por ahora inicializar slots vacío - esto podría cargarse desde un servicio de agenda
    this.slotsOriginales = [];
  }

  // Método para scroll suave a sección específica
  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Método para buscar CAPs - muestra el mapa
  buscarCAPS() {
    console.log('Búsqueda de CAP:', this.capSearchData);
    this.showMapaModal = true;
  }

  // Métodos para manejar el modal del mapa
  cerrarMapaModal() {
    this.showMapaModal = false;
  }

  onCentroSeleccionadoDelMapa(centro: CentroAtencion) {
    console.log('Centro seleccionado:', centro);
    this.cerrarMapaModal();
  }

  // Método para seleccionar rol (redirige al login moderno)
  selectRole(role: 'admin' | 'medico' | 'patient' | 'operador') {
    this.router.navigate(['/ingresar']);
  }
}
