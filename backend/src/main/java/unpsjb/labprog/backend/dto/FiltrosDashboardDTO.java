package unpsjb.labprog.backend.dto;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FiltrosDashboardDTO {
    private LocalDate fechaDesde;
    private LocalDate fechaHasta;
    private Integer centroId;
    private Integer consultorioId;
    private Integer staffMedicoId;
    private Integer especialidadId;
}
