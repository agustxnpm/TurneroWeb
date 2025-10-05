package unpsjb.labprog.backend.presenter;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.AccountActivationService;
import unpsjb.labprog.backend.business.service.PacienteService;
import unpsjb.labprog.backend.business.service.PasswordResetService;
import unpsjb.labprog.backend.business.service.PasswordService;
import unpsjb.labprog.backend.business.service.RegistrationService;
import unpsjb.labprog.backend.business.service.UserService;
import unpsjb.labprog.backend.config.JwtTokenProvider;
import unpsjb.labprog.backend.dto.AccountActivationRequestDTO;
import unpsjb.labprog.backend.dto.ActivationTokenValidationDTO;
import unpsjb.labprog.backend.dto.ChangePasswordRequestDTO;
import unpsjb.labprog.backend.dto.CheckEmailRequest;
import unpsjb.labprog.backend.dto.CheckEmailResponse;
import unpsjb.labprog.backend.dto.LoginRequest;
import unpsjb.labprog.backend.dto.LoginResponse;
import unpsjb.labprog.backend.dto.PasswordResetConfirmDTO;
import unpsjb.labprog.backend.dto.PasswordResetRequestDTO;
import unpsjb.labprog.backend.dto.RefreshTokenRequest;
import unpsjb.labprog.backend.dto.RegisterRequest;
import unpsjb.labprog.backend.dto.RegisterSuccessResponse;
import unpsjb.labprog.backend.dto.ResendActivationRequestDTO;
import unpsjb.labprog.backend.dto.TokenValidationDTO;
import unpsjb.labprog.backend.dto.PacienteDTO;
import unpsjb.labprog.backend.dto.UpdateProfileRequestDTO;
import unpsjb.labprog.backend.dto.UpdateProfileResponseDTO;
import unpsjb.labprog.backend.model.PasswordResetToken;
import unpsjb.labprog.backend.model.User;

