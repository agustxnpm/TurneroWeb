import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CentroAtencion } from '../../centroAtencion';
import { MapModalComponent } from '../../../modal/map-modal.component';

@Component({
  selector: 'app-centro-atencion-detalle-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MapModalComponent],
  templateUrl: './centro-atencion-detalle-tab.component.html',
  styleUrls: ['./centro-atencion-detalle-tab.component.css']
})
export class CentroAtencionDetalleTabComponent implements OnInit, OnChanges {
  @Input() centroAtencion!: CentroAtencion;
  @Input() modoEdicion: boolean = false;
  @Input() canEdit: boolean = true; // Control de permisos (SUPERADMIN puede editar, ADMIN solo ver)
  @Input() showMap: boolean = false;
  @Input() coordenadas: string = '';
  @Input() searchQuery: string = '';

  @Output() save = new EventEmitter<void>();
  @Output() activarEdicion = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
  @Output() confirmDelete = new EventEmitter<CentroAtencion>();
  @Output() goBack = new EventEmitter<void>();
  @Output() toggleMap = new EventEmitter<void>();
  @Output() searchLocation = new EventEmitter<void>();
  @Output() locationSelected = new EventEmitter<any>();
  @Output() coordenadasChange = new EventEmitter<string>();

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si las coordenadas cambian desde el componente padre, emitir el cambio
    if (changes['coordenadas'] && !changes['coordenadas'].firstChange) {
      // Este método se ejecuta cuando el parent actualiza el input
    }
  }

  onSave(): void {
    this.save.emit();
  }

  onActivarEdicion(): void {
    this.activarEdicion.emit();
  }

  onCancelar(): void {
    this.cancelar.emit();
  }

  onConfirmDelete(centro: CentroAtencion): void {
    this.confirmDelete.emit(centro);
  }

  onGoBack(): void {
    this.goBack.emit();
  }

  onToggleMap(): void {
    this.toggleMap.emit();
  }

  onSearchLocation(): void {
    this.searchLocation.emit();
  }

  onLocationSelected(location: any): void {
    this.locationSelected.emit(location);
  }

  // ========== SINCRONIZACIÓN DE COORDENADAS ==========
  // Cuando el usuario edita las coordenadas en el input, emitir el cambio al padre
  onCoordinatesChanged(): void {
    this.coordenadasChange.emit(this.coordenadas);
  }

  onAllFieldsEmpty(): boolean {
    return !this.centroAtencion?.nombre?.trim() &&
      !this.centroAtencion?.direccion?.trim() &&
      !this.centroAtencion?.localidad?.trim() &&
      !this.centroAtencion?.provincia?.trim() &&
      !this.centroAtencion?.telefono?.trim();
  }
}
