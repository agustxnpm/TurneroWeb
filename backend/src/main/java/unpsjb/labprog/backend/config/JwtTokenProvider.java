package unpsjb.labprog.backend.config;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import unpsjb.labprog.backend.model.User;
import unpsjb.labprog.backend.model.Role;
import unpsjb.labprog.backend.business.service.PacienteService;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Proveedor de tokens JWT para autenticación
 * Maneja la creación, validación y extracción de datos de tokens JWT
 */
@Component
public class JwtTokenProvider {

    // Clave secreta para firmar los tokens (debe ser segura en producción)
    @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    private String secretKey;

    // Tiempo de expiración del access token (15 minutos)
    @Value("${jwt.access-token-expiration:900000}")
    private long accessTokenExpiration;

    // Tiempo de expiración del refresh token (7 días)
    @Value("${jwt.refresh-token-expiration:604800000}")
    private long refreshTokenExpiration;

    // Servicio para buscar pacientes por email
    @Autowired
    @Lazy
    private PacienteService pacienteService;

    /**
     * Extrae el username (email) del token
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extrae la fecha de expiración del token
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extrae el userId del token
     */
    public Long extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        Object userIdObj = claims.get("userId");
        if (userIdObj instanceof Integer) {
            return ((Integer) userIdObj).longValue();
        } else if (userIdObj instanceof Long) {
            return (Long) userIdObj;
        }
        return null;
    }

    /**
     * Extrae el rol del token
     */
    public String extractRole(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("role", String.class);
    }

    /**
     * Extrae un claim específico del token
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Extrae todos los claims del token
     */
    private Claims extractAllClaims(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Verifica si el token ha expirado
     */
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Genera un access token para el usuario
     */
    public String generateAccessToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        if (userDetails instanceof User) {
            User user = (User) userDetails;
            claims.put("userId", user.getId());
            claims.put("role", user.getRole() != null ? user.getRole().getName() : "USER");

            // Si el usuario tiene acceso a PACIENTE (cualquier rol en la jerarquía), verificar paciente
            // Usa lógica centralizada de jerarquía de roles: user.getRole().hasAccessTo(Role.PACIENTE)
            if (user.getRole() != null && user.getRole().hasAccessTo(Role.PACIENTE)) {
                try {
                    // Buscar el paciente asociado por email usando el servicio
                    // Suponiendo que el email es único y coincide entre User y Paciente
                    var optionalPacienteDTO = pacienteService.findByEmail(user.getEmail());
                    System.out.println("Optional pacienteDTO: " + optionalPacienteDTO);
                    if (optionalPacienteDTO.isPresent()) {
                        var pacienteDTO = optionalPacienteDTO.get();
                        if (pacienteDTO.getId() != null) {
                            claims.put("pacienteId", pacienteDTO.getId());
                            // Añadir claim de profileCompleted
                            claims.put("profileCompleted", pacienteDTO.isProfileCompleted());
                        }
                    }
                } catch (Exception e) {
                    // Ignorar si no se puede obtener el paciente
                }
            }
        }
        return createToken(claims, userDetails.getUsername(), accessTokenExpiration);
    }

    /**
     * Genera un refresh token para el usuario
     */
    public String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tokenType", "refresh");
        return createToken(claims, userDetails.getUsername(), refreshTokenExpiration);
    }

    /**
     * Crea un token JWT con los claims especificados
     */
    private String createToken(Map<String, Object> claims, String subject, long expiration) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Valida si el token es válido para el usuario
     */
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    /**
     * Valida si el refresh token es válido
     */
    public Boolean validateRefreshToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            String tokenType = claims.get("tokenType", String.class);
            return "refresh".equals(tokenType) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Obtiene la clave de firma para los tokens
     */
    private Key getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
