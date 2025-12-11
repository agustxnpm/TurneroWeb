# language: es
Característica: Flujo Completo de Paciente (Registro -> Activación -> Lista Espera)

  Antecedentes:
    Dado que existe un sistema de gestión de turnos funcionando

  Escenario: Ciclo de vida completo de un nuevo paciente
    Dado que un nuevo paciente se registra en el sistema
    Cuando el sistema genera el token de activación
    Y el paciente valida su email con dicho token
    Y inicia sesión con sus nuevas credenciales
    Y solicita unirse a la lista de espera para "Cardiología"
    Entonces el sistema confirma su ingreso a la lista exitosamente
