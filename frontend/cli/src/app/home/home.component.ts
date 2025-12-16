import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { Subscription } from 'rxjs';
import { UserContextService } from '../services/user-context.service';
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
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
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
  // Especialidad seleccionada inicial para pasar al modal
  especialidadSeleccionadaInicial: string = '';

  // IntersectionObserver para animaciones
  private scrollObserver: IntersectionObserver | null = null;

  // Estado de autenticación en tiempo real
  isAuthenticated: boolean = false;
  private userContextSub: Subscription | null = null;

  constructor(
    private router: Router,
    private centroAtencionService: CentroAtencionService,
    private especialidadService: EspecialidadService,
    private userContextService: UserContextService
  ) {
    this.cargarDatosParaMapa();
  }

  ngOnInit(): void {
    // Verificar si hay estado guardado del modal para restaurarlo
    this.verificarEstadoModal();

    // Suscribirse al contexto de usuario para mostrar/ocultar elementos según el estado de login
    this.userContextSub = this.userContextService.userContext$.subscribe(ctx => {
      this.isAuthenticated = !!ctx.isAuthenticated;
    });
  }
  
  // Verificar si debemos abrir el modal automáticamente (volviendo de paciente-agenda)
  private verificarEstadoModal(): void {
    const modalStateStr = sessionStorage.getItem('modalCentrosState');
    if (modalStateStr) {
      try {
        const modalState = JSON.parse(modalStateStr);
        if (modalState.showModal) {
          // Limpiar el estado para evitar que se abra múltiples veces
          sessionStorage.removeItem('modalCentrosState');
          
          // Restaurar los datos del modal
          this.centrosAtencionCompletos = modalState.centros || [];
          this.especialidadesCompletas = modalState.especialidades || [];
          this.slotsOriginales = modalState.slotsDisponibles || [];
          this.especialidadSeleccionadaInicial = modalState.especialidadInicial || '';
          
          // Abrir el modal después de un breve delay para asegurar que el componente esté listo
          setTimeout(() => {
            this.showMapaModal = true;
          }, 300);
        }
      } catch (error) {
        console.error('Error al restaurar estado del modal:', error);
        sessionStorage.removeItem('modalCentrosState');
      }
    }
  }

  ngAfterViewInit(): void {
    // Configurar IntersectionObserver para animaciones on-scroll
    this.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    // Limpiar observer al destruir el componente
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }

    // Limpiar suscripción al contexto de usuario
    if (this.userContextSub) {
      this.userContextSub.unsubscribe();
      this.userContextSub = null;
    }
  }

  // Configurar animaciones al hacer scroll
  private setupScrollAnimations(): void {
    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    };

    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, options);

    // Observar todos los elementos con la clase animate-on-scroll
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => {
      this.scrollObserver?.observe(el);
    });
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
