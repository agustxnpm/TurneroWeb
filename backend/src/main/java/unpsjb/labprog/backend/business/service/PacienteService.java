package unpsjb.labprog.backend.business.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import unpsjb.labprog.backend.business.repository.PacienteRepository;
import unpsjb.labprog.backend.business.repository.PreferenciaHorariaRepository;
import unpsjb.labprog.backend.dto.ObraSocialDTO;
import unpsjb.labprog.backend.dto.PacienteDTO;
import unpsjb.labprog.backend.model.AuditLog;
import unpsjb.labprog.backend.model.ObraSocial;
import unpsjb.labprog.backend.model.Paciente;
import unpsjb.labprog.backend.model.PreferenciaHoraria;
import unpsjb.labprog.backend.model.User;

@Service
public class PacienteService {

    @Autowired
    private PacienteRepository repository;

    @Autowired
    private PreferenciaHorariaRepository preferenciaHorariaRepository;

    private static final Logger logger = LoggerFactory.getLogger(PacienteService.class);

    @Autowired
    private RegistrationService registrationService;



    @Autowired
    private EmailService emailService;

    @Autowired
    private UserService userService;

    @Autowired
    private AuditLogService auditLogService;

    public List<PacienteDTO> findAll() {
        return repository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public Optional<PacienteDTO> findById(Integer id) {
        return repository.findById(id).map(this::toDTO);
    }

    public Optional<PacienteDTO> findByDni(Integer dni) {
        return repository.findByDni(Long.valueOf(dni)).map(this::toDTO);
    }

    public Optional<PacienteDTO> findByEmail(String email) {
        return repository.findByEmail(email).map(this::toDTO);
    }

    @Transactional
    public PacienteDTO saveOrUpdate(PacienteDTO dto, String performedBy) {
        Paciente paciente = toEntity(dto);
        // validarPaciente(paciente);

        // Para testing: si no hay usuario autenticado, usar valor por defecto
        if (performedBy == null) {
            performedBy = "SYSTEM_TEST";
        }

        // Validaciones para evitar duplicados
        if (paciente.getId() == null || paciente.getId() == 0) {
            // CREACIÓN
            if (repository.existsByDni(paciente.getDni())) {
                throw new IllegalStateException("Ya existe un paciente con el DNI: " + paciente.getDni());
            }

            // Si es creado por ADMIN/OPERADOR (tiene performedBy), crear también el User
            if (dto.getPerformedBy() != null && !dto.getPerformedBy().trim().isEmpty()) {
                // Generar contraseña automática
                String password = dto.getPassword();
                if (password == null || password.trim().isEmpty()) {
                    password = generarPasswordAutomatica();
                }

                // 1. Crear usuario en la tabla User con auditoría
                registrationService.registrarPacienteWithAudit(
                        paciente.getEmail(),
                        password,
                        paciente.getDni(),
                        paciente.getNombre(),
                        paciente.getApellido(),
                        paciente.getTelefono(),
                        dto.getPerformedBy());

                // 2. Crear entidad paciente

                // Obtener obra social si se especifica
                if (dto.getObraSocialId() != null) {
                    //TODO 
                }
                
                Paciente pacienteCreado = repository.save(paciente);

                // 3. Enviar contraseña por mail
                enviarPasswordPorMail(paciente.getEmail(), password);

                return toDTO(pacienteCreado);
            } else {
                // Creación simple (solo entidad Paciente) - asume que el User ya existe
                // Esto ocurre cuando se llama desde AuthController después de crear el User
                
                // Verificar que no exista ya un paciente con este email
                if (repository.existsByEmail(paciente.getEmail())) {
                    throw new IllegalStateException("Ya existe un paciente con el email: " + paciente.getEmail());
                }
                
                // Obtener obra social si se especifica
                if (dto.getObraSocialId() != null) {
                    //TODO 
                }
                
                Paciente pacienteCreado = repository.save(paciente);
                return toDTO(pacienteCreado);
            }

        } else {
            // MODIFICACIÓN
            Paciente existente = repository.findById(paciente.getId()).orElse(null);
            if (existente == null) {
                throw new IllegalStateException("No existe el paciente que se intenta modificar.");
            }

            if (!existente.getDni().equals(paciente.getDni()) &&
                    repository.existsByDni(paciente.getDni())) {
                throw new IllegalStateException("Ya existe un paciente con el DNI: " + paciente.getDni());
            }
            if (!existente.getEmail().equals(paciente.getEmail()) &&
                    repository.existsByEmail(paciente.getEmail())) {
                throw new IllegalStateException("Ya existe un paciente con el email: " + paciente.getEmail());
            }
            // No manejamos contraseña en la entidad paciente, solo en User
            
            // Actualizar también el User correspondiente si existe
            Optional<User> userOpt = userService.findByEmail(existente.getEmail());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                // Actualizar los datos personales del usuario
                user.setNombre(paciente.getNombre());
                user.setApellido(paciente.getApellido());
                user.setEmail(paciente.getEmail());
                user.setTelefono(paciente.getTelefono());
                user.setDni(paciente.getDni());
                
                // Guardar el usuario actualizado
                userService.save(user);
            }
        }

        Paciente saved = repository.save(paciente);

        // 🎯 AUDITORÍA
        if (paciente.getId() == null) {
            auditLogService.logGenericAction(AuditLog.EntityTypes.PACIENTE, saved.getId().longValue(),
                                           AuditLog.Actions.CREATE, performedBy, null, "ACTIVO",
                                           null, saved, "Paciente creado");
        } else {
            auditLogService.logGenericAction(AuditLog.EntityTypes.PACIENTE, saved.getId().longValue(),
                                           AuditLog.Actions.UPDATE, performedBy, null, null,
                                           null, saved, "Paciente actualizado");
        }

        return toDTO(saved);
    }

