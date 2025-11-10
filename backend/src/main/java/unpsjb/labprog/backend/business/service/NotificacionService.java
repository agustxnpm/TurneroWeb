package unpsjb.labprog.backend.business.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import unpsjb.labprog.backend.business.repository.NotificacionRepository;
import unpsjb.labprog.backend.dto.NotificacionDTO;
import unpsjb.labprog.backend.model.Notificacion;
import unpsjb.labprog.backend.model.TipoNotificacion;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificacionService {

    @Autowired
    private NotificacionRepository notificacionRepository;

    /**
     * Crear una nueva notificación para un paciente
     */
    public NotificacionDTO crearNotificacion(Integer pacienteId, String titulo, String mensaje, 
                                           TipoNotificacion tipo, Integer turnoId, String usuarioCreador) {
        Notificacion notificacion = new Notificacion();
        notificacion.setPacienteId(pacienteId);
        notificacion.setTitulo(titulo);
        notificacion.setMensaje(mensaje);
        notificacion.setTipo(tipo);
        notificacion.setTurnoId(turnoId);
        notificacion.setUsuarioCreador(usuarioCreador);
        notificacion.setLeida(false);
        notificacion.setFechaCreacion(LocalDateTime.now());
        
        Notificacion saved = notificacionRepository.save(notificacion);
        return convertToDTO(saved);
    }

    /**
     * Obtener todas las notificaciones de un paciente (paginadas)
     */
    @Transactional(readOnly = true)
    public Page<NotificacionDTO> obtenerNotificacionesPorPaciente(Integer pacienteId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("fechaCreacion").descending());
        Page<Notificacion> notificaciones = notificacionRepository.findByPacienteIdOrderByFechaCreacionDesc(pacienteId, pageable);
        return notificaciones.map(this::convertToDTO);
    }

    /**
     * Obtener notificaciones no leídas de un paciente
     */
    @Transactional(readOnly = true)
    public List<NotificacionDTO> obtenerNotificacionesNoLeidas(Integer pacienteId) {
        List<Notificacion> notificaciones = notificacionRepository.findByPacienteIdAndLeidaFalseOrderByFechaCreacionDesc(pacienteId);
        return notificaciones.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Contar notificaciones no leídas de un paciente
     */
    @Transactional(readOnly = true)
    public Long contarNotificacionesNoLeidas(Integer pacienteId) {
        return notificacionRepository.countByPacienteIdAndLeidaFalse(pacienteId);
    }

    /**
     * Marcar una notificación como leída
     */
    public void marcarComoLeida(Long notificacionId, Integer pacienteId) {
        Notificacion notificacion = notificacionRepository.findByIdAndPacienteId(notificacionId, pacienteId);
        if (notificacion != null && !notificacion.getLeida()) {
            notificacion.marcarComoLeida();
            notificacionRepository.save(notificacion);
        }
    }

    /**
     * Marcar todas las notificaciones de un paciente como leídas
     */
    public void marcarTodasComoLeidas(Integer pacienteId) {
        List<Notificacion> notificaciones = notificacionRepository.findByPacienteIdAndLeidaFalse(pacienteId);
        for (Notificacion notificacion : notificaciones) {
            notificacion.marcarComoLeida();
        }
        notificacionRepository.saveAll(notificaciones);
    }

    /**
     * Eliminar una notificación
     */
    public void eliminarNotificacion(Long notificacionId, Integer pacienteId) {
        Notificacion notificacion = notificacionRepository.findByIdAndPacienteId(notificacionId, pacienteId);
        if (notificacion != null) {
            notificacionRepository.delete(notificacion);
        }
    }

    /**
     * Crear notificación por cancelación de turno
     */
    public NotificacionDTO crearNotificacionCancelacion(Integer pacienteId, Integer turnoId, 
                                                      String fechaTurno, String especialidad, String motivo) {
        String titulo = "Turno Cancelado";
        String mensaje = String.format("Su turno del %s para %s ha sido cancelado. Motivo: %s", 
                                     fechaTurno, especialidad, motivo);
        
        return crearNotificacion(pacienteId, titulo, mensaje, 
                               TipoNotificacion.CANCELACION, turnoId, "SISTEMA");
    }

    /**
     * Crear notificación por reagendamiento de turno
     */
    public NotificacionDTO crearNotificacionReagendamiento(Integer pacienteId, Integer turnoId,
                                                         String fechaAnterior, String fechaNueva, String especialidad) {
        String titulo = "Turno Reagendado";
        String mensaje = String.format("Su turno de %s ha sido reagendado del %s al %s", 
                                     especialidad, fechaAnterior, fechaNueva);
        
        return crearNotificacion(pacienteId, titulo, mensaje, 
                               TipoNotificacion.REAGENDAMIENTO, turnoId, "SISTEMA");
    }

    /**
     * Crear notificación por confirmación de turno
     */
    public NotificacionDTO crearNotificacionConfirmacion(Integer pacienteId, Integer turnoId,
                                                       String fechaTurno, String especialidad, String medico) {
        String titulo = "Turno Confirmado";
        String mensaje = String.format("Su turno del %s para %s con Dr/a %s ha sido confirmado", 
                                     fechaTurno, especialidad, medico);
        
        return crearNotificacion(pacienteId, titulo, mensaje, 
                               TipoNotificacion.CONFIRMACION, turnoId, "SISTEMA");
    }

    /**
     * Crear notificación por nuevo turno
     */
    public NotificacionDTO crearNotificacionNuevoTurno(Integer pacienteId, Integer turnoId,
                                                     String fechaTurno, String especialidad, String medico) {
        String titulo = "Nuevo Turno Asignado";
        String mensaje = String.format("Se ha asignado un nuevo turno para el %s con Dr/a %s en %s", 
                                     fechaTurno, medico, especialidad);
        
        return crearNotificacion(pacienteId, titulo, mensaje, 
                               TipoNotificacion.NUEVO_TURNO, turnoId, "SISTEMA");
    }

    /**
     * Crear notificación de recordatorio
     */
    public NotificacionDTO crearNotificacionRecordatorio(Integer pacienteId, Integer turnoId,
                                                       String fechaTurno, String especialidad, String medico) {
        String titulo = "Recordatorio de Turno";
        String mensaje = String.format("Recordatorio: Tiene un turno mañana (%s) con Dr/a %s en %s", 
                                     fechaTurno, medico, especialidad);
        
        return crearNotificacion(pacienteId, titulo, mensaje, 
                               TipoNotificacion.RECORDATORIO, turnoId, "SISTEMA");
    }

    /**
     * Convertir entidad a DTO
     */
    private NotificacionDTO convertToDTO(Notificacion notificacion) {
        NotificacionDTO dto = new NotificacionDTO();
        dto.setId(notificacion.getId());
        dto.setPacienteId(notificacion.getPacienteId());
        dto.setTitulo(notificacion.getTitulo());
        dto.setMensaje(notificacion.getMensaje());
        dto.setTipo(notificacion.getTipo());
        dto.setLeida(notificacion.getLeida());
        dto.setFechaCreacion(notificacion.getFechaCreacion());
        dto.setFechaLeida(notificacion.getFechaLeida());
        dto.setTurnoId(notificacion.getTurnoId());
        dto.setUsuarioCreador(notificacion.getUsuarioCreador());
        return dto;
    }
}
