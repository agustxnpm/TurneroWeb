package unpsjb.labprog.backend.business.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import unpsjb.labprog.backend.business.repository.CentroAtencionRepository;
import unpsjb.labprog.backend.business.repository.ConsultorioRepository;
import unpsjb.labprog.backend.dto.ConsultorioDTO;
import unpsjb.labprog.backend.model.CentroAtencion;
import unpsjb.labprog.backend.model.Consultorio;
import unpsjb.labprog.backend.config.TenantContext;

@Service
public class ConsultorioService {

    @Autowired
    private ConsultorioRepository repository;

    @Autowired
    private CentroAtencionRepository centroRepo;

    @Autowired
    private AuditLogService auditLogService;

    /**
     * Obtiene todos los consultorios con filtrado automático multi-tenencia.
     * - SUPERADMIN: Ve todos los consultorios globalmente
     * - ADMINISTRADOR/OPERADOR/MEDICO: Solo consultorios de su centro
     * - PACIENTE: Ve todos los consultorios (acceso global)
     */
    public List<ConsultorioDTO> findAll() {
        Integer centroId = TenantContext.getFilteredCentroId();
        
        if (centroId != null) {
            // Usuario limitado por centro - filtrar por consultorios del centro
            return repository.findByCentroAtencionId(centroId).stream()
                    .map(this::toDTO)
                    .toList();
        } else {
            // SUPERADMIN o PACIENTE - acceso global
            return repository.findAll().stream()
                    .map(this::toDTO)
                    .toList();
        }
    }

    /**
     * Obtiene página de consultorios con filtrado automático multi-tenencia.
     * - SUPERADMIN: Ve todos los consultorios globalmente
     * - ADMINISTRADOR/OPERADOR/MEDICO: Solo consultorios de su centro
     * - PACIENTE: Ve todos los consultorios (acceso global)
     */
    public Page<ConsultorioDTO> findByPage(int page, int size) {
        Integer centroId = TenantContext.getFilteredCentroId();
        
        PageRequest pageRequest = PageRequest.of(page, size);
        
        if (centroId != null) {
            // Usuario limitado por centro - filtrar por consultorios del centro
            // Nota: ConsultorioRepository no tiene método Page con centroId, usar findAll filtrado
            List<Consultorio> consultorios = repository.findByCentroAtencionId(centroId);
            // Convertir a Page manualmente
            int start = (int) pageRequest.getOffset();
            int end = Math.min((start + pageRequest.getPageSize()), consultorios.size());
            return new org.springframework.data.domain.PageImpl<>(
                consultorios.subList(start, end).stream()
                    .map(this::toDTO)
                    .toList(),
                pageRequest,
                consultorios.size()
            );
        } else {
            // SUPERADMIN o PACIENTE - acceso global
            return repository.findAll(pageRequest)
                    .map(this::toDTO);
        }
    }

    public Optional<ConsultorioDTO> findById(Integer id) {
        return repository.findById(id).map(this::toDTO);
    }

    @Transactional
    public void delete(Integer id, String performedBy, String reason) {
        Consultorio consultorio = repository.findById(id)
                .orElseThrow(() -> new IllegalStateException("Consultorio no encontrado"));
        
        // Para testing: si no hay usuario autenticado, usar valor por defecto
        if (performedBy == null) {
            performedBy = "SYSTEM_TEST";
        }
        
        // Auditar eliminación antes de borrar
        auditLogService.logConsultorioDeleted(id.longValue(), performedBy, 
                                           reason != null ? reason : "Eliminación de consultorio");
        
        repository.deleteById(id);
    }

