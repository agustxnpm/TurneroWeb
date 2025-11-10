export interface Turno {
    // Campos básicos
    id?: number;
    fecha: string;                  // LocalDate como string
    horaInicio: string;             // LocalTime como string  
    horaFin: string;                // LocalTime como string
    estado: string;                 // "PROGRAMADO", "CONFIRMADO", "CANCELADO"
    observaciones?: string;         // Observaciones del SobreTurno

    // ⭐ CAMPOS DE ASISTENCIA (ACTUALIZADOS)
    asistio?: boolean;             // Indica si el paciente asistió al turno


    // Campos de paciente
    pacienteId?: number;
    nombrePaciente?: string;
    apellidoPaciente?: string;

    // Campos de staff médico
    staffMedicoId: number;
    staffMedicoNombre?: string;
    staffMedicoApellido?: string;
    especialidadStaffMedico?: string;

    // Campos de centro y consultorio
    centroId?: number;
    nombreCentro?: string;
    consultorioId?: number;
    consultorioNombre?: string;

    // Campo para título personalizado
    titulo?: string;

    // Campos para manejo de SLOTS en la agenda
    esSlot?: boolean;               // true = slot generado, false/undefined = turno real
    ocupado?: boolean;              // true = slot ocupado por un turno, false = disponible

    // === CAMPOS DE AUDITORÍA ===
    ultimoUsuarioModificacion?: string;    // Usuario que realizó la última modificación
    fechaUltimaModificacion?: string;      // Fecha/hora de la última modificación como string
    motivoUltimaModificacion?: string;     // Motivo de la última modificación
    totalModificaciones?: number;          // Número total de modificaciones
}

// Interfaz para los filtros de búsqueda avanzada
export interface TurnoFilter {
    // Filtros básicos
    estado?: string;
    pacienteId?: number;
    nombrePaciente?: string;
    staffMedicoId?: number;
    nombreMedico?: string;
    especialidadId?: number;
    nombreEspecialidad?: string;
    centroAtencionId?: number;
    nombreCentro?: string;
    consultorioId?: number;
    nombreConsultorio?: string;  // Agregado para filtros de reporte
    centroId?: number; // Agregado para compatibilidad con backend y servicio de exportación

    // Filtros de fecha
    fechaDesde?: string;
    fechaHasta?: string;
    fechaExacta?: string;

    // Filtros de auditoría
    usuarioModificacion?: string;
    conModificaciones?: boolean;

    // Paginación y ordenamiento
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;

    // Formato de exportación
    exportFormat?: string;  // CSV, PDF
}

// Interfaz para los logs de auditoría
export interface AuditLog {
    id?: number;
    turno?: Turno;  // Opcional, ya que algunos logs no tienen turno
    entityType?: string;  // Tipo de entidad auditada
    entityId?: number;    // ID de la entidad auditada
    action: string;
    estadoAnterior?: string;  // Estado anterior (coincide con backend)
    estadoNuevo?: string;     // Estado nuevo (coincide con backend)
    reason?: string;
    performedBy: string;
    performedAt: string;
    oldValues?: any;
    newValues?: any;
}

/** Filtros para búsqueda de logs de auditoría */
export interface AuditFilter {
    page?: number;
    size?: number;
    sort?: string;
    action?: string;
    user?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    turnoId?: number;
}

/** Respuesta paginada de logs de auditoría */
export interface AuditPage {
    content: AuditLog[];
    totalPages: number;
    totalElements: number;
    currentPage: number;
    size: number;
    numberOfElements: number;
    first: boolean;
    last: boolean;
}