    /**
     * Genera una contraseña automática segura para el paciente
     */
    private String generarPasswordAutomatica() {
        return java.util.UUID.randomUUID().toString().substring(0, 10);
    }

    /**
     * Envía la contraseña inicial por correo electrónico al paciente
     */
    private void enviarPasswordPorMail(String email, String password) {
        try {
            // Obtener el nombre del paciente desde el email o usar un nombre genérico
            String userName = email.split("@")[0];
            emailService.sendInitialCredentialsEmail(email, userName, password);
            logger.info("Credenciales iniciales enviadas por correo a paciente: {}", email);
        } catch (Exception e) {
            logger.error("Error al enviar credenciales iniciales por correo a paciente {}: {}", email, e.getMessage());
        }
    }

    public Page<PacienteDTO> findByPage(int page, int size) {
        return repository.findAll(PageRequest.of(page, size))
                .map(this::toDTO);
    }

    /**
     * Búsqueda paginada avanzada con filtros y ordenamiento
     * @param page Número de página (0-based)
     * @param size Tamaño de página
     * @param nombreApellido Filtro unificado para nombre O apellido (opcional)
     * @param documento Filtro por DNI (opcional)
     * @param email Filtro por email (opcional)
     * @param sortBy Campo para ordenar (opcional)
     * @param sortDir Dirección del ordenamiento (asc/desc, opcional)
     * @return Page<PacienteDTO> con los resultados paginados
     */
    public Page<PacienteDTO> findByPage(
            int page,
            int size,
            String nombreApellido,
            String documento,
            String email,
            String sortBy,
            String sortDir) {

        // Configurar ordenamiento
        Sort sort = Sort.unsorted();
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
            sort = Sort.by(direction, sortBy);
        }

        Pageable pageable = PageRequest.of(page, size, sort);

        // Ejecutar consulta con filtros
        Page<Paciente> result = repository.findByFiltros(
            nombreApellido, documento, email, pageable);