    private ConsultorioDTO toDTO(Consultorio c) {
        ConsultorioDTO dto = new ConsultorioDTO();
        dto.setId(c.getId());
        dto.setNumero(c.getNumero());
        dto.setNombre(c.getNombre());
        
        if (c.getCentroAtencion() != null) {
            dto.setCentroId(c.getCentroAtencion().getId());
            dto.setNombreCentro(c.getCentroAtencion().getNombre());
        }
        
        // Convertir horarios semanales
        if (c.getHorariosSemanales() != null) {
            dto.setHorariosSemanales(c.getHorariosSemanales().stream()
                .map(horario -> new ConsultorioDTO.HorarioConsultorioDTO(
                    horario.getDiaSemana(),
                    horario.getHoraApertura(),
                    horario.getHoraCierre(),
                    horario.getActivo()
                ))
                .collect(Collectors.toList()));
        }
        
        return dto;
    }

    private Consultorio toEntity(ConsultorioDTO dto) {
        Consultorio consultorio = new Consultorio();
        consultorio.setId(dto.getId());
        consultorio.setNumero(dto.getNumero());
        consultorio.setNombre(dto.getNombre());
        
        if (dto.getCentroId() != null) {
            CentroAtencion centro = new CentroAtencion();
            centro.setId(dto.getCentroId());
            consultorio.setCentroAtencion(centro);
        }
        
        // Convertir horarios semanales
        if (dto.getHorariosSemanales() != null) {
            consultorio.setHorariosSemanales(dto.getHorariosSemanales().stream()
                .map(horarioDTO -> new Consultorio.HorarioConsultorio(
                    horarioDTO.getDiaSemana(),
                    horarioDTO.getHoraApertura(),
                    horarioDTO.getHoraCierre(),
                    horarioDTO.getActivo()
                ))
                .collect(Collectors.toList()));
        }
        
        return consultorio;
    }

    public List<Consultorio> findByCentroAtencion(String centroNombre) {
        CentroAtencion centro = centroRepo.findByNombre(centroNombre);
        if (centro == null) {
            throw new IllegalStateException("Centro no encontrado");
        }
        return repository.findByCentroAtencion(centro);
    }

    public List<ConsultorioDTO> findByCentroAtencionId(Integer centroId) {
        return repository.findByCentroAtencionId(centroId)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public Consultorio saveByCentroNombre(Consultorio consultorio, String centroNombre) {
        CentroAtencion centro = centroRepo.findByNombre(centroNombre);
        if (centro == null) {
            throw new IllegalStateException("Centro de Atención no encontrado");
        }
        if (repository.existsByNumeroAndCentroAtencion(consultorio.getNumero(), centro)) {
            throw new IllegalStateException("El número de consultorio ya está en uso");
        }
        consultorio.setCentroAtencion(centro);
        return repository.save(consultorio);
    }

    @RequestMapping(value = "/{centroNombre}/listar", method = RequestMethod.GET)
    public ResponseEntity<Object> listarPorCentro(@PathVariable("centroNombre") String centroNombre) {
        try {
            List<Consultorio> consultorios = findByCentroAtencion(centroNombre);
            var data = consultorios.stream()
                    .map(c -> Map.of("numero", c.getNumero(), "nombre_consultorio", c.getNombre()))
                    .toList();
            return ResponseEntity.ok(Map.of("status_code", 200, "data", data));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("status_code", 500, "error", e.getMessage()));
        }
    }

