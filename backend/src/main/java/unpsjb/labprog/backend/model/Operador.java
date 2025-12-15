package unpsjb.labprog.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Entidad legacy - Los operadores ahora se gestionan mediante User con Role.OPERADOR
 * Esta entidad se mantiene por compatibilidad con código existente.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Operador extends Persona {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Centro de atención al que pertenece el operador (Multi-tenencia).
     * Un operador solo puede gestionar recursos de su centro asignado.
     */
    @ManyToOne
    @JoinColumn(name = "centro_atencion_id", nullable = true)
    private CentroAtencion centroAtencion;

    // Estado del operador (activo/inactivo)
    @Column(nullable = false)
    private boolean activo = true;

}
