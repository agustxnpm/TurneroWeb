package unpsjb.labprog.backend.dto;

import java.util.Date;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO para completar el perfil de usuarios de Google
 * Contiene los campos mínimos requeridos para completar un perfil incompleto
 */
@Getter
@Setter
@NoArgsConstructor
public class CompleteProfileDTO {
    private Long dni;
    private String telefono;
    private Date fechaNacimiento;
    private Integer obraSocialId; // Opcional
}
