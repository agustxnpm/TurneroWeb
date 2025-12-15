package unpsjb.labprog.backend.dto;

import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConsultorioDTO {
    private Integer id;
    private Integer numero;
    private String nombre;
    private Integer centroId;
    private String nombreCentro;
    
    public Integer getCentroAtencionId() {
        return this.centroId;
    }

    public void setCentroAtencionId(Integer centroAtencionId) {
        this.centroId = centroAtencionId;
    }
    
    // Campo para especialidad si es necesario (puede venir del frontend)
    private String especialidad;
    
    // Horarios específicos por día de la semama
    private List<HorarioConsultorioDTO> horariosSemanales;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HorarioConsultorioDTO {
        private String diaSemana; // LUNES, MARTES, etc.
        private LocalTime horaApertura;
        private LocalTime horaCierre;
        private Boolean activo = true; // Para días que no atiende
    }
}
