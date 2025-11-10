package unpsjb.labprog.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OcupacionConsultorioDTO {
    private Integer consultorioId;
    private String consultorioNombre;
    private Integer consultorioNumero;
    private Double porcentajeOcupacion;
    private Integer centroAtencionId;
    private String centroAtencionNombre;
}