/**
 * Controlador para endpoints de autenticación y recuperación de contraseñas
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Configurar según necesidades de seguridad
public class AuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserService userService;

    @Autowired
    private RegistrationService registrationService;
    
    @Autowired
    private PasswordResetService passwordResetService;
    
    @Autowired
    private PasswordService passwordService;
    
    @Autowired
    private AccountActivationService accountActivationService;

    @Autowired
    private PacienteService pacienteService;


    /**
     * Endpoint de login
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody LoginRequest request) {
        try {
            // Autenticar usuario
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            User user = (User) authentication.getPrincipal();
            
           
            // Verificar si la cuenta está activada (email verificado)
            if (!user.isEmailVerified()) {
                logger.warn("Intento de login con cuenta no verificada: {}", user.getEmail());
                return Response.response(HttpStatus.FORBIDDEN, 
                    "Cuenta no verificada. Por favor, verifica tu email antes de iniciar sesión. ", 
                    null);
            }
            

            // Generar tokens
            String accessToken = jwtTokenProvider.generateAccessToken(user);
            String refreshToken = jwtTokenProvider.generateRefreshToken(user);

            // Obtener lista completa de roles incluyendo heredados
            java.util.List<String> allRoles = new java.util.ArrayList<>();
            if (user.getRole() != null) {
                // Agregar el rol principal
                allRoles.add(user.getRole().getName());
                // Agregar todos los roles heredados
                user.getRole().getAllInheritedRoles().forEach(inheritedRole -> 
                    allRoles.add(inheritedRole.getName())
                );
            }

            // Crear response
            LoginResponse loginResponse = new LoginResponse(
                accessToken, 
                refreshToken, 
                user.getEmail(), 
                user.getNombre() + " " + user.getApellido(),
                user.getRole() != null ? user.getRole().getName() : "USER",
                allRoles
            );

            return Response.response(HttpStatus.OK, "Login exitoso", loginResponse);

        } catch (BadCredentialsException e) {
            return Response.response(HttpStatus.UNAUTHORIZED, "Credenciales inválidas", null);
        } catch (Exception e) {
            return Response.response(HttpStatus.INTERNAL_SERVER_ERROR, 
                "Error interno del servidor: " + e.getMessage(), null);
        }
    }

    /**
     * Endpoint de refresh token
     * POST /api/auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<Object> refreshToken(@RequestBody RefreshTokenRequest request) {
        try {
            String refreshToken = request.getRefreshToken();

            // Validar refresh token
            if (!jwtTokenProvider.validateRefreshToken(refreshToken)) {
                return Response.response(HttpStatus.UNAUTHORIZED, "Refresh token inválido o expirado", null);
            }

            // Extraer usuario del refresh token
            String email = jwtTokenProvider.extractUsername(refreshToken);
            UserDetails userDetails = userService.loadUserByUsername(email);

            // Generar nuevo access token
            String newAccessToken = jwtTokenProvider.generateAccessToken(userDetails);

            return Response.response(HttpStatus.OK, "Token renovado exitosamente", 
                new LoginResponse(newAccessToken, refreshToken, email, 
                    ((User) userDetails).getNombre() + " " + ((User) userDetails).getApellido(),
                    ((User) userDetails).getRole() != null ? ((User) userDetails).getRole().getName() : "USER"));

        } catch (Exception e) {
            return Response.response(HttpStatus.UNAUTHORIZED, "Error al renovar token: " + e.getMessage(), null);
        }
    }

    /**
     * Endpoint de registro de nuevo PACIENTE
     * Crea tanto el User (para autenticación) como la entidad Paciente (lógica de negocio)
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<Object> register(@RequestBody RegisterRequest request) {
        try {
            // Verificar si el email ya está registrado
            if (registrationService.existsByEmail(request.getEmail())) {
                return Response.response(HttpStatus.CONFLICT, "El email ya está registrado", null);
            }

            // Verificar si el DNI ya está registrado
            if (registrationService.existsByDni(request.getDniAsLong())) {
                return Response.response(HttpStatus.CONFLICT, "El DNI ya está registrado", null);
            }

            // 1. Registrar usuario para autenticación usando RegistrationService
            User newUser = registrationService.registrarPaciente(
                request.getEmail(),
                request.getPassword(),
                request.getDniAsLong(),
                request.getNombre(),
                request.getApellido(),
                request.getTelefono()
            );

            // 2. Crear la entidad Paciente usando PacienteService
            PacienteDTO pacienteDTO = new PacienteDTO();
            pacienteDTO.setNombre(request.getNombre());
            pacienteDTO.setApellido(request.getApellido());
            pacienteDTO.setDni(request.getDniAsLong());
            pacienteDTO.setEmail(request.getEmail());
            pacienteDTO.setTelefono(request.getTelefono());
            // No asignar fecha de nacimiento ni obra social en el registro básico
            
            // Crear la entidad Paciente sin auditoría (auto-registro)
            pacienteService.saveOrUpdate(pacienteDTO, "AUTO-REGISTRO");

            // Enviar email de activación automáticamente
            accountActivationService.initiateAccountActivation(newUser.getEmail());
            
            // Nota: No generamos tokens JWT hasta que la cuenta esté activada
            // El usuario deberá activar su cuenta antes de poder hacer login
            
            return Response.response(HttpStatus.OK, 
                "Usuario registrado exitosamente. Revisa tu email para activar tu cuenta.", 
                new RegisterSuccessResponse(
                    newUser.getEmail(),
                    newUser.getNombre() + " " + newUser.getApellido(),
                    "Se ha enviado un enlace de activación a tu email"
                ));

        } catch (IllegalArgumentException e) {
            return Response.response(HttpStatus.BAD_REQUEST, 
                "Error de validación: " + e.getMessage(), null);
        } catch (Exception e) {
            return Response.response(HttpStatus.INTERNAL_SERVER_ERROR, 
                "Error al registrar usuario: " + e.getMessage(), null);
        }
    }

    /**
     * Endpoint para verificar si un email existe y obtener información básica del usuario
     * POST /api/auth/check-email
     */
    @PostMapping("/check-email")
    public ResponseEntity<Object> checkEmail(@RequestBody CheckEmailRequest request) {
        try {
            Optional<User> userOptional = userService.findByEmail(request.getEmail());
            
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                
                // Crear response con información básica del usuario
                CheckEmailResponse response = new CheckEmailResponse(
                    user.getEmail(),
                    user.getNombre() + " " + user.getApellido(),
                    user.getRole() != null ? user.getRole().getName() : "USER"
                );
                
                return Response.response(HttpStatus.OK, "Email encontrado", response);
            } else {
                return Response.response(HttpStatus.NOT_FOUND, "Email no encontrado", null);
            }
            
        } catch (Exception e) {
            return Response.response(HttpStatus.INTERNAL_SERVER_ERROR, 
                "Error al verificar email: " + e.getMessage(), null);
        }
    }
    
    // ===============================
    // ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA
    // ===============================
    
    /**
     * Endpoint para solicitar recuperación de contraseña.
     * Envía un email con el enlace de recuperación al usuario.
     * 
     * @param request DTO con el email del usuario
     * @return ResponseEntity con el resultado de la operación
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Object> forgotPassword(@RequestBody PasswordResetRequestDTO request) {
        try {
            // Validar email
            if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
                return Response.error(null, "El email es requerido");
            }
            
            if (!isValidEmail(request.getEmail())) {
                return Response.error(null, "El formato del email no es válido");
            }
            
            // Iniciar proceso de recuperación asíncrono
            passwordResetService.initiatePasswordReset(request.getEmail());
            
            // Por seguridad, siempre devolvemos la misma respuesta (no revelar si el email existe)
            return Response.ok(null, "Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña");
            
        } catch (Exception e) {
            logger.error("Error en solicitud de recuperación de contraseña: {}", e.getMessage());
            return Response.error(null, "Error interno del servidor");
        }
    }
    
    /**
     * Endpoint para validar un token de recuperación.
     * Verifica si el token es válido y no ha expirado.
     * 
     * @param token Token a validar
     * @return ResponseEntity con el estado de validez del token
     */
    @GetMapping("/validate-reset-token")
    public ResponseEntity<Object> validateResetToken(@RequestParam("token") String token) {
        try {
            if (token == null || token.trim().isEmpty()) {
                return Response.error(
                    new TokenValidationDTO(false, "Token no proporcionado"),
                    "Token requerido"
                );
            }
            
            boolean isValid = passwordResetService.validateResetToken(token);
            
            if (isValid) {
                // Obtener información adicional del token
                Optional<PasswordResetToken> tokenInfo = passwordResetService.getTokenInfo(token);
                if (tokenInfo.isPresent()) {
                    String userEmail = tokenInfo.get().getUser().getEmail();
                    // Por seguridad, solo mostrar parte del email
                    String maskedEmail = maskEmail(userEmail);
                    
                    return Response.ok(
                        new TokenValidationDTO(true, "Token válido", maskedEmail),
                        "Token válido"
                    );
                }
            }
            
            return Response.error(
                new TokenValidationDTO(false, "Token inválido o expirado"),
                "Token inválido"
            );
            
        } catch (Exception e) {
            logger.error("Error al validar token de recuperación: {}", e.getMessage());
            return Response.error(
                new TokenValidationDTO(false, "Error interno del servidor"),
                "Error interno del servidor"
            );
        }
    }
    
    /**
     * Endpoint para confirmar el restablecimiento de contraseña.
     * Cambia la contraseña del usuario usando un token válido.
     * 
     * @param request DTO con el token y la nueva contraseña
     * @return ResponseEntity con el resultado de la operación
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Object> resetPassword(@RequestBody PasswordResetConfirmDTO request) {
        try {
            // Validar datos de entrada
            if (request.getToken() == null || request.getToken().trim().isEmpty()) {
                return Response.error(null, "Token requerido");
            }
            
            if (request.getNewPassword() == null || request.getNewPassword().trim().isEmpty()) {
                return Response.error(null, "Nueva contraseña requerida");
            }
            
            // Validar fortaleza de contraseña
            if (request.getNewPassword().length() < 6) {
                return Response.error(null, "La contraseña debe tener al menos 6 caracteres");
            }
            
            // Restablecer contraseña
            boolean success = passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
            
            if (success) {
                return Response.ok(null, "Contraseña restablecida exitosamente");
            } else {
                return Response.error(null, "Error al restablecer la contraseña");
            }
            
        } catch (IllegalArgumentException e) {
            logger.warn("Error de validación al restablecer contraseña: {}", e.getMessage());
            return Response.error(null, e.getMessage());
            
        } catch (Exception e) {
            logger.error("Error al restablecer contraseña: {}", e.getMessage());
            return Response.error(null, "Error interno del servidor");
        }
    }
    
    /**
     * Endpoint para obtener información sobre la configuración de expiración.
     * Útil para el frontend.
     * 
     * @return ResponseEntity con información sobre la expiración de tokens
     */
    @GetMapping("/reset-token-info")
    public ResponseEntity<Object> getResetTokenInfo() {
        try {
            int expirationMinutes = passwordResetService.getTokenExpirationMinutes();
            int expirationHours = expirationMinutes / 60;
            
            return Response.ok(
                new TokenInfoResponse(expirationMinutes, expirationHours),
                "Información de configuración obtenida"
            );
            
        } catch (Exception e) {
            logger.error("Error al obtener información de token: {}", e.getMessage());
            return Response.error(null, "Error interno del servidor");
        }
    }
    
    // ===============================
    // ENDPOINTS DE CAMBIO DE CONTRASEÑA
    // ===============================
    
    /**
     * Endpoint para cambiar contraseña desde el perfil del usuario.
     * Requiere autenticación y validación de contraseña actual.
     * 
     * @param request DTO con contraseña actual y nueva
     * @param httpRequest HttpServletRequest para extraer JWT del header
     * @return ResponseEntity con el resultado de la operación
     */
    @PostMapping("/change-password")
    public ResponseEntity<Object> changePassword(@RequestBody ChangePasswordRequestDTO request, 
                                               HttpServletRequest httpRequest) {
        try {
            // Validar datos de entrada
            if (request.getCurrentPassword() == null || request.getCurrentPassword().trim().isEmpty()) {
                return Response.error(null, "La contraseña actual es requerida");
            }
            
            if (request.getNewPassword() == null || request.getNewPassword().trim().isEmpty()) {
                return Response.error(null, "La nueva contraseña es requerida");
            }
            
            if (request.getConfirmPassword() == null || request.getConfirmPassword().trim().isEmpty()) {
                return Response.error(null, "La confirmación de contraseña es requerida");
            }
            
            // Validar que las contraseñas coincidan
            if (!request.isPasswordConfirmationValid()) {
                return Response.error(null, "La nueva contraseña y su confirmación no coinciden");
            }
            
            // Extraer userId del JWT token
            Long userId = getCurrentUserId(httpRequest);
            if (userId == null) {
                return Response.error(null, "Token JWT requerido. Debe incluir el header Authorization con Bearer token válido.");
            }
            
            // Cambiar contraseña usando el servicio
            boolean success = passwordService.changePasswordFromProfile(
                userId, 
                request.getCurrentPassword(), 
                request.getNewPassword()
            );
            
            if (success) {
                // Obtener email para log
                String userEmail = getCurrentUserEmail(httpRequest);
                logger.info("Contraseña cambiada exitosamente para usuario ID: {} ({})", userId, userEmail);
                return Response.ok(null, "Contraseña cambiada exitosamente");
            } else {
                return Response.error(null, "Error al cambiar la contraseña");
            }
            
        } catch (IllegalArgumentException e) {
            logger.warn("Error de validación al cambiar contraseña: {}", e.getMessage());
            return Response.error(null, e.getMessage());
            
        } catch (Exception e) {
            logger.error("Error al cambiar contraseña: {}", e.getMessage());
            return Response.error(null, "Error interno del servidor");
        }
    }
    
    // ===============================
    // ENDPOINTS DE ACTIVACIÓN DE CUENTA
    // ===============================
    
    /**
     * Endpoint para validar un token de activación.
     * Verifica si el token es válido y no ha expirado.
     * 
     * @param token Token a validar
     * @return ResponseEntity con el estado de validez del token
     */
    @GetMapping("/validate-activation-token")
    public ResponseEntity<Object> validateActivationToken(@RequestParam("token") String token) {
        try {
            if (token == null || token.trim().isEmpty()) {
                return Response.error(
                    new ActivationTokenValidationDTO(false, "Token no proporcionado"),
                    "Token requerido"
                );
            }
            
            boolean isValid = accountActivationService.validateActivationToken(token);
            
            if (isValid) {
                // Obtener información adicional del token
                var tokenInfo = accountActivationService.getTokenInfo(token);
                if (tokenInfo.isPresent()) {
                    String userEmail = tokenInfo.get().getUser().getEmail();
                    // Calcular minutos restantes hasta expiración
                    long minutesUntilExpiration = java.time.Duration.between(
                        java.time.LocalDateTime.now(), 
                        tokenInfo.get().getExpiresAt()
                    ).toMinutes();
                    
                    return Response.ok(
                        new ActivationTokenValidationDTO(true, "Token válido", 
                                                       maskEmail(userEmail), 
                                                       (int) Math.max(0, minutesUntilExpiration)),
                        "Token válido"
                    );
                }
            }
            
            return Response.error(
                new ActivationTokenValidationDTO(false, "Token inválido o expirado"),
                "Token inválido"
            );
            
        } catch (Exception e) {
            logger.error("Error al validar token de activación: {}", e.getMessage());
            return Response.error(
                new ActivationTokenValidationDTO(false, "Error interno del servidor"),
                "Error interno del servidor"
            );
        }
    }
    
    /**
     * Endpoint para activar una cuenta usando un token.
     * 
     * @param request DTO con el token de activación
     * @return ResponseEntity con el resultado de la operación
     */
    @PostMapping("/activate-account")
    public ResponseEntity<Object> activateAccount(@RequestBody AccountActivationRequestDTO request) {
        try {
            // Validar datos de entrada
            if (request.getToken() == null || request.getToken().trim().isEmpty()) {
                return Response.error(null, "Token de activación requerido");
            }
            
            // Activar cuenta
            boolean success = accountActivationService.activateAccount(request.getToken());
            
            if (success) {
                return Response.ok(null, "Cuenta activada exitosamente. Ya puedes iniciar sesión.");
            } else {
                return Response.error(null, "Error al activar la cuenta");
            }
            
        } catch (IllegalArgumentException e) {
            logger.warn("Error de validación al activar cuenta: {}", e.getMessage());
            return Response.error(null, e.getMessage());
            
        } catch (Exception e) {
            logger.error("Error al activar cuenta: {}", e.getMessage());
            return Response.error(null, "Error interno del servidor");
        }
    }
    
    /**
     * Endpoint para reenviar email de activación.
     * 
     * @param request DTO con el email del usuario
     * @return ResponseEntity con el resultado de la operación
     */
    @PostMapping("/resend-activation")
    public ResponseEntity<Object> resendActivation(@RequestBody ResendActivationRequestDTO request) {
        try {
            // Validar email
            if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
                return Response.error(null, "El email es requerido");
            }
            
            if (!isValidEmail(request.getEmail())) {
                return Response.error(null, "El formato del email no es válido");
            }
            
            // Reenviar email de activación
            accountActivationService.resendActivationEmail(request.getEmail());
            
            // Por seguridad, siempre devolvemos la misma respuesta
            return Response.ok(null, 
                "Si el email existe y no está activado, recibirás un nuevo enlace de activación");
            
        } catch (Exception e) {
            logger.error("Error al reenviar activación: {}", e.getMessage());
            return Response.error(null, "Error interno del servidor");
        }
    }
    
    /**
     * Endpoint para obtener información de configuración de activación.
     * 
     * @return ResponseEntity con información sobre la expiración de tokens
     */
    @GetMapping("/activation-info")
    public ResponseEntity<Object> getActivationInfo() {
        try {
            int expirationMinutes = accountActivationService.getTokenExpirationMinutes();
            int expirationHours = expirationMinutes / 60;
            
            return Response.ok(
                new TokenInfoResponse(expirationMinutes, expirationHours),
                "Información de configuración obtenida"
            );
            
        } catch (Exception e) {
            logger.error("Error al obtener información de activación: {}", e.getMessage());
            return Response.error(null, "Error interno del servidor");
        }
    }
    
    // ===============================
    // MÉTODOS AUXILIARES PARA JWT
    // ===============================
    
    /**
     * Extrae el userId del JWT token del header Authorization
     * 
     * @param request HttpServletRequest para obtener headers
     * @return Long userId o null si no se puede extraer
     */
    private Long getCurrentUserId(jakarta.servlet.http.HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return null;
            }
            
            String token = authHeader.substring(7); // Remover "Bearer "
            return jwtTokenProvider.extractUserId(token);
            
        } catch (Exception e) {
            logger.warn("Error al extraer userId del token: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Extrae el email del usuario del JWT token
     */
    private String getCurrentUserEmail(jakarta.servlet.http.HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return null;
            }
            
            String token = authHeader.substring(7);
            return jwtTokenProvider.extractUsername(token);
            
        } catch (Exception e) {
            logger.warn("Error al extraer email del token: {}", e.getMessage());
            return null;
        }
    }
    
    // ===============================
    // MÉTODOS AUXILIARES PARA RECUPERACIÓN DE CONTRASEÑA
    // ===============================
    
    /**
     * Valida formato básico de email
     */
    private boolean isValidEmail(String email) {
        return email != null && 
               email.contains("@") && 
               email.contains(".") &&
               email.length() > 5;
    }
    
    /**
     * Actualiza el perfil del usuario autenticado
     * 
     * @param request DTO con nombre y email nuevos
     * @param httpRequest HttpServletRequest para extraer JWT del header
     * @return ResponseEntity con el resultado de la operación
     */
    @PutMapping("/update-profile")
    public ResponseEntity<Object> updateProfile(@RequestBody UpdateProfileRequestDTO request, 
                                              HttpServletRequest httpRequest) {
        try {
            // Validar datos de entrada
            if (!request.isValid()) {
                return Response.error(null, "Nombre y email válidos son requeridos");
            }
            
            // Extraer userId del JWT token
            Long userId = getCurrentUserId(httpRequest);
            if (userId == null) {
                return Response.error(null, "Token JWT requerido. Debe incluir el header Authorization con Bearer token válido.");
            }
            
            // Buscar el usuario
            Optional<User> userOpt = userService.findById(userId);
            if (userOpt.isEmpty()) {
                return Response.error(null, "Usuario no encontrado");
            }
            
            User user = userOpt.get();
            
            // Verificar si el email ya está en uso por otro usuario
            if (!user.getEmail().equals(request.getEmail())) {
                Optional<User> existingUser = userService.findByEmail(request.getEmail());
                if (existingUser.isPresent() && !existingUser.get().getId().equals(userId)) {
                    return Response.error(null, "El email ya está en uso por otro usuario");
                }
            }
            
            // Actualizar el usuario con todos los campos
            user.setNombre(request.getNombre());
            user.setApellido(request.getApellido());
            user.setEmail(request.getEmail());
            user.setTelefono(request.getTelefono());
            
            // Manejar DNI - convertir String a Long si es válido
            if (request.getDni() != null && !request.getDni().trim().isEmpty()) {
                try {
                    Long dniValue = Long.valueOf(request.getDni().trim());
                    user.setDni(dniValue);
                } catch (NumberFormatException e) {
                    return Response.error(null, "DNI debe ser un número válido");
                }
            }
            
            User updatedUser = userService.save(user);
            
            // Crear UserDTO con todos los datos
            UpdateProfileResponseDTO.UserDTO userDTO = new UpdateProfileResponseDTO.UserDTO(
                updatedUser.getId(),
                updatedUser.getNombre(),
                updatedUser.getApellido(),
                updatedUser.getEmail(),
                updatedUser.getTelefono(),
                updatedUser.getDni() != null ? updatedUser.getDni().toString() : null,
                updatedUser.getRole().getName()
            );
            
            UpdateProfileResponseDTO response = new UpdateProfileResponseDTO(
                "Perfil actualizado correctamente",
                userDTO
            );
            
            logger.info("Perfil actualizado para usuario ID: {}", userId);
            return Response.ok(response, "Perfil actualizado correctamente");
            
        } catch (Exception e) {
            logger.error("Error actualizando perfil: {}", e.getMessage(), e);
            return Response.error(null, "Error interno del servidor al actualizar el perfil");
        }
    }

    /**
     * Enmascara un email para mostrar solo parte de él
     */
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        
        String[] parts = email.split("@");
        String localPart = parts[0];
        String domainPart = parts[1];
        
        if (localPart.length() <= 2) {
            return "*@" + domainPart;
        }
        
        return localPart.substring(0, 2) + "***@" + domainPart;
    }
    
    /**
     * DTO interno para información de token
     */
    public static class TokenInfoResponse {
        private int expirationMinutes;
        private int expirationHours;
        
        public TokenInfoResponse(int expirationMinutes, int expirationHours) {
            this.expirationMinutes = expirationMinutes;
            this.expirationHours = expirationHours;
        }
        
        public int getExpirationMinutes() { return expirationMinutes; }
        public int getExpirationHours() { return expirationHours; }
    }
}
