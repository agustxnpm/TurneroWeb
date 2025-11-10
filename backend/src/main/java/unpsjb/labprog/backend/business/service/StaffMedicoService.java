package unpsjb.labprog.backend.business.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import unpsjb.labprog.backend.business.repository.CentroAtencionRepository;
import unpsjb.labprog.backend.business.repository.ConsultorioRepository;
import unpsjb.labprog.backend.business.repository.EspecialidadRepository;
import unpsjb.labprog.backend.business.repository.MedicoRepository;
import unpsjb.labprog.backend.business.repository.StaffMedicoRepository;
import unpsjb.labprog.backend.dto.CentroAtencionDTO;
import unpsjb.labprog.backend.dto.ConsultorioDTO;
import unpsjb.labprog.backend.dto.DisponibilidadMedicoDTO;
import unpsjb.labprog.backend.dto.EspecialidadDTO;
import unpsjb.labprog.backend.dto.MedicoDTO;
import unpsjb.labprog.backend.dto.StaffMedicoDTO;
import unpsjb.labprog.backend.model.CentroAtencion;
import unpsjb.labprog.backend.model.Consultorio;
import unpsjb.labprog.backend.model.DisponibilidadMedico;
import unpsjb.labprog.backend.model.Especialidad;
import unpsjb.labprog.backend.model.Medico;
import unpsjb.labprog.backend.model.StaffMedico;

@Service
public class StaffMedicoService {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private StaffMedicoRepository repository;
    @Autowired
    private MedicoRepository medicoRepository;
    @Autowired
    private CentroAtencionRepository centroRepository;
    @Autowired
    private EspecialidadRepository especialidadRepository;
    @Autowired
    private ConsultorioRepository consultorioRepository;
    @Autowired
    private unpsjb.labprog.backend.business.repository.EsquemaTurnoRepository esquemaTurnoRepository;
    @Autowired
    private unpsjb.labprog.backend.business.repository.TurnoRepository turnoRepository;

