package unpsjb.labprog.backend.dto;

import unpsjb.labprog.backend.model.TipoPregunta;

public class PreguntaDTO {
    private Integer id;
    private String tipo;
    private String textoPregunta;

    public PreguntaDTO() {
    }

    public PreguntaDTO(Integer id, TipoPregunta tipo, String textoPregunta) {
        this.id = id;
        this.tipo = tipo != null ? tipo.name() : null;
        this.textoPregunta = textoPregunta;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getTextoPregunta() {
        return textoPregunta;
    }

    public void setTextoPregunta(String textoPregunta) {
        this.textoPregunta = textoPregunta;
    }
}
