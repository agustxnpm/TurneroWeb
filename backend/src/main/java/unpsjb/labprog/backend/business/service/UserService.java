package unpsjb.labprog.backend.business.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;

import unpsjb.labprog.backend.business.repository.UserRepository;
import unpsjb.labprog.backend.model.User;
import unpsjb.labprog.backend.model.Role;
import unpsjb.labprog.backend.dto.PacienteDTO;
import unpsjb.labprog.backend.dto.RegisterSuccessResponse;
import unpsjb.labprog.backend.dto.RegisterRequest;

/**
 * Servicio para la gestión de usuarios.
 * Implementa UserDetailsService para integración con Spring Security.
 */
@Service
@Transactional
public class UserService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    @Lazy
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    @Lazy
    private PacienteService pacienteService;

    @Autowired
    @Lazy
    private RegistrationService registrationService;

    // ===============================
    // IMPLEMENTACIÓN DE UserDetailsService
    // ===============================

    /**
     * Carga un usuario por su email para autenticación con Spring Security
     * 
     * @param email email del usuario (username)
     * @return UserDetails del usuario encontrado
     * @throws UsernameNotFoundException si no se encuentra el usuario
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));
    }

    // ===============================
    // MÉTODOS CRUD
    // ===============================

    /**
     * Busca un usuario por ID
     * 
     * @param id ID del usuario
     * @return Optional<User> usuario encontrado o vacío
     */
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    /**
     * Busca un usuario por email
     * 
     * @param email email del usuario
     * @return Optional<User> usuario encontrado o vacío
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Busca un usuario por DNI
     * 
     * @param dni DNI del usuario
     * @return Optional<User> usuario encontrado o vacío
     */
    public Optional<User> findByDni(Long dni) {
        return userRepository.findByDni(dni);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public User createUser(String nombre, String apellido, Long dni, String email, String hashedPassword,
            String telefono, String roleName) {
        return createUser(nombre, apellido, dni, email, hashedPassword, telefono, roleName, false);
    }

    public User createUser(String nombre, String apellido, Long dni, String email, String hashedPassword,
            String telefono, String roleName, boolean autoVerifyEmail) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Ya existe un usuario con el email: " + email);
        }

        if (userRepository.existsByDni(dni)) {
            throw new IllegalArgumentException("Ya existe un usuario con el DNI: " + dni);
        }

        // Obtener el rol del enum
        Role role = Role.valueOf(roleName.toUpperCase());

        User user = new User();
        user.setNombre(nombre);
        user.setApellido(apellido);
        user.setDni(dni);
        user.setEmail(email);
        user.setHashedPassword(hashedPassword);
        user.setTelefono(telefono);
        user.setRole(role);

        // Auto-verificar email en entorno dev cuando se crea por admin/operador
        if (autoVerifyEmail) {
            user.activateAccount();
        }

        return userRepository.save(user);
    }

    /**
     * Actualiza la información básica de un usuario
     * 
     * @param userId   ID del usuario
     * @param nombre   nuevo nombre
     * @param apellido nuevo apellido
     * @param telefono nuevo teléfono
     * @return User usuario actualizado
     * @throws IllegalArgumentException si el usuario no existe
     */
    public User updateUserInfo(Long userId, String nombre, String apellido, String telefono) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + userId));

        user.setNombre(nombre);
        user.setApellido(apellido);
        user.setTelefono(telefono);

        return userRepository.save(user);
    }

    /**
     * Obtiene todos los usuarios
     * 
     * @return List<User> lista de todos los usuarios
     */
    public List<User> findAll() {
        return userRepository.findAll();
    }

    /**
     * Obtiene todos los usuarios activos
     * 
     * @return List<User> lista de usuarios activos
     */
    public List<User> findActiveUsers() {
        return userRepository.findByEnabled(true);
    }

    /**
     * Deshabilita un usuario
     * 
     * @param userId ID del usuario
     * @throws IllegalArgumentException si el usuario no existe
     */
    public void disableUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + userId));

        user.disable();
        userRepository.save(user);
    }

    /**
     * Habilita un usuario
     * 
     * @param userId ID del usuario
     * @throws IllegalArgumentException si el usuario no existe
     */
    public void enableUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + userId));

        user.enable();
        userRepository.save(user);
    }

    /**
     * Elimina un usuario
     * 
     * @param userId ID del usuario
     * @throws IllegalArgumentException si el usuario no existe
     */
    public void deleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("Usuario no encontrado con ID: " + userId);
        }

        userRepository.deleteById(userId);
    }

    // ===============================
    // MÉTODOS CON AUDITORÍA INTEGRADA
    // ===============================

    /**
     * Cambia el rol de un usuario con auditoría
     * 
     * @param userId      ID del usuario
     * @param newRoleName nombre del nuevo rol
     * @param performedBy email del usuario que realiza el cambio
     * @param reason      motivo del cambio
     * @return User usuario actualizado
     * @throws IllegalArgumentException si el usuario no existe o el rol es inválido
     */
    public User changeUserRole(Long userId, String newRoleName, String performedBy, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + userId));

        String previousRoleName = user.getRole().getName();

        // Verificar que el rol sea diferente
        if (previousRoleName.equals(newRoleName)) {
            throw new IllegalArgumentException("El usuario ya tiene el rol: " + newRoleName);
        }

        // Obtener el nuevo rol del enum
        Role newRole = Role.valueOf(newRoleName.toUpperCase());

        // Cambiar el rol
        user.setRole(newRole);
        User updatedUser = userRepository.save(user);

        // Registrar en auditoría
        auditLogService.logRoleChange(userId, performedBy, previousRoleName, newRoleName, reason);

        return updatedUser;
    }

    /**
     * Actualiza información de usuario con auditoría
     * 
     * @param userId      ID del usuario
     * @param nombre      nuevo nombre
     * @param apellido    nuevo apellido
     * @param telefono    nuevo teléfono
     * @param performedBy email del usuario que realiza la actualización
     * @return User usuario actualizado
     */
    public User updateUserInfoWithAudit(Long userId, String nombre, String apellido, String telefono,
            String performedBy) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + userId));

        // Capturar datos anteriores
        Map<String, Object> oldData = new HashMap<>();
        oldData.put("nombre", user.getNombre());
        oldData.put("apellido", user.getApellido());
        oldData.put("telefono", user.getTelefono());

        // Actualizar datos
        user.setNombre(nombre);
        user.setApellido(apellido);
        user.setTelefono(telefono);

        User updatedUser = userRepository.save(user);

        // Capturar datos nuevos
        Map<String, Object> newData = new HashMap<>();
        newData.put("nombre", nombre);
        newData.put("apellido", apellido);
        newData.put("telefono", telefono);

        // Registrar en auditoría
        auditLogService.logUserUpdated(userId, performedBy, oldData, newData, user.getNombre(), user.getApellido());

        return updatedUser;
    }

    /**
     * Deshabilita un usuario con auditoría
     * 
     * @param userId      ID del usuario
     * @param performedBy email del usuario que realiza la acción
     * @param reason      motivo de la deshabilitación
     */
    public void disableUserWithAudit(Long userId, String performedBy, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + userId));

        boolean wasEnabled = user.getEnabled();
        user.disable();
        userRepository.save(user);

        // Registrar en auditoría
        auditLogService.logUserStatusChange(userId, performedBy, wasEnabled, false, user.getNombre(),
                user.getApellido());
    }

    /**
     * Habilita un usuario con auditoría
     * 
     * @param userId      ID del usuario
     * @param performedBy email del usuario que realiza la acción
     * @param reason      motivo de la habilitación
     */
    public void enableUserWithAudit(Long userId, String performedBy, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + userId));

        boolean wasEnabled = user.getEnabled();
        user.enable();
        userRepository.save(user);

        // Registrar en auditoría
        auditLogService.logUserStatusChange(userId, performedBy, wasEnabled, true, user.getNombre(),
                user.getApellido());
    }

    /**
     * Crea un usuario con auditoría integrada
     * 
     * @param nombre         nombre del usuario
     * @param apellido       apellido del usuario
     * @param dni            DNI del usuario
     * @param email          email del usuario
     * @param hashedPassword contraseña hasheada
     * @param telefono       teléfono del usuario
     * @param roleName       nombre del rol
     * @param performedBy    email del usuario que crea la cuenta
     * @return User usuario creado
     */
    public User createUserWithAudit(String nombre, String apellido, Long dni, String email,
            String hashedPassword, String telefono, String roleName, String performedBy) {
        // Auto-verificar email cuando se crea por admin/operador (entorno dev)
        // NO auto-verificar para auto-registros de pacientes
        boolean autoVerifyEmail = performedBy != null &&
                !performedBy.equals("AUTO REGISTRO") &&
                !performedBy.trim().isEmpty();

        User user = createUser(nombre, apellido, dni, email, hashedPassword, telefono, roleName, autoVerifyEmail);

        // Registrar en auditoría
        auditLogService.logUserCreated(user.getId(), email, roleName, user.getNombre(), user.getApellido(),
                performedBy);

        return user;
    }

    /**
     * Guarda un usuario existente
     * 
     * @param user usuario a guardar
     * @return User usuario guardado
     */
    public User save(User user) {
        return userRepository.save(user);
    }

    /**
     * Procesa el usuario de Google (busca o crea)
     * 
     * @param payload datos del usuario de Google
     * @return User usuario existente o recién creado
     */
    /**
     * Crea un nuevo administrador
     * 
     * @param dto                  datos del nuevo administrador
     * @param performingAdminEmail email del administrador que realiza la acción
     * @return RegisterSuccessResponse con datos del admin creado
     * @throws IllegalArgumentException si hay errores de validación
     */
    @Transactional
    public RegisterSuccessResponse createAdmin(
            RegisterRequest dto, String performingAdminEmail) {
        // Validar email duplicado
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Ya existe un usuario con el email: " + dto.getEmail());
        }

        // Generar contraseña temporal
        String temporaryPassword = UUID.randomUUID().toString().substring(0, 12);
        String hashedPassword = passwordEncoder.encode(temporaryPassword);

        // Crear usuario con rol ADMINISTRADOR
        User admin = new User();
        admin.setNombre(dto.getNombre());
        admin.setApellido(dto.getApellido());
        admin.setDni(Long.parseLong(dto.getDni()));
        admin.setEmail(dto.getEmail());
        admin.setHashedPassword(hashedPassword);
        admin.setTelefono(dto.getTelefono());
        admin.setRole(Role.ADMINISTRADOR);
        admin.setEmailVerified(true); // Auto-verificar email de administradores
        admin.setEmailVerifiedAt(java.time.LocalDateTime.now());

        User savedAdmin = userRepository.save(admin);

        // Registrar en auditoría
        auditLogService.logUserCreated(
                savedAdmin.getId(),
                savedAdmin.getEmail(),
                "ADMINISTRADOR",
                savedAdmin.getNombre(),
                savedAdmin.getApellido(),
                performingAdminEmail);

        // Enviar email con credenciales
        emailService.sendAdminWelcomeEmail(savedAdmin, temporaryPassword);

        // Retornar respuesta
        RegisterSuccessResponse response = new RegisterSuccessResponse();
        response.setEmail(savedAdmin.getEmail());
        response.setFullName(savedAdmin.getNombre() + " " + savedAdmin.getApellido());
        response.setMessage("Administrador creado exitosamente");
        response.setRequiresActivation(false); // Los administradores no requieren activación

        return response;
    }

    /**
     * Actualiza un administrador existente
     * 
     * @param id                   ID del administrador
     * @param updates              mapa con los campos a actualizar
     * @param performingAdminEmail email del administrador que realiza la acción
     * @return User administrador actualizado
     */
    @Transactional
    public User updateAdmin(Integer id, Map<String, Object> updates, String performingAdminEmail) {
        User admin = userRepository.findById(Long.valueOf(id))
                .orElseThrow(() -> new IllegalArgumentException("Administrador no encontrado"));

        if (!admin.getRole().equals(Role.ADMINISTRADOR)) {
            throw new IllegalArgumentException("El usuario no es un administrador");
        }

        // Capturar datos anteriores para auditoría
        Map<String, Object> oldData = new HashMap<>();
        oldData.put("nombre", admin.getNombre());
        oldData.put("apellido", admin.getApellido());
        oldData.put("telefono", admin.getTelefono());

        // Actualizar campos permitidos
        if (updates.containsKey("nombre")) {
            admin.setNombre((String) updates.get("nombre"));
        }
        if (updates.containsKey("apellido")) {
            admin.setApellido((String) updates.get("apellido"));
        }
        if (updates.containsKey("telefono")) {
            admin.setTelefono((String) updates.get("telefono"));
        }

        User updatedAdmin = userRepository.save(admin);

        // Registrar en auditoría
        auditLogService.logUserUpdated(
                updatedAdmin.getId(),
                performingAdminEmail,
                oldData,
                updates,
                updatedAdmin.getNombre(),
                updatedAdmin.getApellido());

        return updatedAdmin;
    }

    /**
     * Deshabilita un administrador
     * 
     * @param id                   ID del administrador
     * @param performingAdminEmail email del administrador que realiza la acción
     * @return User administrador deshabilitado
     */
    @Transactional
    public User disableAdmin(Integer id, String performingAdminEmail) {
        User admin = userRepository.findById(Long.valueOf(id))
                .orElseThrow(() -> new IllegalArgumentException("Administrador no encontrado"));

        if (!admin.getRole().equals(Role.ADMINISTRADOR)) {
            throw new IllegalArgumentException("El usuario no es un administrador");
        }

        // No permitir deshabilitar al último administrador activo
        long activeAdminsCount = userRepository.countByRoleAndEnabled(Role.ADMINISTRADOR, true);
        if (activeAdminsCount <= 1 && admin.getEnabled()) {
            throw new IllegalStateException("No se puede deshabilitar al último administrador activo");
        }

        boolean wasEnabled = admin.getEnabled();
        admin.disable();
        User disabledAdmin = userRepository.save(admin);

        // Registrar en auditoría
        auditLogService.logUserStatusChange(
                disabledAdmin.getId(),
                performingAdminEmail,
                wasEnabled,
                false,
                disabledAdmin.getNombre(),
                disabledAdmin.getApellido());

        return disabledAdmin;
    }

    /**
     * Obtiene todos los usuarios con un rol específico
     * 
     * @param role rol a buscar
     * @return List<User> lista de usuarios con el rol especificado
     */
    public List<User> findByRole(Role role) {
        return userRepository.findByRole(role);
    }

    @Autowired
    @Lazy
    private EmailService emailService;

    public User processGoogleUser(GoogleIdToken.Payload payload) {
        String email = payload.getEmail();
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isPresent()) {
            // Caso 1: El usuario ya existe en la base de datos.
            System.out.println("Usuario existente encontrado para el email: " + email);
            return userOptional.get();
        } else {
            // Caso 2: El usuario no existe. Creamos un nuevo User con rol PACIENTE.
            // Copiando la lógica del método register() del AuthController
            System.out.println("Creando nuevo usuario para el email: " + email);

            String nombre = (String) payload.get("given_name");
            String apellido = (String) payload.get("family_name");

            // Generamos una contraseña aleatoria y segura, ya que el campo no puede ser
            // nulo.
            String randomPassword = UUID.randomUUID().toString();

            // Generar un DNI temporal único (basado en timestamp)
            Long dniTemporal = System.currentTimeMillis() % 99999999L;

            // Generar un teléfono temporal único
            String telefonoTemporal = "GOOGLE_" + UUID.randomUUID().toString().substring(0, 8);

            // 1. Registrar usuario para autenticación usando RegistrationService
            User newUser = registrationService.registrarPaciente(
                    email,
                    randomPassword,
                    dniTemporal,
                    nombre != null ? nombre : "Usuario",
                    apellido != null ? apellido : "Google",
                    telefonoTemporal);

            // 2. Crear la entidad Paciente usando PacienteService
            PacienteDTO pacienteDTO = new PacienteDTO();
            pacienteDTO.setNombre(nombre != null ? nombre : "Usuario");
            pacienteDTO.setApellido(apellido != null ? apellido : "Google");
            pacienteDTO.setDni(dniTemporal);
            pacienteDTO.setEmail(email);
            pacienteDTO.setTelefono(telefonoTemporal);
            pacienteDTO.setProfileCompleted(false); // Marcar perfil como incompleto
            // No asignar fecha de nacimiento ni obra social en el registro básico

            // Crear la entidad Paciente sin auditoría (auto-registro de Google)
            pacienteService.saveOrUpdate(pacienteDTO, "GOOGLE-AUTO-REGISTRO");

            // Activar el email directamente ya que Google validó el correo
            newUser.setEmailVerified(true);
            newUser.setEmailVerifiedAt(java.time.LocalDateTime.now());

            return userRepository.save(newUser);
        }
    }
}
