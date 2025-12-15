package unpsjb.labprog.backend.model;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notificaciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notificacion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "paciente_id", nullable = false)
    private Integer pacienteId;
    
    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;
    
    @Column(name = "mensaje", nullable = false, length = 1000)
    private String mensaje;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false)
    private TipoNotificacion tipo;
    
    @Column(name = "leida", nullable = false)
    private Boolean leida = false;
    
    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;
    
    @Column(name = "fecha_leida")
    private LocalDateTime fechaLeida;
    
    @Column(name = "turno_id")
    private Integer turnoId;
    
    @Column(name = "usuario_creador", length = 100)
    private String usuarioCreador;
    
    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) {
            fechaCreacion = ZonedDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")).toLocalDateTime();
        }
    }
    
    public void marcarComoLeida() {
        this.leida = true;
        this.fechaLeida = ZonedDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")).toLocalDateTime();
    }
}
