package unpsjb.labprog.backend.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import unpsjb.labprog.backend.model.User;
import unpsjb.labprog.backend.model.Role;

/**
 * Contexto de auditoría y multi-tenencia que obtiene automáticamente 
 * el usuario y centro de atención desde el SecurityContext de Spring Security
 */
public class AuditContext {

    private static final ThreadLocal<String> currentUser = new ThreadLocal<>();
    private static final ThreadLocal<Integer> currentCentroAtencionId = new ThreadLocal<>();

    /**
     * Obtiene el usuario actual desde el SecurityContext (JWT token)
     * Si no hay usuario autenticado o es usuario anónimo, retorna null
     */
    public static String getCurrentUser() {
        // Primero verificar si hay un usuario establecido manualmente (para casos especiales)
        String manualUser = currentUser.get();
        if (manualUser != null) {
            return manualUser;
        }

        // Obtener usuario del SecurityContext (JWT)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() &&
            !"anonymousUser".equals(authentication.getName())) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof UserDetails) {
                return ((UserDetails) principal).getUsername();
            } else if (principal instanceof String) {
                return (String) principal;
            }
        }

        return null;
    }

    // ===============================
    // MÉTODOS DE MULTI-TENENCIA
    // ===============================

    /**
     * Obtiene el ID del centro de atención del usuario actual (MULTI-TENENCIA)
     * Retorna null para usuarios con acceso global (SUPERADMIN, PACIENTE)
     * @return Integer centroAtencionId o null
     */
    public static Integer getCurrentCentroAtencionId() {
        // Primero verificar si hay un centro establecido manualmente
        Integer manualCentro = currentCentroAtencionId.get();
        if (manualCentro != null) {
            return manualCentro;
        }

        // Obtener del usuario autenticado en SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() &&
            !"anonymousUser".equals(authentication.getName())) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) {
                User user = (User) principal;
                if (user.getCentroAtencion() != null) {
                    return user.getCentroAtencion().getId();
                }
            }
        }

        return null;
    }

    /**
     * Obtiene el objeto User completo del contexto de seguridad
     * @return User o null si no hay usuario autenticado
     */
    public static User getCurrentUserObject() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() &&
            !"anonymousUser".equals(authentication.getName())) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) {
                return (User) principal;
            }
        }
        return null;
    }

    /**
     * Verifica si el usuario actual tiene acceso global (SUPERADMIN o PACIENTE)
     * @return true si el usuario puede acceder a datos de todos los centros
     */
    public static boolean hasGlobalAccess() {
        User user = getCurrentUserObject();
        return user != null && user.tieneAccesoGlobal();
    }

    /**
     * Verifica si el usuario actual está limitado a un centro específico
     * @return true si el usuario solo puede acceder a datos de su centro
     */
    public static boolean isTenantRestricted() {
        User user = getCurrentUserObject();
        return user != null && user.estáLimitadoACentro();
    }

    /**
     * Verifica si el usuario actual pertenece al centro especificado
     * @param centroId ID del centro a verificar
     * @return true si el usuario pertenece al centro o tiene acceso global
     */
    public static boolean belongsToCentro(Integer centroId) {
        User user = getCurrentUserObject();
        return user != null && user.perteneceACentro(centroId);
    }

    /**
     * Obtiene el rol del usuario actual
     * @return Role o null si no hay usuario autenticado
     */
    public static Role getCurrentUserRole() {
        User user = getCurrentUserObject();
        return user != null ? user.getRole() : null;
    }

    // ===============================
    // MÉTODOS DE ESTABLECIMIENTO MANUAL
    // ===============================

    /**
     * Establece manualmente el usuario actual (para casos especiales donde no hay JWT)
     * Útil para operaciones en background o testing
     */
    public static void setCurrentUser(String user) {
        currentUser.set(user);
    }

    /**
     * Establece manualmente el centro de atención actual (para casos especiales)
     * Útil para operaciones en background o testing
     */
    public static void setCurrentCentroAtencionId(Integer centroId) {
        currentCentroAtencionId.set(centroId);
    }

    /**
     * Limpia el usuario y centro establecidos manualmente
     */
    public static void clear() {
        currentUser.remove();
        currentCentroAtencionId.remove();
    }
}
