import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html', 
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {
  @Input() totalPages: number = 0;
  @Input() last: boolean = false;
  @Input() currentPage: number = 1;
  @Input() number: number = 1;

  @Output() pageChangeRequested = new EventEmitter<number>();

  pages: number[] = [];

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalPages']) {
      this.pages = Array.from(Array(this.totalPages).keys());
    }
  }

  getVisiblePages(): number[] {
    if (this.totalPages <= 7) {
      // Si hay 7 páginas o menos, mostrar todas
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    const current = this.currentPage;
    const total = this.totalPages;
    let start: number;
    let end: number;

    if (current <= 4) {
      // Al principio: mostrar 1-5 ... total
      start = 1;
      end = 5;
    } else if (current >= total - 3) {
      // Al final: mostrar 1 ... (total-4)-total
      start = total - 4;
      end = total;
    } else {
      // En el medio: mostrar 1 ... (current-1)-(current+1) ... total
      start = current - 1;
      end = current + 1;
    }

    const pages: number[] = [];
    
    // Agregar primera página si no está incluida
    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push(-1); // Placeholder para "..."
      }
    }

    // Agregar páginas del rango
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Agregar última página si no está incluida
    if (end < total) {
      if (end < total - 1) {
        pages.push(-1); // Placeholder para "..."
      }
      pages.push(total);
    }

    return pages;
  }

  onPageChange(pageId: number): void {
    if (!this.currentPage) this.currentPage = 1;
  
    let page = this.currentPage;
  
    switch (pageId) {
      case -2: // « Primera
        page = 1;
        break;
      case -1: // ‹ Anterior
        if (this.currentPage > 1) page = this.currentPage - 1;
        break;
      case -3: // › Siguiente
        if (!this.last && this.currentPage < this.totalPages) page = this.currentPage + 1;
        break;
      case -4: // » Última
        page = this.totalPages;
        break;
      default: // Página específica (número real)
        page = pageId;
    }
  
    this.currentPage = page;
    this.pageChangeRequested.emit(page);
  }
}