    public List<StaffMedicoDTO> findAll() {
        return repository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    public Optional<StaffMedicoDTO> findById(Integer id) {
        return repository.findById(id).map(this::toDTO);
    }

    public List<StaffMedicoDTO> findByCentroId(Integer centroId) {
        return repository.findByCentroAtencionId(centroId).stream()
                .map(this::toDTO)
                .toList();
    }

    public List<StaffMedicoDTO> findByMedicoId(Integer medicoId) {
        return repository.findByMedicoId(medicoId).stream()
                .map(this::toDTO)
                .toList();
    }

    public Page<StaffMedicoDTO> findByPage(int page, int size) {
        Page<StaffMedico> pageResult = repository.findAll(PageRequest.of(page, size));
        return pageResult.map(this::toDTO);
    }

    @Transactional
    public StaffMedicoDTO saveOrUpdate(StaffMedicoDTO dto) {
        StaffMedico staffMedico = toEntity(dto);

        // Validar datos
        validarStaffMedico(staffMedico);

        // Validar unicidad de la asociación médico-centro-especialidad
        Especialidad especialidad = staffMedico.getEspecialidad();
        if (staffMedico.getId() == null || staffMedico.getId() == 0) { // Creación
            if (repository.existsByMedicoAndCentroAtencionAndEspecialidad(
                    staffMedico.getMedico(), staffMedico.getCentroAtencion(), especialidad)) {
                throw new IllegalStateException("El médico ya está asociado a este centro con esa especialidad");
            }
        } else { // Actualización
            StaffMedico existente = repository.findByMedicoAndCentroAtencionAndEspecialidad(
                    staffMedico.getMedico(), staffMedico.getCentroAtencion(), especialidad);
            if (existente != null && !existente.getId().equals(staffMedico.getId())) {
                throw new IllegalStateException("El médico ya está asociado a este centro con esa especialidad");
            }
        }

        StaffMedico saved = repository.save(staffMedico);
        return toDTO(saved);
    }

    @Transactional
    public void deleteById(Integer id) {
        // 1. Desvincular turnos existentes (setea staffMedico a null)
        //    Esto preserva el historial del turno con la info del médico en los campos de auditoría
        int turnosDesvinculados = turnoRepository.desvincularStaffMedico(id);
        if (turnosDesvinculados > 0) {
            System.out.println("Desvinculados " + turnosDesvinculados + " turnos del staff médico ID: " + id);
        }

        // Flush explícito para asegurar que los cambios se persistan antes de la eliminación
        entityManager.flush();
        entityManager.clear(); // Limpiar el contexto para evitar referencias en caché

        // 2. Eliminar los esquemas de turno asociados a este staff médico
        var esquemasAsociados = esquemaTurnoRepository.findByStaffMedicoId(id);
        if (!esquemasAsociados.isEmpty()) {
            esquemaTurnoRepository.deleteAll(esquemasAsociados);
        }

        // 3. La disponibilidad se eliminará automáticamente por CascadeType.REMOVE
        repository.deleteById(id);
    }

    @Transactional
    public void deleteAll() {
        repository.deleteAll();
    }

    private StaffMedicoDTO toDTO(StaffMedico staff) {
        StaffMedicoDTO dto = new StaffMedicoDTO();
        dto.setId(staff.getId());
        dto.setCentro(toCentroAtencionDTO(staff.getCentroAtencion()));
        dto.setMedico(toMedicoDTO(staff.getMedico()));
        // Usar la especialidad directa del staff
        if (staff.getEspecialidad() != null) {
            dto.setEspecialidad(toEspecialidadDTO(staff.getEspecialidad()));
        }
        dto.setDisponibilidad(toDisponibilidadDTOList(staff.getDisponibilidad()));
        dto.setConsultorio(toConsultorioDTO(staff.getConsultorio()));
        dto.setPorcentaje(staff.getPorcentaje());
        
        // Agregar IDs para compatibilidad con frontend
        if (staff.getCentroAtencion() != null) {
            dto.setCentroAtencionId(staff.getCentroAtencion().getId());
        }
        if (staff.getMedico() != null) {
            dto.setMedicoId(staff.getMedico().getId());
        }
        if (staff.getEspecialidad() != null) {
            dto.setEspecialidadId(staff.getEspecialidad().getId());
        }
        if (staff.getConsultorio() != null) {
            dto.setConsultorioId(staff.getConsultorio().getId());
        }
        
        return dto;
    }

    private StaffMedico toEntity(StaffMedicoDTO dto) {
        StaffMedico staff = new StaffMedico();
        staff.setId(dto.getId());
        staff.setPorcentaje(dto.getPorcentaje());

        // 1. Médico - priorizar ID si está presente
        if (dto.getMedicoId() != null) {
            Optional<Medico> medicoOpt = medicoRepository.findById(dto.getMedicoId());
            if (medicoOpt.isEmpty()) {
                throw new IllegalStateException("Médico no existe con el ID: " + dto.getMedicoId());
            }
            staff.setMedico(medicoOpt.get());
        } else if (dto.getMedico() != null) {
            // Buscar médico por DNI y matrícula (método anterior)
            Long dni = Long.valueOf(dto.getMedico().getDni());
            Optional<Medico> medicoOpt = medicoRepository.findByDni(dni);
            if (medicoOpt.isEmpty()) {
                throw new IllegalStateException("Médico no existe con el dni indicado");
            }
            Medico medico = medicoOpt.get();
            if (!medico.getMatricula().equals(dto.getMedico().getMatricula())) {
                throw new IllegalStateException("Médico no existe con la matrícula indicada");
            }
            staff.setMedico(medico);
        } else {
            throw new IllegalStateException("Debe proporcionar médico (ID o datos completos)");
        }

        // 2. Centro de atención - priorizar ID si está presente
        if (dto.getCentroAtencionId() != null) {
            Optional<CentroAtencion> centroOpt = centroRepository.findById(dto.getCentroAtencionId());
            if (centroOpt.isEmpty()) {
                throw new IllegalStateException("Centro de atención no existe con el ID: " + dto.getCentroAtencionId());
            }
            staff.setCentroAtencion(centroOpt.get());
        } else if (dto.getCentro() != null) {
            // Buscar centro por nombre (método anterior)
            CentroAtencion centro = centroRepository.findByNombre(dto.getCentro().getNombre());
            if (centro == null) {
                throw new IllegalStateException("Centro de atención no existe con el nombre indicado");
            }
            staff.setCentroAtencion(centro);
        } else {
            throw new IllegalStateException("Debe proporcionar centro de atención (ID o datos completos)");
        }

        // 3. Especialidad - priorizar ID si está presente
        if (dto.getEspecialidadId() != null) {
            Optional<Especialidad> especialidadOpt = especialidadRepository.findById(dto.getEspecialidadId());
            if (especialidadOpt.isEmpty()) {
                throw new IllegalStateException("Especialidad no existe con el ID: " + dto.getEspecialidadId());
            }
            staff.setEspecialidad(especialidadOpt.get());
        } else if (dto.getEspecialidad() != null && dto.getEspecialidad().getNombre() != null) {
            // Buscar especialidad por nombre (método anterior)
            Especialidad especialidad = especialidadRepository.findByNombreIgnoreCase(dto.getEspecialidad().getNombre());
            if (especialidad == null) {
                throw new IllegalStateException("Especialidad no existe con el nombre indicado");
            }
            staff.setEspecialidad(especialidad);
        } else {
            throw new IllegalStateException("Debe proporcionar especialidad (ID o datos completos)");
        }

        // 4. Consultorio (opcional) - priorizar ID si está presente
        if (dto.getConsultorioId() != null) {
            Optional<Consultorio> consultorioOpt = consultorioRepository.findById(dto.getConsultorioId());
            if (consultorioOpt.isEmpty()) {
                throw new IllegalStateException("Consultorio no existe con el ID: " + dto.getConsultorioId());
            }
            staff.setConsultorio(consultorioOpt.get());
        } else if (dto.getConsultorio() != null && dto.getConsultorio().getId() != null) {
            Optional<Consultorio> consultorioOpt = consultorioRepository.findById(dto.getConsultorio().getId());
            if (consultorioOpt.isEmpty()) {
                throw new IllegalStateException("Consultorio no existe con el ID: " + dto.getConsultorio().getId());
            }
            staff.setConsultorio(consultorioOpt.get());
        }

        // 5. Disponibilidad (si está presente)
        // La disponibilidad se maneja por separado, no necesita procesamiento aquí

        return staff;
    }

    private void validarStaffMedico(StaffMedico staff) {
        if (staff.getMedico() == null || staff.getMedico().getId() == null || staff.getMedico().getId() <= 0) {
            throw new IllegalStateException("Debe seleccionar un médico válido.");
        }
        if (staff.getCentroAtencion() == null || staff.getCentroAtencion().getId() == null || staff.getCentroAtencion().getId() <= 0) {
            throw new IllegalStateException("Debe seleccionar un centro de atención válido.");
        }
        // Validar especialidad directa
        if (staff.getEspecialidad() == null || staff.getEspecialidad().getId() == null || staff.getEspecialidad().getId() <= 0) {
            throw new IllegalStateException("Debe seleccionar una especialidad válida.");
        }
        // Podés agregar más validaciones según tu modelo
    }

    private CentroAtencionDTO toCentroAtencionDTO(CentroAtencion centro) {
        if (centro == null) return null;
        CentroAtencionDTO dto = new CentroAtencionDTO();
        dto.setId(centro.getId());
        dto.setNombre(centro.getNombre());
        // agrega otros campos si es necesario
        return dto;
    }

    private MedicoDTO toMedicoDTO(Medico medico) {
        if (medico == null) return null;
        MedicoDTO dto = new MedicoDTO();
        dto.setId(medico.getId());
        dto.setNombre(medico.getNombre());
        dto.setApellido(medico.getApellido());
        dto.setDni(String.valueOf(medico.getDni()));
        dto.setMatricula(medico.getMatricula());
        // agrega otros campos si es necesario
        return dto;
    }

    private EspecialidadDTO toEspecialidadDTO(Especialidad especialidad) {
        if (especialidad == null) return null;
        EspecialidadDTO dto = new EspecialidadDTO();
        dto.setId(especialidad.getId());
        dto.setNombre(especialidad.getNombre());
        // agrega otros campos si es necesario
        return dto;
    }

    private ConsultorioDTO toConsultorioDTO(Consultorio consultorio) {
        if (consultorio == null) return null;
        ConsultorioDTO dto = new ConsultorioDTO();
        dto.setId(consultorio.getId());
        // agrega otros campos si es necesario
        return dto;
    }

    private List<DisponibilidadMedicoDTO> toDisponibilidadDTOList(List<DisponibilidadMedico> lista) {
        if (lista == null) return null;
        return lista.stream().map(d -> {
            DisponibilidadMedicoDTO dto = new DisponibilidadMedicoDTO();
            dto.setId(d.getId());

            // Mapear staffMedico info
            if (d.getStaffMedico() != null) {
                dto.setStaffMedicoId(d.getStaffMedico().getId());
                if (d.getStaffMedico().getMedico() != null) {
                    dto.setStaffMedicoName("Dr. " + d.getStaffMedico().getMedico().getNombre() +
                                         " " + d.getStaffMedico().getMedico().getApellido());
                }
            }

            // Mapear especialidad info
            if (d.getEspecialidad() != null) {
                dto.setEspecialidadId(d.getEspecialidad().getId());
                dto.setEspecialidadName(d.getEspecialidad().getNombre());
            }

            // Mapear horarios
            if (d.getHorarios() != null && !d.getHorarios().isEmpty()) {
                List<DisponibilidadMedicoDTO.DiaHorarioDTO> horariosDTO = d.getHorarios().stream()
                    .map(h -> {
                        DisponibilidadMedicoDTO.DiaHorarioDTO horarioDTO = new DisponibilidadMedicoDTO.DiaHorarioDTO();
                        horarioDTO.setDia(h.getDia());
                        horarioDTO.setHoraInicio(h.getHoraInicio());
                        horarioDTO.setHoraFin(h.getHoraFin());
                        return horarioDTO;
                    }).toList();
                dto.setHorarios(horariosDTO);
            }

            return dto;
        }).toList();
    }

    // ==================== MÉTODOS PARA GESTIÓN DE PORCENTAJES ====================

    /**
     * Actualiza los porcentajes de médicos de un centro específico
     */
    @Transactional
    public void actualizarPorcentajes(Integer centroId, List<StaffMedicoDTO> medicosConPorcentaje) {
        // Validar que la suma no exceda 100%
        double totalPorcentaje = medicosConPorcentaje.stream()
            .mapToDouble(m -> m.getPorcentaje() != null ? m.getPorcentaje() : 0.0)
            .sum();
        
        if (totalPorcentaje > 100.0) {
            throw new IllegalArgumentException("La suma de porcentajes no puede exceder 100%");
        }

        // Actualizar cada médico
        for (StaffMedicoDTO medicoDTO : medicosConPorcentaje) {
            if (medicoDTO.getId() != null) {
                Optional<StaffMedico> staffOpt = repository.findById(medicoDTO.getId());
                if (staffOpt.isPresent()) {
                    StaffMedico staff = staffOpt.get();
                    if (staff.getCentroAtencion().getId().equals(centroId)) {
                        staff.setPorcentaje(medicoDTO.getPorcentaje());
                        repository.save(staff);
                    }
                }
            }
        }
    }

    /**
     * Obtiene el total de porcentajes asignados en un centro
     */
    public Double obtenerTotalPorcentajesPorCentro(Integer centroId) {
        List<StaffMedico> staffMedicos = repository.findByCentroAtencionId(centroId);
        return staffMedicos.stream()
            .mapToDouble(staff -> staff.getPorcentaje() != null ? staff.getPorcentaje() : 0.0)
            .sum();
    }

    /**
     * Valida que los porcentajes no excedan 100% para un centro
     */
    public boolean validarPorcentajesPorCentro(Integer centroId, List<StaffMedicoDTO> medicosConPorcentaje) {
        double totalPorcentaje = medicosConPorcentaje.stream()
            .mapToDouble(m -> m.getPorcentaje() != null ? m.getPorcentaje() : 0.0)
            .sum();
        return totalPorcentaje <= 100.0;
    }

    /**
     * Obtiene todos los médicos de un centro con sus porcentajes
     */
    public List<StaffMedicoDTO> getMedicosConPorcentajesPorCentro(Integer centroId) {
        List<StaffMedico> staffMedicos = repository.findByCentroAtencionId(centroId);
        return staffMedicos.stream()
            .map(this::toDTO)
            .toList();
    }

    /**
     * Búsqueda paginada avanzada con filtros y ordenamiento
     * @param page Número de página (0-based)
     * @param size Tamaño de página
     * @param medico Filtro por nombre/apellido/dni de médico (opcional)
     * @param especialidad Filtro por nombre de especialidad (opcional)
     * @param centro Filtro por nombre de centro de atención (opcional)
     * @param consultorio Filtro por nombre/ID de consultorio (opcional)
     * @param sortBy Campo para ordenar (opcional)
     * @param sortDir Dirección del ordenamiento (asc/desc, opcional)
     * @return Page<StaffMedicoDTO> con los resultados paginados
     */
    public Page<StaffMedicoDTO> findByPage(
            int page,
            int size,
            String medico,
            String especialidad,
            String centro,
            String consultorio,
            String sortBy,
            String sortDir) {

        // Configurar ordenamiento
        Sort sort = Sort.unsorted();
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
            sort = Sort.by(direction, sortBy);
        }

        // Configurar paginación
        PageRequest pageable = PageRequest.of(page, size, sort);

        // Ejecutar consulta con filtros
        Page<StaffMedico> result = repository.findByFiltros(
            medico, especialidad, centro, consultorio, pageable);

        // Mapear a DTO
        return result.map(this::toDTO);
    }
}