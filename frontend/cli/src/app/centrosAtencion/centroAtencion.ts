import { Consultorio } from "../consultorios/consultorio";
import { Especialidad } from "../especialidades/especialidad";
import { StaffMedico } from "../staffMedicos/staffMedico";

export interface CentroAtencion {
  id?: number;
  nombre: string;
  direccion: string;
  localidad: string;
  provincia: string;
  telefono: string;
  coordenadas?: string;
  latitud: number;
  longitud: number;
  consultorios?: Consultorio[];
  especialidades?: Especialidad[];
  staffMedico?: StaffMedico[];
}