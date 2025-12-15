import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { environment } from '../../environments/environment';

/**
 * Servicio para exportar datos a diferentes formatos (CSV, PDF)
 * Se comunica con ExportPresenter del backend
 */
@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private url = environment.production ? `${environment.apiUrl}/export` : 'rest/export';

  constructor(private http: HttpClient) { }

  /**
   * Exporta turnos filtrados a CSV
   * @param filter Objeto con filtros (fechaDesde, fechaHasta, centroId, etc.)
   */
  exportarTurnosCSV(filter: any): Observable<HttpResponse<string>> {
    return this.http.post<string>(
      `${this.url}/turnos/csv`,
      filter,
      {
        responseType: 'text' as 'json',
        reportProgress: true,
        observe: 'response'
      }
    );
  }

  /**
   * Exporta turnos filtrados a PDF (vía HTML)
   * @param filter Objeto con filtros (fechaDesde, fechaHasta, centroId, etc.)
   */
  exportarTurnosPDF(filter: any): Observable<HttpResponse<string>> {
    return this.http.post<string>(
      `${this.url}/turnos/pdf`,
      filter,
      {
        responseType: 'text' as 'json',
        reportProgress: true,
        observe: 'response'
      }
    );
  }

  /**
   * Exporta turnos filtrados a HTML
   * @param filter Objeto con filtros (fechaDesde, fechaHasta, centroId, etc.)
   */
  exportarTurnosHTML(filter: any): Observable<HttpResponse<string>> {
    return this.http.post<string>(
      `${this.url}/turnos/html`,
      filter,
      {
        responseType: 'text' as 'json',
        reportProgress: true,
        observe: 'response'
      }
    );
  }

  /**
   * Obtiene estadísticas para exportación
   * @param filter Objeto con filtros
   */
  obtenerEstadisticasExportacion(filter: any): Observable<DataPackage<any>> {
    return this.http.post<DataPackage<any>>(
      `${this.url}/turnos/statistics`,
      filter
    );
  }

  /**
   * Descarga un archivo CSV desde contenido string
   * @param content Contenido del CSV
   * @param filename Nombre del archivo
   */
  descargarCSV(content: string, filename: string = 'turnos.csv'): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exporta reporte de atención completada a CSV
   * @param staffMedicoId ID del médico (opcional)
   * @param centroAtencionId ID del centro de atención (opcional)
   * @param fechaDesde Fecha inicial (opcional) en formato YYYY-MM-DD
   * @param fechaHasta Fecha final (opcional) en formato YYYY-MM-DD
   */
  exportarReporteAtencionCSV(
    staffMedicoId?: number,
    centroAtencionId?: number,
    fechaDesde?: string,
    fechaHasta?: string
  ): Observable<HttpResponse<string>> {
    let params = new HttpParams();

    if (staffMedicoId) {
      params = params.set('staffMedicoId', staffMedicoId.toString());
    }
    if (centroAtencionId) {
      params = params.set('centroAtencionId', centroAtencionId.toString());
    }
    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde);
    }
    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta);
    }

    return this.http.get<string>(
      `${this.url}/reporte-atencion/csv`,
      {
        params,
        responseType: 'text' as 'json',
        reportProgress: true,
        observe: 'response'
      }
    );
  }

  /**
   * Exporta reporte de atención completada a PDF (vía HTML)
   * @param staffMedicoId ID del médico (opcional)
   * @param centroAtencionId ID del centro de atención (opcional)
   * @param fechaDesde Fecha inicial (opcional) en formato YYYY-MM-DD
   * @param fechaHasta Fecha final (opcional) en formato YYYY-MM-DD
   */
  exportarReporteAtencionPDF(
    staffMedicoId?: number,
    centroAtencionId?: number,
    fechaDesde?: string,
    fechaHasta?: string
  ): Observable<HttpResponse<string>> {
    let params = new HttpParams();

    if (staffMedicoId) {
      params = params.set('staffMedicoId', staffMedicoId.toString());
    }
    if (centroAtencionId) {
      params = params.set('centroAtencionId', centroAtencionId.toString());
    }
    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde);
    }
    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta);
    }

    return this.http.get<string>(
      `${this.url}/reporte-atencion/html`,
      {
        params,
        responseType: 'text' as 'json',
        reportProgress: true,
        observe: 'response'
      }
    );
  }

  /**
   * Descarga un archivo PDF desde HTML usando jsPDF y html2canvas
   * @param htmlContent Contenido HTML a convertir
   * @param filename Nombre del archivo PDF
   */
  async descargarPDF(htmlContent: string, filename: string = 'turnos.pdf'): Promise<void> {
    try {
      // Crear un elemento temporal para contener el HTML
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '210mm'; // Ancho de página A4
      document.body.appendChild(tempContainer);

      // Convertir HTML a canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      // Crear PDF desde el canvas
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } finally {
      // Limpiar elementos temporales
      const tempContainer = document.querySelector('[style*="left: -9999px"]') as HTMLElement;
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }
  }
}
