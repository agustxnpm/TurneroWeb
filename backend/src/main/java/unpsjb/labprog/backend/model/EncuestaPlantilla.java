package unpsjb.labprog.backend.model;

import java.util.Set;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class EncuestaPlantilla {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    private String nombre;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "plantilla_pregunta",
        joinColumns = @JoinColumn(name = "plantilla_id"),
        inverseJoinColumns = @JoinColumn(name = "pregunta_id"))
    private Set<Pregunta> preguntas;

    // Opcional: se puede asignar a centro y/o especialidad
    @ManyToOne(optional = true)
    private CentroAtencion centroAtencion;

    @ManyToOne(optional = true)
    private Especialidad especialidad;
}
