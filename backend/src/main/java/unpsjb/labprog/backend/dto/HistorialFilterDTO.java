package unpsjb.labprog.backend.dto;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para filtrar el historial de turnos de un paciente
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistorialFilterDTO {

    // Filtros específicos para historial
    private String estado; // PROGRAMADO, CONFIRMADO, CANCELADO, COMPLETO, REAGENDADO

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fechaDesde; // Fecha desde (inclusive)

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fechaHasta; // Fecha hasta (inclusive)

    // Filtros adicionales
    private Integer especialidadId; // Filtrar por especialidad
    private String nombreEspecialidad; // Buscar por nombre de especialidad
    private Integer centroId; // Filtrar por centro de atención
    private String nombreCentro; // Buscar por nombre del centro
    private Integer medicoId; // Filtrar por médico específico
    private String nombreMedico; // Buscar por nombre del médico

    // Filtros de tipo de turno
    private Boolean soloFuturos; // true = solo turnos futuros
    private Boolean soloPasados; // true = solo turnos pasados
    private Boolean soloCancelados; // true = solo turnos cancelados
    private Boolean conObservaciones; // true = solo turnos con observaciones

    // Paginación y ordenamiento
    private Integer page = 0; // Página (base 0)
    private Integer size = 20; // Tamaño de página
    private String sortBy = "fecha"; // Campo por el que ordenar
    private String sortDirection = "DESC"; // ASC o DESC (por defecto DESC para ver más recientes)

    // Formato de exportación
    private String exportFormat; // CSV, PDF (si se especifica, es para exportar)

    // Métodos de conveniencia

    public boolean tieneFiltroEstado() {
        return estado != null && !estado.trim().isEmpty();
    }

    public boolean tieneFiltroFechas() {
        return fechaDesde != null || fechaHasta != null;
    }

    public boolean esExportacion() {
        return exportFormat != null && !exportFormat.trim().isEmpty();
    }

    public boolean esPaginado() {
        return !esExportacion();
    }
}