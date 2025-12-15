package unpsjb.labprog.backend.business.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import unpsjb.labprog.backend.business.repository.AccountActivationTokenRepository;
import unpsjb.labprog.backend.business.repository.UserRepository;
import unpsjb.labprog.backend.model.AccountActivationToken;
import unpsjb.labprog.backend.model.User;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Servicio para la gestión de activación de cuentas mediante email.
 * Maneja la generación, validación y activación de tokens de verificación.
 */
@Service
@Transactional
public class AccountActivationService {
    
    private static final Logger logger = LoggerFactory.getLogger(AccountActivationService.class);
    private static final String TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int TOKEN_LENGTH = 64;
    
    @Autowired
    private AccountActivationTokenRepository tokenRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private AuditLogService auditLogService;
    
    private final SecureRandom secureRandom = new SecureRandom();
    
    // Tiempo de expiración del token en minutos (por defecto 48 horas)
    @Value("${account.activation.token.expiration.minutes:2880}")
    private int tokenExpirationMinutes;
    
    // Máximo número de tokens activos por usuario
    @Value("${account.activation.max.tokens.per.user:3}")
    private int maxTokensPerUser;
    
    // URL base de la aplicación frontend
    @Value("${app.url}")
    private String frontendUrl;
    
    // Nombre de la aplicación
    @Value("${app.name}")
    private String appName;
    
    /**
     * Inicia el proceso de activación enviando un email con el token.
     * 
     * @param email Email del usuario
     * @return CompletableFuture para procesamiento asíncrono
     */
    @Async
    public CompletableFuture<Void> initiateAccountActivation(String email) {
        try {
            // Buscar el usuario por email
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                logger.warn("Intento de activación para email no registrado: {}", email);
                return CompletableFuture.completedFuture(null); // No revelar si el email existe
            }
            
            User user = userOpt.get();
            
            // Verificar si ya está activado
            if (user.isEmailVerified()) {
                logger.info("Intento de activación para cuenta ya verificada: {}", email);
                return CompletableFuture.completedFuture(null);
            }
            
            // Verificar límite de tokens activos
            int activeTokens = tokenRepository.countActiveTokensByUser(user, LocalDateTime.now());
            if (activeTokens >= maxTokensPerUser) {
                logger.warn("Usuario {} ha excedido el límite de tokens de activación activos", email);
                return CompletableFuture.completedFuture(null);
            }
            
            // Generar nuevo token
            String token = generateSecureToken();
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(tokenExpirationMinutes);
            
            AccountActivationToken activationToken = new AccountActivationToken(token, user, expiresAt);
            tokenRepository.save(activationToken);
            
            // Construir enlace de activación
            String activationLink = frontendUrl + "/activate-account?token=" + token;
            
            // Enviar email de activación (llamada síncrona, ya estamos en thread @Async)
            emailService.sendHtmlEmail(
                email, 
                appName + " - Activar tu cuenta",
                buildAccountActivationEmailBody(activationLink, user.getNombre() + " " + user.getApellido())
            );
            
            logger.info("Token de activación enviado para usuario: {}", email);
            return CompletableFuture.completedFuture(null);
            
        } catch (Exception e) {
            logger.error("Error al procesar activación para {}: {}", email, e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }
    
    /**
     * Construye el cuerpo HTML para el email de activación.
     */
    private String buildAccountActivationEmailBody(String activationLink, String userName) {
        return String.format(
            """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Activar cuenta</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c5aa0;">¡Bienvenido a %s, %s!</h2>
                    <p>Tu cuenta ha sido creada exitosamente. Para comenzar a usar nuestros servicios, necesitas activar tu cuenta.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Activar cuenta</a>
                    </div>
                    <p>Una vez activada tu cuenta, podrás acceder a todas las funcionalidades del sistema.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                </div>
            </body>
            </html>
            """,
            appName, userName, activationLink);
    }
    
    /**
     * Valida un token de activación.
     * 
     * @param token Token a validar
     * @return true si el token es válido
     */
    public boolean validateActivationToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        
        Optional<AccountActivationToken> tokenOpt = tokenRepository.findByTokenAndUsedFalse(token);
        return tokenOpt.map(AccountActivationToken::isValid).orElse(false);
    }
    
