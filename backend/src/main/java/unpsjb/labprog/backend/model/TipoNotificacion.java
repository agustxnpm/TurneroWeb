package unpsjb.labprog.backend.model;

public enum TipoNotificacion {
    CONFIRMACION("Turno Confirmado", "success"),
    CANCELACION("Turno Cancelado", "warning"),
    REAGENDAMIENTO("Turno Reagendado", "info"),
    RECORDATORIO("Recordatorio de Turno", "info"),
    NUEVO_TURNO("Nuevo Turno", "success"),
    SISTEMA_MANTENIMIENTO("Mantenimiento del Sistema", "warning"),
    INFORMACION_GENERAL("Información General", "info"),
    URGENTE("Notificación Urgente", "error"),
    ENCUESTA_PENDIENTE("Encuesta pendiente", "info");
    
    private final String descripcion;
    private final String categoria;
    
    TipoNotificacion(String descripcion, String categoria) {
        this.descripcion = descripcion;
        this.categoria = categoria;
    }
    
    public String getDescripcion() {
        return descripcion;
    }
    
    public String getCategoria() {
        return categoria;
    }
}
