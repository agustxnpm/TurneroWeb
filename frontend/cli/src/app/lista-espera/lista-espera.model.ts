export interface ListaEspera {
    id: number;
    pacienteId: number;
    pacienteNombre: string;
    pacienteApellido: string;
    pacienteDni: string;
    pacienteTelefono: string;
    pacienteEmail: string;
    especialidadId: number;
    especialidadNombre: string;
    medicoPreferidoId?: number;
    medicoPreferidoNombre?: string;
    centroAtencionId: number;
    centroAtencionNombre: string;
    fechaDeseadaDesde?: Date;
    fechaDeseadaHasta?: Date;
    fechaSolicitud: Date;
    urgenciaMedica: string; // "BAJA", "MEDIA", "ALTA", "URGENTE"
    estado: string;
    diasEnEspera: number;
}