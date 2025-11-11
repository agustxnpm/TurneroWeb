package unpsjb.labprog.backend.business.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.CentroAtencion;
import unpsjb.labprog.backend.model.EncuestaPlantilla;
import unpsjb.labprog.backend.model.Especialidad;

@Repository
public interface EncuestaPlantillaRepository extends JpaRepository<EncuestaPlantilla, Integer> {
    List<EncuestaPlantilla> findByEspecialidadAndCentroAtencion(Especialidad especialidad, CentroAtencion centro);
    List<EncuestaPlantilla> findByCentroAtencion(CentroAtencion centro);
    List<EncuestaPlantilla> findByEspecialidad(Especialidad especialidad);
    List<EncuestaPlantilla> findByCentroAtencionIsNullAndEspecialidadIsNull();
}
