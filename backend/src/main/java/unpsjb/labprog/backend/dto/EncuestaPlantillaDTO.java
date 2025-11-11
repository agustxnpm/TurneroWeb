package unpsjb.labprog.backend.dto;

import java.util.List;

public class EncuestaPlantillaDTO {
    private Integer id;
    private String nombre;
    private List<PreguntaDTO> preguntas;
    private Integer centroAtencionId;
    private Integer especialidadId;

    public EncuestaPlantillaDTO() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public List<PreguntaDTO> getPreguntas() {
        return preguntas;
    }

    public void setPreguntas(List<PreguntaDTO> preguntas) {
        this.preguntas = preguntas;
    }

    public Integer getCentroAtencionId() {
        return centroAtencionId;
    }

    public void setCentroAtencionId(Integer centroAtencionId) {
        this.centroAtencionId = centroAtencionId;
    }

    public Integer getEspecialidadId() {
        return especialidadId;
    }

    public void setEspecialidadId(Integer especialidadId) {
        this.especialidadId = especialidadId;
    }
}
