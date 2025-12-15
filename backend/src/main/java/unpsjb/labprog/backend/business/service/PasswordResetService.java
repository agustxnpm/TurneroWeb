package unpsjb.labprog.backend.business.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import unpsjb.labprog.backend.business.repository.PasswordResetTokenRepository;
import unpsjb.labprog.backend.business.repository.UserRepository;
import unpsjb.labprog.backend.model.PasswordResetToken;
import unpsjb.labprog.backend.model.User;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Servicio para la gestión de recuperación de contraseñas.
 * Maneja la generación, validación y expiración de tokens de recuperación.
 */
@Service
@Transactional
public class PasswordResetService {
    
    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);
    private static final String TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int TOKEN_LENGTH = 64;
    
    @Autowired
    private PasswordResetTokenRepository tokenRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    // Tiempo de expiración del token en minutos (por defecto 24 horas)
    @Value("${password.reset.token.expiration.minutes:1440}")
    private int tokenExpirationMinutes;
    
    // URL base de la aplicación frontend
    @Value("${app.url}")
    private String appUrl;
    
    // Máximo de tokens válidos por usuario
    @Value("${password.reset.max.tokens.per.user:3}")
    private int maxTokensPerUser;
    
    private final SecureRandom secureRandom = new SecureRandom();
    
    /**
     * Inicia el proceso de recuperación de contraseña para un usuario.
     * Genera un token y envía el email con el enlace de recuperación.
     * 
     * @param email Email del usuario
     * @return CompletableFuture que se completa cuando el proceso termina
     * @throws IllegalArgumentException si el email no existe
     */
    @Async
    public CompletableFuture<Void> initiatePasswordReset(String email) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                logger.warn("Intento de recuperación de contraseña para email no existente: {}", email);
                throw new IllegalArgumentException("No existe un usuario con el email proporcionado");
            }
            
            User user = userOpt.get();
            
            // Verificar si ya hay muchos tokens válidos para este usuario
            long validTokens = tokenRepository.countValidTokensForUser(user, LocalDateTime.now());
            if (validTokens >= maxTokensPerUser) {
                logger.warn("Usuario {} ha excedido el límite de tokens de recuperación", email);
                // Invalidar tokens antiguos
                tokenRepository.invalidateAllUserTokens(user);
            }
            
            // Generar nuevo token
            String token = generateSecureToken();
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(tokenExpirationMinutes);
            
            // Crear y guardar el token
            PasswordResetToken resetToken = new PasswordResetToken(token, user, expiresAt);
            tokenRepository.save(resetToken);
            
            // Construir el enlace de recuperación
            String resetLink = appUrl + "/reset-password?token=" + token;
            
            // Enviar email (llamada síncrona, ya estamos en thread @Async)
            emailService.sendHtmlEmail(user.getEmail(), "Restablecer contraseña", buildPasswordResetEmailBody(resetLink));
            
            logger.info("Token de recuperación generado para usuario: {} (expira: {})", 
                       email, expiresAt);
            
            return CompletableFuture.completedFuture(null);
            
        } catch (Exception e) {
            logger.error("Error al procesar recuperación de contraseña para {}: {}", email, e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }
    
    /**
     * Construye el cuerpo HTML para el email de recuperación de contraseña.
     */
    private String buildPasswordResetEmailBody(String resetLink) {
        return String.format(
            """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Restablecer contraseña</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c5aa0;">Restablecer contraseña</h2>
                    <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                    <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer contraseña</a>
                    </div>
                    <p><strong>Este enlace expirará en 24 horas por seguridad.</strong></p>
                    <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                </div>
            </body>
            </html>
            """,
            resetLink);
    }
    
    /**
     * Valida un token de recuperación de contraseña.
     * 
     * @param tokenValue Valor del token
     * @return true si el token es válido
     */
    public boolean validateResetToken(String tokenValue) {
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(tokenValue);
        
        if (tokenOpt.isEmpty()) {
            logger.warn("Token de recuperación no encontrado: {}", tokenValue);
            return false;
        }
        
        PasswordResetToken token = tokenOpt.get();
        boolean isValid = token.isValid();
        
        if (!isValid) {
            logger.warn("Token de recuperación inválido o expirado: {} (usado: {}, expirado: {})", 
                       tokenValue, token.getUsed(), token.isExpired());
        }
        
        return isValid;
    }
    
    /**
     * Restablece la contraseña usando un token válido.
     * 
     * @param tokenValue Valor del token
     * @param newPassword Nueva contraseña
     * @return true si la operación fue exitosa
     * @throws IllegalArgumentException si el token es inválido
     */
    public boolean resetPassword(String tokenValue, String newPassword) {
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(tokenValue);
        
        if (tokenOpt.isEmpty()) {
            throw new IllegalArgumentException("Token de recuperación no válido");
        }
        
        PasswordResetToken token = tokenOpt.get();
        
        if (!token.isValid()) {
            throw new IllegalArgumentException("Token de recuperación expirado o ya utilizado");
        }
        
        try {
            // Cambiar la contraseña del usuario
            User user = token.getUser();
            user.setHashedPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            
            // Marcar el token como usado
            token.markAsUsed();
            tokenRepository.save(token);
            
            // Invalidar todos los demás tokens del usuario por seguridad
            tokenRepository.invalidateAllUserTokens(user);
            
            logger.info("Contraseña restablecida exitosamente para usuario: {}", user.getEmail());
            
            return true;
            
        } catch (Exception e) {
            logger.error("Error al restablecer contraseña: {}", e.getMessage());
            throw new RuntimeException("Error interno al procesar el cambio de contraseña", e);
        }
    }
    
    /**
     * Obtiene información sobre un token sin validar su estado.
     * 
     * @param tokenValue Valor del token
     * @return Optional con el token si existe
     */
    public Optional<PasswordResetToken> getTokenInfo(String tokenValue) {
        return tokenRepository.findByToken(tokenValue);
    }
    
    /**
     * Genera un token seguro y único.
     */
    private String generateSecureToken() {
        StringBuilder token = new StringBuilder();
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            token.append(TOKEN_CHARS.charAt(secureRandom.nextInt(TOKEN_CHARS.length())));
        }
        return token.toString();
    }
    
    /**
     * Tarea programada para limpiar tokens expirados.
     * Se ejecuta cada hora.
     */
    @Scheduled(fixedRate = 3600000) // Cada hora
    public void cleanupExpiredTokens() {
        try {
            LocalDateTime now = LocalDateTime.now();
            tokenRepository.deleteExpiredTokens(now);
            logger.debug("Limpieza de tokens expirados completada");
        } catch (Exception e) {
            logger.error("Error durante la limpieza de tokens expirados: {}", e.getMessage());
        }
    }
    
    /**
     * Invalida todos los tokens de un usuario (útil para logout global).
     * 
     * @param email Email del usuario
     */
    public void invalidateAllUserTokens(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            tokenRepository.invalidateAllUserTokens(userOpt.get());
            logger.info("Todos los tokens invalidados para usuario: {}", email);
        }
    }
    
    /**
     * Obtiene el tiempo de expiración configurado en minutos.
     * 
     * @return Tiempo de expiración en minutos
     */
    public int getTokenExpirationMinutes() {
        return tokenExpirationMinutes;
    }
    
}