    /**
     * Activa una cuenta usando un token válido.
     * 
     * @param token Token de activación
     * @return true si la activación fue exitosa
     * @throws IllegalArgumentException si el token es inválido
     */
    public boolean activateAccount(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Token de activación requerido");
        }
        
        // Buscar token válido
        Optional<AccountActivationToken> tokenOpt = tokenRepository.findByTokenAndUsedFalse(token);
        if (tokenOpt.isEmpty()) {
            logger.warn("Intento de activación con token no encontrado: {}", token);
            throw new IllegalArgumentException("Token de activación inválido o expirado");
        }
        
        AccountActivationToken activationToken = tokenOpt.get();
        
        // Verificar si el token es válido
        if (!activationToken.isValid()) {
            logger.warn("Intento de activación con token expirado para usuario: {}", 
                       activationToken.getUser().getEmail());
            throw new IllegalArgumentException("Token de activación expirado");
        }
        
        User user = activationToken.getUser();
        
        // Verificar si ya está activado
        if (user.isEmailVerified()) {
            logger.info("Intento de activación para cuenta ya verificada: {}", user.getEmail());
            // Marcar token como usado aunque ya esté activada
            activationToken.markAsUsed();
            tokenRepository.save(activationToken);
            return true;
        }
        
        // Activar la cuenta
        user.activateAccount();
        userRepository.save(user);
        
        // Marcar token como usado
        activationToken.markAsUsed();
        tokenRepository.save(activationToken);
        
        // Invalidar otros tokens del usuario
        tokenRepository.invalidateAllUserTokens(user, LocalDateTime.now());
        
        // Auditar activación
        auditLogService.logAccountActivation(user.getId(), user.getEmail(), "EMAIL_VERIFICATION", 
                                           "Cuenta activada mediante enlace de email");
        
        logger.info("Cuenta activada exitosamente para usuario: {}", user.getEmail());
        return true;
    }
    
    /**
     * Reenvía el email de activación para un usuario.
     * 
     * @param email Email del usuario
     * @return CompletableFuture para procesamiento asíncrono
     */
    public CompletableFuture<Void> resendActivationEmail(String email) {
        logger.info("Reenviando email de activación para: {}", email);
        return initiateAccountActivation(email);
    }
    
    /**
     * Obtiene información sobre un token sin validar su estado.
     * 
     * @param token Token a consultar
     * @return Optional con el token si existe
     */
    public Optional<AccountActivationToken> getTokenInfo(String token) {
        return tokenRepository.findByToken(token);
    }
    
    /**
     * Obtiene el tiempo de expiración configurado en minutos.
     */
    public int getTokenExpirationMinutes() {
        return tokenExpirationMinutes;
    }
    
    /**
     * Invalida todos los tokens de activación de un usuario.
     * 
     * @param email Email del usuario
     */
    public void invalidateAllUserTokens(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            tokenRepository.invalidateAllUserTokens(userOpt.get(), LocalDateTime.now());
            logger.info("Todos los tokens de activación invalidados para usuario: {}", email);
        }
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
     * Se ejecuta cada 6 horas.
     */
    @Scheduled(fixedRate = 21600000) // Cada 6 horas
    public void cleanupExpiredTokens() {
        try {
            LocalDateTime cutoffTime = LocalDateTime.now();
            int deletedCount = tokenRepository.deleteExpiredTokens(cutoffTime);
            if (deletedCount > 0) {
                logger.info("Limpieza automática: {} tokens de activación expirados eliminados", deletedCount);
            }
        } catch (Exception e) {
            logger.error("Error durante la limpieza de tokens de activación: {}", e.getMessage());
        }
    }
}
