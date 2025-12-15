package unpsjb.labprog.backend.model;

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
 * Entidad legacy - Los administradores ahora se gestionan mediante User con Role.ADMINISTRADOR o Role.SUPERADMIN
 * Esta entidad se mantiene por compatibilidad con código existente.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Administrador extends Persona {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * Centro de atención al que pertenece el administrador (Multi-tenencia).
     * - NULL: SUPERADMIN con acceso global
     * - NOT NULL: ADMINISTRADOR limitado a su centro
     */
    @ManyToOne
    @JoinColumn(name = "centro_atencion_id", nullable = true)
    private CentroAtencion centroAtencion;
}
