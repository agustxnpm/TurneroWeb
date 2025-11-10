package unpsjb.labprog.backend.business.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.CentroAtencion;
import unpsjb.labprog.backend.model.Especialidad;
import unpsjb.labprog.backend.model.ListaEspera;
import unpsjb.labprog.backend.model.Medico;
import unpsjb.labprog.backend.model.Paciente;

@Repository
public interface ListaEsperaRepository extends JpaRepository<ListaEspera, Long> {

        /**
         * Busca todas las solicitudes por estado
         */
        List<ListaEspera> findByEstado(String estado);

        /**
         * Busca todas las solicitudes urgentes (ALTA o URGENTE)
         */
        @Query("SELECT le FROM ListaEspera le WHERE le.urgenciaMedica IN ('ALTA', 'URGENTE')")
        List<ListaEspera> findByUrgenciaMedicaAltaOUrgente();

        /**
         * Busca solicitudes por paciente
         */
        List<ListaEspera> findByPaciente(Paciente paciente);

        /**
         * Busca solicitudes por especialidad
         */
        List<ListaEspera> findByEspecialidad(Especialidad especialidad);

        /**
         * Busca solicitudes por centro de atención
         */
        List<ListaEspera> findByCentroAtencion(CentroAtencion centroAtencion);

        /**
         * Busca solicitudes por especialidad y estado
         */
        List<ListaEspera> findByEspecialidadAndEstado(Especialidad especialidad, String estado);

        /**
         * Busca solicitudes pendientes ordenadas por urgencia y fecha
         */
        @Query("SELECT le FROM ListaEspera le WHERE le.estado = 'PENDIENTE' " +
                        "ORDER BY le.urgenciaMedica DESC, le.fechaSolicitud ASC")
        List<ListaEspera> findPendientesOrdenadas();

        /**
         * Cuenta solicitudes pendientes por especialidad
         */
        @Query("SELECT COUNT(le) FROM ListaEspera le WHERE le.especialidad = :especialidad " +
                        "AND le.estado = 'PENDIENTE'")
        long contarPendientesPorEspecialidad(@Param("especialidad") Especialidad especialidad);

        /**
         * Busca solicitudes dentro de un rango de fechas deseadas
         */
        @Query("SELECT le FROM ListaEspera le WHERE le.fechaDeseadaDesde <= :fecha " +
                        "AND le.fechaDeseadaHasta >= :fecha AND le.estado = 'PENDIENTE'")
        List<ListaEspera> findDisponiblesParaFecha(@Param("fecha") LocalDate fecha);

        /**
         * Busca solicitudes por paciente y estado
         */
        List<ListaEspera> findByPacienteAndEstado(Paciente paciente, String estado);

        /**
         * Busca solicitudes pendientes por especialidad y centro, ordenadas por
         * prioridad
         */
        @Query("SELECT le FROM ListaEspera le WHERE le.estado = 'PENDIENTE' " +
                        "AND le.especialidad = :especialidad " +
                        "AND (le.centroAtencion = :centro OR le.centroAtencion IS NULL) " +
                        "ORDER BY le.urgenciaMedica DESC, le.fechaSolicitud ASC")
        List<ListaEspera> findCandidatosParaReasignacion(
                        @Param("especialidad") Especialidad especialidad,
                        @Param("centro") CentroAtencion centro);

        /**
         * Busca solicitudes pendientes por especialidad, centro y médico preferido
         */
        @Query("SELECT le FROM ListaEspera le WHERE le.estado = 'PENDIENTE' " +
                        "AND le.especialidad = :especialidad " +
                        "AND (le.centroAtencion = :centro OR le.centroAtencion IS NULL) " +
                        "AND (le.medicoPreferido = :medico OR le.medicoPreferido IS NULL) " +
                        "AND (le.fechaDeseadaDesde IS NULL OR le.fechaDeseadaDesde <= :fecha) " +
                        "AND (le.fechaDeseadaHasta IS NULL OR le.fechaDeseadaHasta >= :fecha) " +
                        "ORDER BY le.urgenciaMedica DESC, le.fechaSolicitud ASC")
        List<ListaEspera> findCandidatosOptimosParaTurno(
                        @Param("especialidad") Especialidad especialidad,
                        @Param("centro") CentroAtencion centro,
                        @Param("medico") Medico medico,
                        @Param("fecha") LocalDate fecha);

        /**
         * Cuenta solicitudes pendientes urgentes por especialidad
         */
        @Query("SELECT COUNT(le) FROM ListaEspera le WHERE le.especialidad = :especialidad " +
                        "AND le.estado = 'PENDIENTE' AND le.urgenciaMedica = true")
        long contarUrgentesePorEspecialidad(@Param("especialidad") Especialidad especialidad);

        /**
         * Busca la solicitud más antigua pendiente para una especialidad
         */
        @Query("SELECT le FROM ListaEspera le WHERE le.especialidad = :especialidad " +
                        "AND le.estado = 'PENDIENTE' ORDER BY le.fechaSolicitud ASC")
        Optional<ListaEspera> findSolicitudMasAntiguaPendiente(@Param("especialidad") Especialidad especialidad);

        /**
         * Busca solicitudes que vencen pronto (rango de fechas deseadas próximo a
         * expirar)
         */
        @Query("SELECT le FROM ListaEspera le WHERE le.estado = 'PENDIENTE' " +
                        "AND le.fechaDeseadaHasta IS NOT NULL " +
                        "AND le.fechaDeseadaHasta BETWEEN :hoy AND :fechaLimite " +
                        "ORDER BY le.fechaDeseadaHasta ASC, le.urgenciaMedica DESC")
        List<ListaEspera> findSolicitudesPorVencer(
                        @Param("hoy") LocalDate hoy,
                        @Param("fechaLimite") LocalDate fechaLimite);

        @Query(value = "SELECT e.nombre, " +
                        "COUNT(le.id), " +
                        "SUM(CASE WHEN le.urgencia_medica IN ('ALTA', 'URGENTE') THEN 1 ELSE 0 END), " +
                        "AVG(CURRENT_DATE - DATE(le.fecha_solicitud)) " +
                        "FROM lista_espera le " +
                        "JOIN especialidad e ON le.especialidad_id = e.id " +
                        "WHERE le.estado = 'PENDIENTE' " +
                        "GROUP BY e.nombre", nativeQuery = true)
        List<Object[]> getEstadisticasPorEspecialidad();

        /**
         * Busca solicitudes con tiempo de espera
         */
        @Query("SELECT le FROM ListaEspera le WHERE le.estado = 'PENDIENTE' ORDER BY le.fechaSolicitud ASC")
        List<ListaEspera> findSolicitudesConEsperaExcesiva();
}