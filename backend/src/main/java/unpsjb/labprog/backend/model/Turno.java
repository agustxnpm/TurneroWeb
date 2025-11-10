package unpsjb.labprog.backend.model;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private LocalTime horaInicio;

    @Column(nullable = false)
    private LocalTime horaFin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoTurno estado;

    @ManyToOne(optional = false)
    private Paciente paciente;

    // Referencia al StaffMedico - puede ser null si el staff fue desvinculado del
    // centro
    // El constraint de FK permite SET NULL al eliminar el StaffMedico
    @ManyToOne(optional = true)
    @JoinColumn(name = "staff_medico_id", foreignKey = @ForeignKey(name = "fk_turno_staff_medico"))
    private StaffMedico staffMedico;

    // Referencia al médico que atendió - SIEMPRE se mantiene para auditoría
    @ManyToOne(optional = false)
    private Medico medico;

    @ManyToOne(optional = false)
    private Consultorio consultorio;

    // ==================== CAMPOS DE AUDITORÍA ====================
    // Estos campos preservan información histórica del momento en que se creó el
    // turno
    // incluso si el StaffMedico es eliminado posteriormente

    @ManyToOne(optional = false)
    private Especialidad especialidad;

    @ManyToOne(optional = false)
    private CentroAtencion centroAtencion;

    // Nuevo campo para observaciones
    @Column(length = 1000)
    private String observaciones; // Observaciones generales

    @Column(name = "asistio")
    private Boolean asistio; // null = no informado, true = asistió, false = no asistió

    public void confirmarTurno() {
        if (this.estado != EstadoTurno.PROGRAMADO) {
            throw new IllegalStateException("Solo se pueden confirmar turnos en estado PROGRAMADO.");
        }
        this.estado = EstadoTurno.CONFIRMADO;
    }

    public void cancelarTurno() {
        if (this.estado == EstadoTurno.CANCELADO) {
            throw new IllegalStateException("El turno ya está cancelado.");
        }
        this.estado = EstadoTurno.CANCELADO;
    }
}