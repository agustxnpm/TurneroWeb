import { Component, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // Importar FormsModule

@Component({
  selector: 'app-map-modal',
  standalone: true, // Declarar como componente standalone
  imports: [FormsModule], // Importar FormsModule aquí
  templateUrl: './map-modal.component.html',
  styleUrl: './map-modal.component.css'
})
export class MapModalComponent implements AfterViewInit {
  @Output() locationSelected = new EventEmitter<{ latitud: number, longitud: number } | null>();
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;
  private map!: L.Map;
  searchQuery: string = ''; // Campo para la búsqueda

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    // Usar setTimeout para asegurar que el DOM esté completamente renderizado
    setTimeout(() => {
      this.initializeMap();
    }, 0);
  }

  initializeMap(): void {
    if (!this.mapContainer?.nativeElement) {
      console.error('Map container not available');
      return;
    }

    try {
      this.map = L.map(this.mapContainer.nativeElement).setView([-38.4161, -63.6167], 5); // Coordenadas iniciales (Centro de Argentina)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;

        // Redondear las coordenadas a 4 decimales
        const latRounded = lat.toFixed(3);
        const lngRounded = lng.toFixed(3);

        const coordenadas = { latitud: +latRounded, longitud: +lngRounded };
        this.locationSelected.emit(coordenadas); // Emitir las coordenadas seleccionadas
        this.close(); // Cerrar el modal automáticamente
      });

      // Forzar un redimensionamiento del mapa después de la inicialización
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  searchLocation(): void {
    if (!this.searchQuery) {
      alert('Por favor, ingrese una dirección para buscar.');
      return;
    }

    if (!this.map) {
      console.error('Map not initialized');
      alert('El mapa no está disponible. Inténtelo nuevamente.');
      return;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.searchQuery)}&format=json&limit=1`;

    this.http.get<any[]>(url).subscribe({
      next: (results) => {
        if (results.length > 0) {
          const { lat, lon } = results[0];
          this.map.setView([+lat, +lon], 15); // Centrar el mapa en las coordenadas encontradas
          L.marker([+lat, +lon]).addTo(this.map).bindPopup(this.searchQuery).openPopup();
        } else {
          alert('No se encontraron resultados para la búsqueda.');
        }
      },
      error: (err) => {
        console.error('Error al buscar la ubicación:', err);
        alert('Ocurrió un error al buscar la ubicación. Intente nuevamente.');
      }
    });
  }

  close(): void {
    if (this.map) {
      try {
        this.map.remove(); // Destruir el mapa para liberar recursos
      } catch (error) {
        console.warn('Error removing map:', error);
      }
    }
    this.locationSelected.emit(null); // Emitir null si se cierra sin seleccionar
  }
}