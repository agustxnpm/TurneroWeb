package unpsjb.labprog.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {
    private String apellido;
    private String email;
    private String password;
    private String nombre;
    private String telefono;
    private String dni; // Cambiado a String para coincidir con frontend
    private String fechaNacimiento;
    private Integer centroId; // Para asignar centro al crear operadores/admins
    
    // Getter para DNI como Long para compatibilidad con backend
    public Long getDniAsLong() {
        try {
            return Long.parseLong(dni);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("DNI debe ser un número válido: " + dni);
        }
    }
}