    @Transactional
    public ConsultorioDTO saveOrUpdate(ConsultorioDTO dto, String performedBy) {
        Consultorio consultorio = toEntity(dto);

        // Para testing: si no hay usuario autenticado, usar valor por defecto
        if (performedBy == null) {
            performedBy = "SYSTEM_TEST";
        }

        // Validar datos
        validateConsultorio(consultorio);

        CentroAtencion centro = centroRepo.findById(consultorio.getCentroAtencion().getId())
                .orElseThrow(() -> new IllegalStateException("Centro de Atención no encontrado"));
        consultorio.setCentroAtencion(centro);

        if (consultorio.getId() == null || consultorio.getId() == 0) { // CREACIÓN
            if (repository.existsByNumeroAndCentroAtencion(consultorio.getNumero(), centro)) {
                throw new IllegalStateException("El número de consultorio ya está en uso");
            }
            if (repository.existsByNombreAndCentroAtencion(consultorio.getNombre(), centro)) {
                throw new IllegalStateException("El nombre del consultorio ya está en uso");
            }
            
            // Si no tiene horarios específicos, crear horarios por defecto de 8:00 a 17:00
            if (consultorio.getHorariosSemanales() == null || consultorio.getHorariosSemanales().isEmpty()) {
                consultorio.setHorariosSemanales(crearHorariosDefault());
            }

            // Auditar creación
            Consultorio saved = repository.save(consultorio);
            auditLogService.logConsultorioCreated(saved.getId().longValue(), saved.getNombre(), 
                                                 saved.getCentroAtencion().getId().longValue(), performedBy);
            return toDTO(saved);
            
        } else {
            // MODIFICACIÓN
            Consultorio existente = repository.findById(consultorio.getId())
                    .orElseThrow(() -> new IllegalStateException("Consultorio no encontrado"));
            if (!existente.getCentroAtencion().equals(centro)) {
                throw new IllegalStateException("No se puede cambiar el Centro de Atención del consultorio");
            }
            if (!existente.getNumero().equals(consultorio.getNumero())) {
                if (repository.existsByNumeroAndCentroAtencion(consultorio.getNumero(), centro)) {
                    throw new IllegalStateException("El número de consultorio ya está en uso");
                }
            }
            if (!existente.getNombre().equals(consultorio.getNombre())) {
                if (repository.existsByNombreAndCentroAtencion(consultorio.getNombre(), centro)) {
                    throw new IllegalStateException("El nombre del consultorio ya está en uso");
                }
            }

            // Auditar actualización
            Map<String, Object> oldData = Map.of(
                "numero", existente.getNumero(),
                "nombre", existente.getNombre()
            );
            Map<String, Object> newData = Map.of(
                "numero", consultorio.getNumero(),
                "nombre", consultorio.getNombre()
            );

            existente.setNumero(consultorio.getNumero());
            existente.setNombre(consultorio.getNombre());
            existente.setHorariosSemanales(consultorio.getHorariosSemanales());
            Consultorio saved = repository.save(existente);
            
            auditLogService.logConsultorioUpdated(saved.getId().longValue(), performedBy, 
                                                oldData, newData, "Actualización de consultorio");
            return toDTO(saved);
        }
    }

    private void validateConsultorio(Consultorio consultorio) {
        String nombre = consultorio.getNombre();
        if (nombre == null || nombre.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del consultorio es obligatorio");
        }
        if (consultorio.getNumero() == null) {
            throw new IllegalArgumentException("El número del consultorio es obligatorio");
        }
        if (consultorio.getNumero() <= 0) {
            throw new IllegalArgumentException("El número del consultorio debe ser positivo");
        }

        if (nombre.length() > 50) {
            throw new IllegalArgumentException("El nombre del consultorio no puede superar los 50 caracteres");
        }
        if (!nombre.matches("^[\\p{L}0-9\\sáéíóúÁÉÍÓÚüÜñÑ]+$")) {
            throw new IllegalArgumentException("El nombre del consultorio contiene caracteres no permitidos");
        }
        if (consultorio.getCentroAtencion() == null || consultorio.getCentroAtencion().getId() == 0) {
            throw new IllegalArgumentException("El centro de atención es obligatorio");
        }
        
        // Validar horarios si están definidos
        validateHorarios(consultorio);
    }
    
    /**
     * Valida los horarios del consultorio
     */
    private void validateHorarios(Consultorio consultorio) {
        if (consultorio.getHorariosSemanales() != null) {
            for (Consultorio.HorarioConsultorio horario : consultorio.getHorariosSemanales()) {
                if (horario.getActivo() && horario.getHoraApertura() != null && horario.getHoraCierre() != null) {
                    if (horario.getHoraApertura().isAfter(horario.getHoraCierre())) {
                        throw new IllegalArgumentException(
                            "La hora de apertura no puede ser posterior a la hora de cierre para el día " + horario.getDiaSemana());
                    }
                }
            }
        }
    }
    
