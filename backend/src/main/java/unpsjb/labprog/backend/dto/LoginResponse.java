package unpsjb.labprog.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO para response de login con tokens
 * Incluye información de multi-tenencia (centroAtencionId)
 */
@Getter
@Setter
@AllArgsConstructor
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private String email;
    private String nombre;
    private String role;
    private java.util.List<String> roles; // Lista completa de roles incluyendo heredados
    
    /**
     * ID del centro de atención del usuario (MULTI-TENENCIA)
     * - NULL: Usuario con acceso global (SUPERADMIN, PACIENTE)
     * - NOT NULL: Usuario limitado a un centro (ADMINISTRADOR, MEDICO, OPERADOR)
     */
    private Integer centroAtencionId;
    
    public LoginResponse(String accessToken, String refreshToken, String email, String nombre) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.email = email;
        this.nombre = nombre;
    }
    
    public LoginResponse(String accessToken, String refreshToken, String email, String nombre, String role) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.email = email;
        this.nombre = nombre;
        this.role = role;
    }
    
    public LoginResponse(String accessToken, String refreshToken, String email, String nombre, String role, java.util.List<String> roles) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.email = email;
        this.nombre = nombre;
        this.role = role;
        this.roles = roles;
    }
    
    public LoginResponse(String accessToken, String refreshToken, String email, String nombre, String role, java.util.List<String> roles, Integer centroAtencionId) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.email = email;
        this.nombre = nombre;
        this.role = role;
        this.roles = roles;
        this.centroAtencionId = centroAtencionId;
    }
}
