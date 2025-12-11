package unpsjb.labprog.backend.model;

import java.util.HashSet;
import java.util.Set;

/**
 * Enum para representar la jerarquía de roles del sistema
 * Cada rol incluye los permisos de los roles que hereda
 * 
 * MULTI-TENENCIA:
 * - SUPERADMIN: Acceso global a todos los centros de atención (centro_atencion_id puede ser NULL)
 * - ADMINISTRADOR: Acceso limitado a su centro de atención (centro_atencion_id OBLIGATORIO)
 * - MEDICO/OPERADOR: Acceso limitado a su centro de atención (centro_atencion_id OBLIGATORIO)
 * - PACIENTE: Lectura cross-tenant permitida (centro_atencion_id puede ser NULL)
 */
public enum Role {

    // Jerarquía de roles:
    // PACIENTE (base)
    // ├── MEDICO (hereda de PACIENTE)
    // ├── OPERADOR (hereda de PACIENTE)
    // ├── ADMINISTRADOR (hereda de PACIENTE, MEDICO, OPERADOR)
    // └── SUPERADMIN (hereda de ADMINISTRADOR y todos los demás roles - acceso global)

    PACIENTE(Set.of()),
    MEDICO(Set.of(PACIENTE)),
    OPERADOR(Set.of(PACIENTE)),
    ADMINISTRADOR(Set.of(PACIENTE, MEDICO, OPERADOR)),
    SUPERADMIN(Set.of(PACIENTE, MEDICO, OPERADOR, ADMINISTRADOR));

    private final Set<Role> inheritedRoles;

    Role(Set<Role> inheritedRoles) {
        this.inheritedRoles = inheritedRoles;
    }

    public Set<Role> getInheritedRoles() {
        return inheritedRoles;
    }

    /**
     * Obtiene el nombre del rol como String (para compatibilidad)
     */
    public String getName() {
        return this.name();
    }

    /**
     * Verifica si este rol incluye al rol especificado
     * (es decir, si este rol es igual al especificado o lo hereda)
     */
    public boolean includes(Role other) {
        if (this == other) {
            return true;
        }
        return inheritedRoles.contains(other);
    }

    /**
     * Obtiene todos los roles heredados por este rol (recursivamente)
     */
    public Set<Role> getAllInheritedRoles() {
        Set<Role> allRoles = new HashSet<>(inheritedRoles);
        for (Role inherited : inheritedRoles) {
            allRoles.addAll(inherited.getAllInheritedRoles());
        }
        return allRoles;
    }

    /**
     * Verifica si este rol tiene acceso al rol requerido
     * (es decir, si este rol incluye o hereda del rol requerido)
     */
    public boolean hasAccessTo(Role required) {
        return this == required || inheritedRoles.contains(required) ||
               getAllInheritedRoles().contains(required);
    }
}