    /**
     * Verifica si un consultorio está disponible en un día y horario específico
     */
    public boolean consultorioDisponibleEnHorario(Integer consultorioId, String diaSemana, 
                                                  java.time.LocalTime hora) {
        System.out.println("=== DEBUG consultorioDisponibleEnHorario ===");
        System.out.println("consultorioId: " + consultorioId + ", diaSemana: " + diaSemana + ", hora: " + hora);
        
        Optional<ConsultorioDTO> consultorioOpt = findById(consultorioId);
        if (!consultorioOpt.isPresent()) {
            System.out.println("Consultorio no encontrado - retornando false");
            return false;
        }
        
        ConsultorioDTO consultorio = consultorioOpt.get();
        System.out.println("Consultorio encontrado: " + consultorio.getNombre());
        System.out.println("Horarios semanales count: " + (consultorio.getHorariosSemanales() != null ? consultorio.getHorariosSemanales().size() : 0));
        
        // Verificar horarios específicos (única fuente de verdad)
        if (consultorio.getHorariosSemanales() != null && !consultorio.getHorariosSemanales().isEmpty()) {
            System.out.println("Verificando horarios específicos...");
            for (ConsultorioDTO.HorarioConsultorioDTO horario : consultorio.getHorariosSemanales()) {
                System.out.println("  - Día: " + horario.getDiaSemana() + ", activo: " + horario.getActivo() + 
                                 ", apertura: " + horario.getHoraApertura() + ", cierre: " + horario.getHoraCierre());
            }
            
            boolean resultado = consultorio.getHorariosSemanales().stream()
                .anyMatch(horario -> {
                    boolean match = horario.getDiaSemana().equalsIgnoreCase(diaSemana) &&
                                   horario.getActivo() &&
                                   horario.getHoraApertura() != null &&
                                   horario.getHoraCierre() != null &&
                                   !hora.isBefore(horario.getHoraApertura()) &&
                                   !hora.isAfter(horario.getHoraCierre());
                    if (horario.getDiaSemana().equalsIgnoreCase(diaSemana)) {
                        System.out.println("  >> Evaluando " + diaSemana + ": activo=" + horario.getActivo() + 
                                         ", aperturaOK=" + (horario.getHoraApertura() != null) + 
                                         ", cierreOK=" + (horario.getHoraCierre() != null));
                        if (horario.getActivo() && horario.getHoraApertura() != null && horario.getHoraCierre() != null) {
                            System.out.println("  >> Hora " + hora + " vs rango " + horario.getHoraApertura() + "-" + horario.getHoraCierre() + 
                                             " = " + (!hora.isBefore(horario.getHoraApertura()) && !hora.isAfter(horario.getHoraCierre())));
                        }
                    }
                    return match;
                });
            System.out.println("Resultado horarios específicos: " + resultado);
            return resultado;
        }
        
        // Si no hay horarios específicos configurados, el consultorio no está disponible
        System.out.println("Sin horarios específicos configurados - retornando false");
        return false;
    }
    
    /**
     * Crea horarios por defecto de 8:00 a 19:00 para todos los días de la semana
     * ACTUALIZADO: Extendido hasta las 19:00 para acomodar horarios médicos
     */
    private List<Consultorio.HorarioConsultorio> crearHorariosDefault() {
        String[] diasSemana = {"LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"};
        java.time.LocalTime horaApertura = java.time.LocalTime.of(8, 0);  // 8:00
        java.time.LocalTime horaCierre = java.time.LocalTime.of(19, 0);   // 19:00 (extendido)
        
        return java.util.Arrays.stream(diasSemana)
            .map(dia -> new Consultorio.HorarioConsultorio(dia, horaApertura, horaCierre, true))
            .collect(java.util.stream.Collectors.toList());
    }
}
