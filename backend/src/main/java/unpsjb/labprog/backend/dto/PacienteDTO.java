package unpsjb.labprog.backend.dto;

import java.util.Date;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PacienteDTO {
    private Integer id;
    private Long dni;
    private String nombre;
    private String apellido;
    private String email;
    private String password; // Para registro
    private String telefono;
    private Date fechaNacimiento;
    private ObraSocialDTO obraSocial;
    private Integer obraSocialId; // Para registro
    
    private boolean profileCompleted = false; // Indica si el perfil está completo
    
    // Campo para auditoría
    private String performedBy; // Usuario que realiza la acción

    // Getters y Setters
}