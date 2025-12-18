package unpsjb.labprog.backend.presenter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.DeepLinkService;
import unpsjb.labprog.backend.dto.DeepLinkResponseDTO;
import unpsjb.labprog.backend.dto.DeepLinkValidationDTO;

/**
 * Controlador REST para gestión de deep links (enlaces profundos)
 * Permite validar tokens de deep link y establecer sesiones automáticamente
 */
@RestController
@RequestMapping("/api/deep-links")
@CrossOrigin(origins = "*")
public class DeepLinkPresenter {

    @Autowired
    private DeepLinkService deepLinkService;

    /**
     * Valida un token de deep link y retorna los datos de autenticación
     * 
     * POST /deep-links/validate
     * Body: { "token": "abc123..." }
     * 
     * @param request DTO con el token a validar
     * @return ResponseEntity con tokens JWT y contexto del turno
     */
    @PostMapping("/validate")
    public ResponseEntity<Object> validateDeepLink(@RequestBody DeepLinkValidationDTO request) {
        try {
            if (request.getToken() == null || request.getToken().trim().isEmpty()) {
                return Response.error(null, "Token no proporcionado");
            }

            DeepLinkResponseDTO responseData = deepLinkService.validarDeepLinkToken(request.getToken());
            return Response.ok(responseData, "Acceso autorizado exitosamente");
            
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al procesar el token de acceso: " + e.getMessage());
        }
    }

    /**
     * Endpoint de mantenimiento para limpiar tokens antiguos
     * Solo debe ser accesible por administradores o tareas programadas
     * 
     * POST /deep-links/cleanup
     */
    @PostMapping("/cleanup")
    public ResponseEntity<Object> cleanupTokens() {
        try {
            deepLinkService.limpiarTokensAntiguos();
            return Response.ok(null, "Tokens antiguos eliminados exitosamente");
        } catch (Exception e) {
            return Response.error(null, "Error al limpiar tokens: " + e.getMessage());
        }
    }
}
