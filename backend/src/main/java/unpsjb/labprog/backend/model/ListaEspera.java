package unpsjb.labprog.backend.model;

import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class ListaEspera {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne
    private Paciente paciente;

    @ManyToOne
    private Especialidad especialidad;

    @ManyToOne
    private Medico medicoPreferido;

    @ManyToOne
    private CentroAtencion centroAtencion;

    private LocalDate fechaDeseadaDesde;
    private LocalDate fechaDeseadaHasta;
    private LocalDateTime fechaSolicitud;
    @Enumerated(EnumType.STRING)
    @Column(name = "urgencia_medica", nullable = false, length = 20)
    private UrgenciaMedica urgenciaMedica;
    private String estado; // PENDIENTE, RESUELTA, CUBIERTA

    // Enums para estado
    public enum EstadoListaEspera {
        PENDIENTE("PENDIENTE"),
        CUBIERTA("CUBIERTA"),
        RESUELTA("RESUELTA");

        private final String descripcion;

        EstadoListaEspera(String descripcion) {
            this.descripcion = descripcion;
        }

        public String getDescripcion() {
            return descripcion;
        }
    }

    // Enums para urgencia médica
    public enum UrgenciaMedica {
        BAJA("Baja"),
        MEDIA("Media"),
        ALTA("Alta"),
        URGENTE("Urgente");

        private final String descripcion;

        UrgenciaMedica(String descripcion) {
            this.descripcion = descripcion;
        }

        public String getDescripcion() {
            return descripcion;
        }
    }
}