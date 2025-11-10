package unpsjb.labprog.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ListaEsperaDTO {

    private Long id;

    // Información del paciente
    private Integer pacienteId;
    private String pacienteNombre;
    private String pacienteApellido;
    private Long pacienteDni;
    private String pacienteTelefono;
    private String pacienteEmail;

    // Información de la especialidad
    private Integer especialidadId;
    private String especialidadNombre;

    // Información del médico preferido (opcional)
    private Integer medicoPreferidoId;
    private String medicoPreferidoNombre;

    // Información del centro de atención
    private Integer centroAtencionId;
    private String centroAtencionNombre;

    // Fechas
    private LocalDate fechaDeseadaDesde;
    private LocalDate fechaDeseadaHasta;
    private LocalDateTime fechaSolicitud;

    // Estado y urgencia
    private String urgenciaMedica; // "BAJA", "MEDIA", "ALTA", "URGENTE"
    private String estado; // PENDIENTE, RESUELTA, CUBIERTA

    // Días en espera (calculado)
    private Long diasEnEspera;

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getPacienteId() {
        return pacienteId;
    }

    public void setPacienteId(Integer pacienteId) {
        this.pacienteId = pacienteId;
    }

    public String getPacienteNombre() {
        return pacienteNombre;
    }

    public void setPacienteNombre(String pacienteNombre) {
        this.pacienteNombre = pacienteNombre;
    }

    public String getPacienteApellido() {
        return pacienteApellido;
    }

    public void setPacienteApellido(String pacienteApellido) {
        this.pacienteApellido = pacienteApellido;
    }

    public Long getPacienteDni() {
        return pacienteDni;
    }

    public void setPacienteDni(Long pacienteDni) {
        this.pacienteDni = pacienteDni;
    }

    public String getPacienteTelefono() {
        return pacienteTelefono;
    }

    public void setPacienteTelefono(String pacienteTelefono) {
        this.pacienteTelefono = pacienteTelefono;
    }

    public String getPacienteEmail() {
        return pacienteEmail;
    }

    public void setPacienteEmail(String pacienteEmail) {
        this.pacienteEmail = pacienteEmail;
    }

    public Integer getEspecialidadId() {
        return especialidadId;
    }

    public void setEspecialidadId(Integer especialidadId) {
        this.especialidadId = especialidadId;
    }

    public String getEspecialidadNombre() {
        return especialidadNombre;
    }

    public void setEspecialidadNombre(String especialidadNombre) {
        this.especialidadNombre = especialidadNombre;
    }

    public Integer getMedicoPreferidoId() {
        return medicoPreferidoId;
    }

    public void setMedicoPreferidoId(Integer medicoPreferidoId) {
        this.medicoPreferidoId = medicoPreferidoId;
    }

    public String getMedicoPreferidoNombre() {
        return medicoPreferidoNombre;
    }

    public void setMedicoPreferidoNombre(String medicoPreferidoNombre) {
        this.medicoPreferidoNombre = medicoPreferidoNombre;
    }

    public Integer getCentroAtencionId() {
        return centroAtencionId;
    }

    public void setCentroAtencionId(Integer centroAtencionId) {
        this.centroAtencionId = centroAtencionId;
    }

    public String getCentroAtencionNombre() {
        return centroAtencionNombre;
    }

    public void setCentroAtencionNombre(String centroAtencionNombre) {
        this.centroAtencionNombre = centroAtencionNombre;
    }

    public LocalDate getFechaDeseadaDesde() {
        return fechaDeseadaDesde;
    }

    public void setFechaDeseadaDesde(LocalDate fechaDeseadaDesde) {
        this.fechaDeseadaDesde = fechaDeseadaDesde;
    }

    public LocalDate getFechaDeseadaHasta() {
        return fechaDeseadaHasta;
    }

    public void setFechaDeseadaHasta(LocalDate fechaDeseadaHasta) {
        this.fechaDeseadaHasta = fechaDeseadaHasta;
    }

    public LocalDateTime getFechaSolicitud() {
        return fechaSolicitud;
    }

    public void setFechaSolicitud(LocalDateTime fechaSolicitud) {
        this.fechaSolicitud = fechaSolicitud;
    }

    public String getUrgenciaMedica() {
        return urgenciaMedica;
    }

    public void setUrgenciaMedica(String urgenciaMedica) {
        this.urgenciaMedica = urgenciaMedica;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Long getDiasEnEspera() {
        return diasEnEspera;
    }

    public void setDiasEnEspera(Long diasEnEspera) {
        this.diasEnEspera = diasEnEspera;
    }
}