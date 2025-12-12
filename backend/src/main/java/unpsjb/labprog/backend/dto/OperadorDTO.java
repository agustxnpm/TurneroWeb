package unpsjb.labprog.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class OperadorDTO {
    private Long id;
    private String nombre;
    private String apellido;
    private Long dni;
    private String email;
    private String password; // Para registro
    private boolean activo; // estado del operador
    private String telefono;
    private Integer centroAtencionId;
    private String centroAtencionNombre;
    
    // Campo para auditoría
    private String performedBy; // Usuario que realiza la acción
}
