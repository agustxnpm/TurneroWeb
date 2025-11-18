import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { EncuestaService } from '../../services/encuesta.service';
import { AuthService } from '../../inicio-sesion/auth.service';
import { ModalService } from '../../modal/modal.service';

@Component({
  selector: 'app-encuesta',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './encuesta.component.html',
  styleUrls: ['./encuesta.component.css']
})
export class EncuestaComponent implements OnInit {
  turnoId: number | null = null;
  plantilla: any = null;
  loading = false;
  respuestas: { [preguntaId: number]: any } = {};
  submitted = false;

  constructor(
    private route: ActivatedRoute,
    private encuestaService: EncuestaService,
    private router: Router,
    private auth: AuthService,
    private modalService: ModalService
  ) { }

  goBack() {
    this.router.navigate(['/paciente-dashboard']);
  }

  ngOnInit(): void {
    this.turnoId = Number(this.route.snapshot.paramMap.get('id')) || null;
    if (!this.turnoId) {
      this.router.navigate(['/paciente-dashboard']);
      return;
    }
    this.cargarPlantilla();
  }

  cargarPlantilla() {
    this.loading = true;
    this.encuestaService.getEncuestaForTurno(this.turnoId!).subscribe({
      next: (dp) => {
        this.plantilla = dp?.data || null;
        // inicializar respuestas
        if (this.plantilla && this.plantilla.preguntas) {
          this.plantilla.preguntas.forEach((p: any) => {
            this.respuestas[p.id] = null;
          });
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando encuesta:', err);
        this.loading = false;
      }
    });
  }

  tipoEsNumerico(tipo: string) {
    return tipo === 'NPS' || tipo.startsWith('RATING') || tipo === 'CSAT';
  }

  enviar() {
    if (!this.turnoId || !this.plantilla) {
      console.error('❌ No hay turnoId o plantilla');
      return;
    }

    // Log para debugging
    console.log('📋 Estado actual del objeto respuestas:', this.respuestas);
    console.log('📋 Preguntas de la plantilla:', this.plantilla.preguntas);

    const respuestasPayload: any[] = [];

    // Iterar sobre las preguntas de la plantilla (no sobre respuestas)
    if (this.plantilla.preguntas) {
      this.plantilla.preguntas.forEach((pregunta: any) => {
        const preguntaId = pregunta.id;
        const valor = this.respuestas[preguntaId];

        console.log(`🔍 Procesando pregunta ${preguntaId} (${pregunta.tipo}):`, valor);

        // Verificar que haya un valor
        if (valor === null || valor === undefined || valor === '') {
          console.warn(`⚠️  Pregunta ${preguntaId} sin respuesta, se omite`);
          return; // Saltar esta pregunta
        }

        // Determinar si es numérico o texto según el tipo de pregunta
        const esNumerico = this.tipoEsNumerico(pregunta.tipo);

        if (esNumerico) {
          respuestasPayload.push({
            preguntaId: preguntaId,
            valorNumerico: Number(valor),
            valorTexto: null
          });
          console.log(`✅ Agregada respuesta numérica: pregunta=${preguntaId}, valor=${valor}`);
        } else {
          respuestasPayload.push({
            preguntaId: preguntaId,
            valorTexto: String(valor),
            valorNumerico: null
          });
          console.log(`✅ Agregada respuesta de texto: pregunta=${preguntaId}, valor="${valor}"`);
        }
      });
    }

    console.log('📦 Payload final a enviar:', respuestasPayload);

    // Validación: al menos una respuesta
    if (respuestasPayload.length === 0) {
      this.modalService.alert('Validación', 'Por favor responda al menos una pregunta antes de enviar la encuesta.');
      return;
    }

    const payload = {
      turnoId: this.turnoId,
      respuestas: respuestasPayload
    };

    this.submitted = true;

    this.encuestaService.enviarRespuestas(payload).subscribe({
      next: (res) => {
        console.log('✅ Respuestas enviadas exitosamente:', res);
        this.submitted = false;
        this.modalService.alert('¡Gracias!', 'Encuesta enviada correctamente. Tu opinión es muy importante para nosotros.');
        setTimeout(() => {
          this.router.navigate(['/paciente-dashboard']);
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Error enviando respuestas:', err);
        this.submitted = false;
        this.modalService.alert('Error', 'No se pudo enviar la encuesta. Por favor intente nuevamente.');
      }
    });
  }

}
