package unpsjb.labprog.backend.business.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import unpsjb.labprog.backend.model.User;

/**
 * Repositorio para la entidad User.
 * Proporciona operaciones CRUD y consultas específicas para usuarios.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * Busca un usuario por email
     * @param email email del usuario
     * @return Optional<User> usuario encontrado o vacío
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Busca un usuario por DNI
     * @param dni DNI del usuario
     * @return Optional<User> usuario encontrado o vacío
     */
    Optional<User> findByDni(Long dni);
    
    /**
     * Verifica si existe un usuario con el email dado
     * @param email email a verificar
     * @return true si existe, false en caso contrario
     */
    boolean existsByEmail(String email);
    
    /**
     * Verifica si existe un usuario con el DNI dado
     * @param dni DNI a verificar
     * @return true si existe, false en caso contrario
     */
    boolean existsByDni(Long dni);
    
    /**
     * Busca usuarios activos (habilitados)
     * @param enabled estado de habilitación
     * @return lista de usuarios activos
     */
    java.util.List<User> findByEnabled(Boolean enabled);
    
    /**
     * Busca usuarios por nombre y apellido (case insensitive)
     * @param nombre nombre del usuario
     * @param apellido apellido del usuario
     * @return lista de usuarios que coinciden
     */
    java.util.List<User> findByNombreContainingIgnoreCaseAndApellidoContainingIgnoreCase(String nombre, String apellido);
    
    /**
     * Cuenta usuarios por rol
     * @param role rol a contar
     * @return número de usuarios con ese rol
     */
    long countByRole(unpsjb.labprog.backend.model.Role role);

    /**
     * Busca usuarios por rol específico
     * @param role rol a buscar
     * @return lista de usuarios con el rol especificado
     */
    java.util.List<User> findByRole(unpsjb.labprog.backend.model.Role role);

    /**
     * Cuenta usuarios por rol y estado de habilitación
     * @param role rol a contar
     * @param enabled estado de habilitación
     * @return número de usuarios que cumplen ambas condiciones
     */
    long countByRoleAndEnabled(unpsjb.labprog.backend.model.Role role, boolean enabled);
}
