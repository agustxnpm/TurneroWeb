package unpsjb.labprog.backend.business.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import unpsjb.labprog.backend.business.repository.*;
import unpsjb.labprog.backend.config.JwtTokenProvider;
import unpsjb.labprog.backend.dto.DeepLinkResponseDTO;
import unpsjb.labprog.backend.model.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

/**
 * Servicio para gestión de deep links (enlaces profundos)
 * Permite a los usuarios acceder a rutas específicas desde enlaces externos
 * con autenticación automática y contexto pre-establecido
 */
@Service
@Transactional
public class DeepLinkService {

    @Autowired
    private DeepLinkTokenRepository deepLinkTokenRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private UserRepository userRepository;

    // TODO: Agregar repositorios cuando se implemente funcionalidad de filtros
    // automáticos
    // @Autowired private MedicoRepository medicoRepository;
    // @Autowired private EspecialidadRepository especialidadRepository;
    // @Autowired private CentroAtencionRepository centroAtencionRepository;
    // @Autowired private TurnoRepository turnoRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserService userService;

    private static final int TOKEN_LENGTH = 64;
    private static final int EXPIRATION_HOURS = 48; // 48 horas de validez
    private static final SecureRandom secureRandom = new SecureRandom();

    /**
     * Genera un token seguro de deep link para un paciente
     */
    public String generarDeepLinkToken(Integer pacienteId, Integer turnoId, String tipo) {
        // Generar token aleatorio seguro
        byte[] randomBytes = new byte[TOKEN_LENGTH];
        secureRandom.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        // Crear entidad de token
        DeepLinkToken deepLinkToken = new DeepLinkToken();
        deepLinkToken.setToken(token);
        deepLinkToken.setPacienteId(pacienteId);
        deepLinkToken.setTurnoId(turnoId);
        deepLinkToken.setTipo(tipo);
        deepLinkToken.setFechaExpiracion(LocalDateTime.now().plusHours(EXPIRATION_HOURS));

        // TODO: Implementar filtros automáticos basados en el contexto del turno
        // Por ahora solo redirige a la agenda sin filtros pre-seleccionados
        // Funcionalidad pendiente: extraer médico, especialidad, centro de atención del
        // turno
        // para pre-seleccionar filtros en la agenda del paciente

        deepLinkTokenRepository.save(deepLinkToken);
        return token;
    }

    /**
     * Valida un token de deep link y retorna los datos de autenticación
     */
    @Transactional
    public DeepLinkResponseDTO validarDeepLinkToken(String token) {
        // Buscar token válido
        Optional<DeepLinkToken> tokenOpt = deepLinkTokenRepository.findValidToken(token, LocalDateTime.now());

        if (tokenOpt.isEmpty()) {
            throw new RuntimeException("Token inválido o expirado");
        }

        DeepLinkToken deepLinkToken = tokenOpt.get();

        // Marcar token como usado
        deepLinkToken.marcarComoUsado();
        deepLinkTokenRepository.save(deepLinkToken);

        // Obtener paciente
        Optional<Paciente> pacienteOpt = pacienteRepository.findById(deepLinkToken.getPacienteId());
        if (pacienteOpt.isEmpty()) {
            throw new RuntimeException("Paciente no encontrado");
        }

        Paciente paciente = pacienteOpt.get();

        // Obtener usuario asociado al paciente
        Optional<User> userOpt = userRepository.findByEmail(paciente.getEmail());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Usuario no encontrado");
        }

        User user = userOpt.get();

        // Verificar que la cuenta esté activa
        if (!user.isEnabled()) {
            throw new RuntimeException("Cuenta de usuario no activada");
        }

        // Generar tokens JWT
        UserDetails userDetails = userService.loadUserByUsername(user.getEmail());

        String accessToken = jwtTokenProvider.generateAccessToken(userDetails);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userDetails);

        // Construir respuesta con tokens (sin role, ya que va en el JWT)
        DeepLinkResponseDTO.TokensDTO tokens = new DeepLinkResponseDTO.TokensDTO(
                accessToken,
                refreshToken,
                "Bearer",
                user.getEmail(),
                paciente.getNombre() + " " + paciente.getApellido());

        // Construir contexto del turno (simplificado - sin filtros automáticos)
        DeepLinkResponseDTO.TurnoContextDTO context = new DeepLinkResponseDTO.TurnoContextDTO();
        context.setTurnoId(deepLinkToken.getTurnoId());
        context.setTipo(deepLinkToken.getTipo());

        // TODO: Implementar carga de información contextual para filtros automáticos
        // Funcionalidad pendiente: cargar médico, especialidad, centro de atención
        // desde el turno para pre-seleccionar filtros en la agenda

        return new DeepLinkResponseDTO(tokens, context);
    }

    /**
     * Limpia tokens expirados y usados antiguos
     * Este método debe ejecutarse periódicamente (ej: tarea programada)
     */
    @Transactional
    public void limpiarTokensAntiguos() {
        LocalDateTime now = LocalDateTime.now();

        // Eliminar tokens expirados
        deepLinkTokenRepository.deleteExpiredTokens(now);

        // Eliminar tokens usados con más de 7 días
        LocalDateTime sevenDaysAgo = now.minusDays(7);
        deepLinkTokenRepository.deleteOldUsedTokens(sevenDaysAgo);
    }
}
