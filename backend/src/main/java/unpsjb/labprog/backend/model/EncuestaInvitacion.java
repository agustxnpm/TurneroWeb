package unpsjb.labprog.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
public class EncuestaInvitacion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "turno_id")
    private Turno turno;

    @ManyToOne(optional = false)
    @JoinColumn(name = "paciente_id")
    private Paciente paciente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoInvitacion estado = EstadoInvitacion.PENDIENTE;

    @Column(nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    private LocalDateTime fechaEnvio;

    private LocalDateTime fechaProximoReintento;

    @Column(nullable = false)
    private Integer intentosEnvio = 0;

    @Column(length = 500)
    private String ultimoError;

    // Configuración de reintentos (en horas)
    @Column(nullable = false)
    private Integer intervaloReintentoHoras = 24; // Por defecto 24 horas

    @Column(nullable = false)
    private Integer maxIntentosReintento = 2; // Máximo 2 reintentos

    public enum EstadoInvitacion {
        PENDIENTE,    // Programada para envío
        ENVIADA,      // Email enviado exitosamente
        COMPLETADA,   // Encuesta respondida por el paciente
        EXPIRADA,     // Máximo de reintentos alcanzado
        CANCELADA     // Invitación cancelada (ej: turno cancelado)
    }

    // Métodos de negocio
    public boolean puedeReintentar() {
        return estado == EstadoInvitacion.PENDIENTE &&
               intentosEnvio < maxIntentosReintento &&
               (fechaProximoReintento == null || LocalDateTime.now().isAfter(fechaProximoReintento));
    }

    public void marcarEnviada() {
        this.estado = EstadoInvitacion.ENVIADA;
        this.fechaEnvio = LocalDateTime.now();
        this.intentosEnvio++;
    }

    public void marcarError(String error) {
        this.intentosEnvio++;
        this.ultimoError = error;
        this.fechaProximoReintento = LocalDateTime.now().plusHours(intervaloReintentoHoras);
    }

    public void marcarCompletada() {
        this.estado = EstadoInvitacion.COMPLETADA;
    }

    public void marcarExpirada() {
        this.estado = EstadoInvitacion.EXPIRADA;
    }

    public void marcarCancelada() {
        this.estado = EstadoInvitacion.CANCELADA;
    }
}