        // Mapear a DTO
        return result.map(this::toDTO);
    }

    @Transactional
    public void delete(Integer id, String performedBy) {
        Paciente paciente = repository.findById(id).orElse(null);
        if (paciente == null) {
            throw new IllegalStateException("No existe un paciente con el ID: " + id);
        }

        // Para testing: si no hay usuario autenticado, usar valor por defecto
        if (performedBy == null) {
            performedBy = "SYSTEM_TEST";
        }

        // 🎯 AUDITORÍA
        auditLogService.logGenericAction(AuditLog.EntityTypes.PACIENTE, id.longValue(),
                                       AuditLog.Actions.DELETE, performedBy, "ACTIVO", "ELIMINADO",
                                       paciente, null, "Paciente eliminado");

        repository.deleteById(id);
    }

    /**
     * Completa el perfil de un usuario que se registró con Google
     * @param userEmail email del usuario autenticado
     * @param dto datos para completar el perfil
     * @throws IllegalStateException si el paciente no existe o el DNI ya está en uso
     */
    @Transactional
    public void completeGoogleUserProfile(String userEmail, unpsjb.labprog.backend.dto.CompleteProfileDTO dto) {
        // Buscar el paciente por email
        Paciente paciente = repository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalStateException("No se encontró el paciente con email: " + userEmail));
        
        // Validar que el DNI no esté en uso por otro paciente
        if (dto.getDni() != null) {
            Optional<Paciente> existingByDni = repository.findByDni(dto.getDni());
            if (existingByDni.isPresent() && !existingByDni.get().getId().equals(paciente.getId())) {
                throw new IllegalStateException("Ya existe un paciente con el DNI: " + dto.getDni());
            }
            paciente.setDni(dto.getDni());
        }
        
        // Actualizar datos
        if (dto.getTelefono() != null && !dto.getTelefono().trim().isEmpty()) {
            paciente.setTelefono(dto.getTelefono());
        }
        
        if (dto.getFechaNacimiento() != null) {
            paciente.setFechaNacimiento(dto.getFechaNacimiento());
        }
        
        // Obra social es opcional
        if (dto.getObraSocialId() != null) {
            // TODO: Buscar y asignar obra social si existe
            // ObraSocial obraSocial = obraSocialRepository.findById(dto.getObraSocialId()).orElse(null);
            // paciente.setObraSocial(obraSocial);
        }
        
        // Marcar perfil como completado
        paciente.setProfileCompleted(true);
        
        // Guardar cambios
        repository.save(paciente);
        
        // Actualizar también los datos en la tabla User
        Optional<User> userOpt = userService.findByEmail(userEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (dto.getDni() != null) {
                user.setDni(dto.getDni());
            }
            if (dto.getTelefono() != null && !dto.getTelefono().trim().isEmpty()) {
                user.setTelefono(dto.getTelefono());
            }
            userService.save(user);
        }
        
        logger.info("✅ Perfil completado para usuario: {}", userEmail);
    }

    private PacienteDTO toDTO(Paciente paciente) {
        PacienteDTO dto = new PacienteDTO();
        dto.setId(paciente.getId());
        dto.setNombre(paciente.getNombre());
        dto.setApellido(paciente.getApellido());
        dto.setDni(paciente.getDni());
        dto.setFechaNacimiento(paciente.getFechaNacimiento());
        dto.setEmail(paciente.getEmail());
        dto.setTelefono(paciente.getTelefono());
        dto.setProfileCompleted(paciente.isProfileCompleted());

        // Mapear la relación con ObraSocial
        if (paciente.getObraSocial() != null) {
            ObraSocialDTO obraSocialDTO = new ObraSocialDTO();
            obraSocialDTO.setId(paciente.getObraSocial().getId());
            obraSocialDTO.setNombre(paciente.getObraSocial().getNombre());
            obraSocialDTO.setCodigo(paciente.getObraSocial().getCodigo());
            obraSocialDTO.setDescripcion(paciente.getObraSocial().getDescripcion());
            dto.setObraSocial(obraSocialDTO);
        }
        return dto;
    }

    private Paciente toEntity(PacienteDTO dto) {
        Paciente paciente = new Paciente();
        paciente.setId(dto.getId());
        paciente.setNombre(dto.getNombre());
        paciente.setApellido(dto.getApellido());
        paciente.setDni(dto.getDni());
        paciente.setFechaNacimiento(dto.getFechaNacimiento());
        paciente.setEmail(dto.getEmail());
        paciente.setTelefono(dto.getTelefono());
        paciente.setProfileCompleted(dto.isProfileCompleted());

        if (dto.getObraSocial() != null) {
            ObraSocial obraSocial = new ObraSocial();
            obraSocial.setId(Integer.valueOf(dto.getObraSocial().getId()));
            obraSocial.setNombre(dto.getObraSocial().getNombre());
            obraSocial.setCodigo(dto.getObraSocial().getCodigo());
            obraSocial.setDescripcion(dto.getObraSocial().getDescripcion());
            paciente.setObraSocial(obraSocial);
        }
        return paciente;
    }

    /**
     * Sincronización automática de usuarios multi-rol en tabla pacientes.
     * 
     * Este método garantiza que todo usuario con rol MEDICO, OPERADOR o ADMINISTRADOR
     * tenga un registro correspondiente en la tabla pacientes, permitiendo que
     * puedan operar en el dashboard de pacientes y sacar turnos.
     * 
     * IMPORTANTE: 
     * - Es idempotente: puede llamarse múltiples veces sin crear duplicados
     * - Excluye usuarios con rol PACIENTE puro (ya deben estar creados)
     * - Utiliza DNI como identificador único primario, email como secundario
     * 
     * @param user Usuario autenticado que requiere sincronización
     * @return PacienteDTO con el ID del paciente (existente o creado)
     * @throws IllegalArgumentException si el usuario es null o no tiene datos básicos
     */
    @Transactional
    public PacienteDTO ensurePacienteExistsForUser(User user) {
        // Validaciones de entrada
        if (user == null) {
            throw new IllegalArgumentException("Usuario no puede ser null");
        }
        
        if (user.getRole() == null) {
            throw new IllegalArgumentException("Usuario debe tener un rol asignado");
        }

        logger.info("🔄 Iniciando sincronización de paciente para usuario: {} (rol: {})", 
                    user.getEmail(), user.getRole());

        // REGLA 1: Usuarios con rol PACIENTE puro no deben sincronizarse aquí
        // ya que su registro debe haberse creado al momento del alta de paciente
        if (user.getRole() == unpsjb.labprog.backend.model.Role.PACIENTE) {
            logger.debug("⏭️  Usuario con rol PACIENTE puro - se espera registro existente");
            // Buscar el paciente existente
            Optional<Paciente> existingPaciente = repository.findByEmail(user.getEmail());
            if (existingPaciente.isEmpty()) {
                logger.warn("⚠️  Usuario PACIENTE sin registro en tabla pacientes - posible inconsistencia de datos");
                // En este caso excepcional, crear el paciente
                return createPacienteFromUser(user, "SYSTEM_SYNC");
            }
            return toDTO(existingPaciente.get());
        }

        // REGLA 2: Buscar paciente existente por DNI (identificador más confiable)
        Optional<Paciente> pacienteByDni = Optional.empty();
        if (user.getDni() != null) {
            pacienteByDni = repository.findByDni(user.getDni());
            if (pacienteByDni.isPresent()) {
                logger.info("✅ Paciente encontrado por DNI: {}", user.getDni());
                return toDTO(pacienteByDni.get());
            }
        }

        // REGLA 3: Buscar paciente existente por email (fallback)
        Optional<Paciente> pacienteByEmail = repository.findByEmail(user.getEmail());
        if (pacienteByEmail.isPresent()) {
            logger.info("✅ Paciente encontrado por email: {}", user.getEmail());
            return toDTO(pacienteByEmail.get());
        }

        // REGLA 4: No existe paciente - crear uno nuevo para el usuario multi-rol
        logger.info("🆕 Creando nuevo registro de paciente para usuario multi-rol: {}", user.getEmail());
        return createPacienteFromUser(user, "SYSTEM_SYNC");
    }

    /**
     * Crea un nuevo registro de paciente a partir de los datos de un usuario.
     * Método privado auxiliar para ensurePacienteExistsForUser.
     * 
     * @param user Usuario origen de los datos
     * @param performedBy Usuario que ejecuta la acción (para auditoría)
     * @return PacienteDTO del paciente creado
     */
    private PacienteDTO createPacienteFromUser(User user, String performedBy) {
        Paciente nuevoPaciente = new Paciente();
        nuevoPaciente.setNombre(user.getNombre());
        nuevoPaciente.setApellido(user.getApellido());
        nuevoPaciente.setDni(user.getDni());
        nuevoPaciente.setEmail(user.getEmail());
        nuevoPaciente.setTelefono(user.getTelefono());
        // fechaNacimiento y obraSocial quedan null - pueden completarse después

        Paciente savedPaciente = repository.save(nuevoPaciente);

        // 🎯 AUDITORÍA
        auditLogService.logGenericAction(
            AuditLog.EntityTypes.PACIENTE,
            savedPaciente.getId().longValue(),
            AuditLog.Actions.CREATE,
            performedBy,
            null,
            "SINCRONIZADO",
            null,
            savedPaciente,
            "Paciente creado automáticamente por sincronización multi-rol desde usuario: " + user.getEmail()
        );

        logger.info("✅ Paciente creado exitosamente - ID: {}, Email: {}", 
                    savedPaciente.getId(), savedPaciente.getEmail());

        return toDTO(savedPaciente);
    }


    // ==================== MÉTODOS PARA GESTIÓN DE PREFERENCIAS HORARIAS ====================

    /**
     * Busca un Paciente por el User autenticado
     * Método auxiliar para operaciones de preferencias horarias
     * 
     * @param user Usuario autenticado de Spring Security
     * @return Paciente asociado al usuario, o null si no existe
     */
    @Transactional(readOnly = true)
    public Paciente findByUser(User user) {
        if (user == null) {
            return null;
        }
        
        // Buscar paciente por email ya que no hay relación directa User->Paciente
        Optional<Paciente> pacienteOpt = repository.findByUserEmail(user.getEmail());
        
        if (pacienteOpt.isPresent()) {
            logger.debug("✅ Paciente encontrado para usuario: {} (ID: {})", 
                        user.getEmail(), pacienteOpt.get().getId());
        } else {
            logger.warn("⚠️ No se encontró paciente para usuario: {}", user.getEmail());
        }
        
        return pacienteOpt.orElse(null);
    }

    /**
     * Obtiene todas las preferencias horarias del paciente asociado al usuario autenticado
     * 
     * @param user Usuario autenticado
     * @return Set de PreferenciaHoraria del paciente
     * @throws IllegalStateException si no se encuentra el paciente para el usuario
     */
    @Transactional(readOnly = true)
    public Set<PreferenciaHoraria> getPreferenciasByUser(User user) {
        // Usar el método findByUser para obtener el paciente
        Paciente paciente = findByUser(user);
        
        if (paciente == null) {
            throw new IllegalStateException(
                "No se encontró un paciente asociado al usuario: " + user.getEmail());
        }
        
        logger.info("📅 Obteniendo preferencias horarias para paciente ID: {} ({})", 
                    paciente.getId(), paciente.getEmail());
        
        return paciente.getPreferenciasHorarias();
    }

    /**
     * Añade una nueva preferencia horaria al paciente asociado al usuario autenticado
     * 
     * @param user Usuario autenticado
     * @param preferencia Preferencia a crear (sin ID)
     * @return Optional con la PreferenciaHoraria guardada (con ID generado), o Optional.empty() si el paciente no existe
     */
    @Transactional
    public Optional<PreferenciaHoraria> addPreferencia(User user, PreferenciaHoraria preferencia) {
        // Buscar paciente usando el método findByUser
        Paciente paciente = findByUser(user);
        
        if (paciente == null) {
            logger.warn("⚠️ No se puede agregar preferencia - paciente no encontrado para usuario: {}", 
                       user != null ? user.getEmail() : "null");
            return Optional.empty();
        }
        
        // Validar datos de la preferencia
        if (preferencia.getDiaDeLaSemana() == null) {
            throw new IllegalArgumentException("El día de la semana es obligatorio");
        }
        if (preferencia.getHoraDesde() == null) {
            throw new IllegalArgumentException("La hora desde es obligatoria");
        }
        if (preferencia.getHoraHasta() == null) {
            throw new IllegalArgumentException("La hora hasta es obligatoria");
        }
        if (preferencia.getHoraDesde().isAfter(preferencia.getHoraHasta()) ||
            preferencia.getHoraDesde().equals(preferencia.getHoraHasta())) {
            throw new IllegalArgumentException(
                "La hora desde debe ser anterior a la hora hasta");
        }
        
        // Establecer relación bidireccional
        preferencia.setPaciente(paciente);
        paciente.getPreferenciasHorarias().add(preferencia);
        
        // Guardar el paciente (cascade guardará la preferencia)
        Paciente pacienteGuardado = repository.save(paciente);
        
        // Obtener la preferencia guardada (ahora con ID)
        PreferenciaHoraria preferenciaGuardada = pacienteGuardado.getPreferenciasHorarias()
                .stream()
                .filter(p -> p.getDiaDeLaSemana().equals(preferencia.getDiaDeLaSemana()) &&
                            p.getHoraDesde().equals(preferencia.getHoraDesde()) &&
                            p.getHoraHasta().equals(preferencia.getHoraHasta()))
                .findFirst()
                .orElse(null);
        
        logger.info("✅ Preferencia horaria creada - Paciente: {} ({})", 
                    paciente.getId(), paciente.getEmail());
        
        return Optional.ofNullable(preferenciaGuardada);
    }

    /**
     * Elimina una preferencia horaria del paciente asociado al usuario autenticado
     * Verifica que la preferencia pertenezca al paciente antes de eliminarla
     * 
     * @param user Usuario autenticado
     * @param preferenciaId ID de la preferencia a eliminar
     * @return true si la preferencia fue encontrada y eliminada, false si el paciente no existe o la preferencia no le pertenece
     */
    @Transactional
    public boolean deletePreferencia(User user, Long preferenciaId) {
        // Buscar paciente usando el método findByUser
        Paciente paciente = findByUser(user);
        
        if (paciente == null) {
            logger.warn("⚠️ No se puede eliminar preferencia - paciente no encontrado para usuario: {}", 
                       user != null ? user.getEmail() : "null");
            return false;
        }
        
        // Obtener el Set de preferencias del paciente
        Set<PreferenciaHoraria> preferencias = paciente.getPreferenciasHorarias();
        
        // Usar removeIf para eliminar la preferencia por ID
        boolean removed = preferencias.removeIf(p -> p.getId() == preferenciaId.longValue());
        
        if (removed) {
            // Guardar el paciente para persistir la eliminación (orphanRemoval=true se encarga del resto)
            repository.save(paciente);
            
            logger.info("🗑️ Preferencia horaria eliminada - ID: {}, Paciente: {} ({})", 
                        preferenciaId, 
                        paciente.getId(), 
                        paciente.getEmail());
        } else {
            logger.warn("⚠️ Preferencia ID {} no encontrada para paciente {} ({})", 
                       preferenciaId, paciente.getId(), paciente.getEmail());
        }
        
        return removed;
    }

}
