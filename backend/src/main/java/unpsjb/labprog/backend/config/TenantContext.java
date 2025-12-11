package unpsjb.labprog.backend.config;

import unpsjb.labprog.backend.model.User;
import unpsjb.labprog.backend.model.Role;

/**
 * Clase utilitaria simplificada para acceso al contexto de multi-tenencia.
 * Wrapper sobre AuditContext para facilitar el uso en servicios y repositorios.
 * 
 * Uso recomendado:
 * - En Services: TenantContext.getCurrentCentroId() para filtrar consultas
 * - En Repositories: Usar Specifications con TenantContext.getCurrentCentroId()
 * - En Presenters: TenantContext.validateAccess(centroId) para validar permisos
 */
public class TenantContext {
    
    /**
     * Obtiene el ID del centro de atención del usuario actual.
     * Retorna null para SUPERADMIN y PACIENTE (acceso global).
     * @return Integer centroAtencionId o null
     */
    public static Integer getCurrentCentroId() {
        return AuditContext.getCurrentCentroAtencionId();
    }
    
    /**
     * Obtiene el usuario completo del contexto de seguridad
     * @return User o null si no hay usuario autenticado
     */
    public static User getCurrentUser() {
        return AuditContext.getCurrentUserObject();
    }
    
    /**
     * Obtiene el rol del usuario actual
     * @return Role o null
     */
    public static Role getCurrentUserRole() {
        return AuditContext.getCurrentUserRole();
    }
    
    /**
     * Verifica si el usuario actual tiene acceso global (SUPERADMIN o PACIENTE)
     * @return true si puede acceder a datos de todos los centros
     */
    public static boolean hasGlobalAccess() {
        return AuditContext.hasGlobalAccess();
    }
    
    /**
     * Verifica si el usuario actual está restringido a un centro específico
     * @return true si solo puede acceder a datos de su centro
     */
    public static boolean isTenantRestricted() {
        return AuditContext.isTenantRestricted();
    }
    
    /**
     * Verifica si el usuario actual tiene acceso al centro especificado.
     * - SUPERADMIN: siempre retorna true
     * - ADMINISTRADOR/MEDICO/OPERADOR: verifica si centroId coincide con su centro
     * - PACIENTE: siempre retorna true (lectura cross-tenant)
     * 
     * @param centroId ID del centro a validar
     * @return true si el usuario tiene acceso al centro
     */
    public static boolean hasAccessToCentro(Integer centroId) {
        if (centroId == null) {
            return false;
        }
        return AuditContext.belongsToCentro(centroId);
    }
    
    /**
     * Valida que el usuario actual tenga acceso al centro especificado.
     * Lanza excepción si no tiene acceso.
     * 
     * @param centroId ID del centro a validar
     * @throws SecurityException si el usuario no tiene acceso al centro
     */
    public static void validateAccessToCentro(Integer centroId) {
        if (!hasAccessToCentro(centroId)) {
            throw new SecurityException(
                String.format("Acceso denegado al centro de atención ID: %d", centroId)
            );
        }
    }
    
    /**
     * Obtiene el centro ID para usar en consultas con filtro de tenant.
     * - Si el usuario tiene acceso global: retorna null (sin filtro)
     * - Si el usuario está restringido a un centro: retorna su centroId
     * 
     * Uso típico en repositories:
     * <pre>
     * Integer filteredCentroId = TenantContext.getFilteredCentroId();
     * if (filteredCentroId != null) {
     *     // Aplicar filtro por centro
     *     query.where(entity.centroAtencion.id.eq(filteredCentroId));
     * }
     * </pre>
     * 
     * @return Integer centroId para filtrar, o null si no debe filtrarse
     */
    public static Integer getFilteredCentroId() {
        if (hasGlobalAccess()) {
            return null; // Sin filtro para usuarios globales
        }
        return getCurrentCentroId();
    }
    
    /**
     * Verifica si el usuario actual es SUPERADMIN
     * @return true si el usuario es SUPERADMIN
     */
    public static boolean isSuperAdmin() {
        Role role = getCurrentUserRole();
        return role == Role.SUPERADMIN;
    }
    
    /**
     * Verifica si el usuario actual es ADMINISTRADOR (de centro)
     * @return true si el usuario es ADMINISTRADOR
     */
    public static boolean isAdmin() {
        Role role = getCurrentUserRole();
        return role == Role.ADMINISTRADOR;
    }
    
    /**
     * Verifica si el usuario actual es MEDICO
     * @return true si el usuario es MEDICO
     */
    public static boolean isMedico() {
        Role role = getCurrentUserRole();
        return role == Role.MEDICO;
    }
    
    /**
     * Verifica si el usuario actual es OPERADOR
     * @return true si el usuario es OPERADOR
     */
    public static boolean isOperador() {
        Role role = getCurrentUserRole();
        return role == Role.OPERADOR;
    }
    
    /**
     * Verifica si el usuario actual es PACIENTE
     * @return true si el usuario es PACIENTE
     */
    public static boolean isPaciente() {
        Role role = getCurrentUserRole();
        return role == Role.PACIENTE;
    }
}
