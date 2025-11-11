package unpsjb.labprog.backend.dto;

import java.util.List;

public class EncuestaRespuestaInputDTO {
    private Integer turnoId;
    private List<RespuestaInputDTO> respuestas;

    public Integer getTurnoId() { return turnoId; }
    public void setTurnoId(Integer turnoId) { this.turnoId = turnoId; }

    public List<RespuestaInputDTO> getRespuestas() { return respuestas; }
    public void setRespuestas(List<RespuestaInputDTO> respuestas) { this.respuestas = respuestas; }

    public static class RespuestaInputDTO {
        private Integer preguntaId;
        private Integer valorNumerico;
        private String valorTexto;

        public Integer getPreguntaId() { return preguntaId; }
        public void setPreguntaId(Integer preguntaId) { this.preguntaId = preguntaId; }

        public Integer getValorNumerico() { return valorNumerico; }
        public void setValorNumerico(Integer valorNumerico) { this.valorNumerico = valorNumerico; }

        public String getValorTexto() { return valorTexto; }
        public void setValorTexto(String valorTexto) { this.valorTexto = valorTexto; }
    }
}
