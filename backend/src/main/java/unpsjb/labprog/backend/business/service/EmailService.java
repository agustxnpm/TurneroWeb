package unpsjb.labprog.backend.business.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.concurrent.CompletableFuture;

/**
 * Servicio para el envío de correos electrónicos.
 * Soporta envío de mensajes de texto plano y HTML de forma síncrona y
 * asíncrona.
 * 
 */
@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Autowired

    private DeepLinkService deepLinkService;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name}")
    private String appName;

    @Value("${app.url}")
    private String appUrl;

    /**
     * Envía un correo electrónico de texto plano de forma síncrona.
     * 
     * @param to      Dirección de correo del destinatario
     * @param subject Asunto del correo
     * @param body    Cuerpo del mensaje en texto plano
     * @throws EmailSendException Si ocurre un error al enviar el correo
     */
    public void sendTextEmail(String to, String subject, String body) {
        validateEmailParameters(to, subject, body);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            logger.info("Correo de texto enviado exitosamente a: {}", to);

        } catch (MailException e) {
            logger.error("Error al enviar correo de texto a {}: {}", to, e.getMessage());
            throw new EmailSendException("Error al enviar correo electrónico", e);
        }
    }

    /**
     * Envía un correo electrónico HTML de forma síncrona.
     * 
     * @param to       Dirección de correo del destinatario
     * @param subject  Asunto del correo
     * @param htmlBody Cuerpo del mensaje en HTML
     * @throws EmailSendException Si ocurre un error al enviar el correo
     */
    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        validateEmailParameters(to, subject, htmlBody);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true indica que es HTML

            mailSender.send(message);
            logger.info("Correo HTML enviado exitosamente a: {}", to);

        } catch (MessagingException | MailException e) {
            logger.error("Error al enviar correo HTML a {}: {}", to, e.getMessage());
            throw new EmailSendException("Error al enviar correo electrónico HTML", e);
        }
    }

    /**
     * Envía un correo electrónico de texto plano de forma asíncrona.
     * 
     * @param to      Dirección de correo del destinatario
     * @param subject Asunto del correo
     * @param body    Cuerpo del mensaje en texto plano
     * @return CompletableFuture<Void> para manejar el resultado asíncrono
     */
    @Async
    public CompletableFuture<Void> sendTextEmailAsync(String to, String subject, String body) {
        CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
            sendTextEmail(to, subject, body);
        });
        future.whenComplete((result, ex) -> {
            if (ex != null) {
                logger.error("[Async] Error al enviar correo de texto a {}: {}", to, ex.getMessage());
            } else {
                logger.info("[Async] Correo de texto enviado exitosamente a: {}", to);
            }
        });
        return future;
    }

    /**
     * Envía un correo electrónico HTML de forma asíncrona.
     * 
     * @param to       Dirección de correo del destinatario
     * @param subject  Asunto del correo
     * @param htmlBody Cuerpo del mensaje en HTML
     * @return CompletableFuture<Void> para manejar el resultado asíncrono
     */
    @Async
    public CompletableFuture<Void> sendHtmlEmailAsync(String to, String subject, String htmlBody) {
        CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
            sendHtmlEmail(to, subject, htmlBody);
        });
        future.whenComplete((result, ex) -> {
            if (ex != null) {
                logger.error("[Async] Error al enviar correo HTML a {}: {}", to, ex.getMessage());
            } else {
                logger.info("[Async] Correo HTML enviado exitosamente a: {}", to);
            }
        });
        return future;
    }

    /**
     * Envía un correo para restablecer contraseña.
     * 
     * @param to        Dirección de correo del usuario
     * @param resetLink Enlace para restablecer la contraseña
     */
    @Async
    public CompletableFuture<Void> sendPasswordResetEmail(String to, String resetLink) {
        String subject = appName + " - Restablecer contraseña";
        String htmlBody = buildPasswordResetEmailBody(resetLink);

        return sendHtmlEmailAsync(to, subject, htmlBody);
    }

    /**
     * Envía un correo de activación de cuenta.
     * 
     * @param to             Dirección de correo del usuario
     * @param activationLink Enlace para activar la cuenta
     * @param userName       Nombre del usuario
     */
    @Async
    public CompletableFuture<Void> sendAccountActivationEmail(String to, String activationLink, String userName) {
        String subject = appName + " - Activar tu cuenta";
        String htmlBody = buildAccountActivationEmailBody(activationLink, userName);

        return sendHtmlEmailAsync(to, subject, htmlBody);
    }

    /**
     * Envía credenciales iniciales a un nuevo usuario.
     * 
     * @param to                Dirección de correo del usuario
     * @param userName          Nombre del usuario
     * @param temporaryPassword Contraseña temporal
     */
    @Async
    public CompletableFuture<Void> sendInitialCredentialsEmail(String to, String userName, String temporaryPassword) {
        String subject = appName + " - Credenciales de acceso";
        String htmlBody = buildInitialCredentialsEmailBody(userName, temporaryPassword);

        return sendHtmlEmailAsync(to, subject, htmlBody);
    }

    /**
     * Envía una notificación de turno confirmado.
     * 
     * @param to                 Dirección de correo del paciente
     * @param patientName        Nombre del paciente
     * @param appointmentDetails Detalles del turno
     */
    @Async
    public CompletableFuture<Void> sendAppointmentConfirmationEmail(String to, String patientName,
            String appointmentDetails) {
        String subject = appName + " - Confirmación de turno";
        String htmlBody = buildAppointmentConfirmationEmailBody(patientName, appointmentDetails);

        return sendHtmlEmailAsync(to, subject, htmlBody);
    }

    /**
     * Envía una notificación de turno cancelado con deep link para reagendar.
     * 
     * @param to                  Dirección de correo del paciente
     * @param patientName         Nombre del paciente
     * @param cancellationDetails Detalles de la cancelación
     * @param pacienteId          ID del paciente para generar deep link
     * @param turnoId             ID del turno cancelado
     */
    @Async
    public CompletableFuture<Void> sendAppointmentCancellationEmail(String to, String patientName,
            String cancellationDetails, Integer pacienteId, Integer turnoId) {

        // Generar deep link token para reagendar
        String deepLinkToken = deepLinkService.generarDeepLinkToken(pacienteId, turnoId, "CANCELACION");
        String rescheduleUrl = appUrl + "/link-verificacion?token=" + deepLinkToken;

        String subject = appName + " - Turno cancelado";
        String htmlBody = buildAppointmentCancellationEmailBody(patientName, cancellationDetails, rescheduleUrl);

        return sendHtmlEmailAsync(to, subject, htmlBody);
    }

    /**
     * Envía un correo de cancelación automática de turno por falta de confirmación.
     * 
     * @param to                 Dirección de correo del paciente
     * @param patientName        Nombre del paciente
     * @param appointmentDetails Detalles del turno cancelado
     * @param rescheduleUrl      URL para reagendar
     * @return CompletableFuture que se completa cuando el email es enviado
     */
    public CompletableFuture<Void> sendAutomaticCancellationEmail(String to, String patientName,
            String appointmentDetails, String rescheduleUrl) {
        String subject = appName + " - Turno cancelado automáticamente";
        String htmlBody = buildAutomaticCancellationEmailBody(patientName, appointmentDetails, rescheduleUrl);

        return sendHtmlEmailAsync(to, subject, htmlBody);
    }

    /**
     * Envía un correo de bienvenida a un nuevo administrador.
     *
     * @param adminUser         Usuario administrador creado
     * @param temporaryPassword Contraseña temporal asignada
     */
    @Async
    public CompletableFuture<Void> sendAdminWelcomeEmail(unpsjb.labprog.backend.model.User adminUser,
            String temporaryPassword) {
        String subject = appName + " - Cuenta de Administrador Creada";
        String htmlBody = buildAdminWelcomeEmailBody(adminUser.getNombre(), temporaryPassword);

        return sendHtmlEmailAsync(adminUser.getEmail(), subject, htmlBody);
    }

    private String buildAdminWelcomeEmailBody(String adminName, String temporaryPassword) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Bienvenida Administrador</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #2c5aa0;">Bienvenido a %s - Cuenta de Administrador</h2>
                                <p>Hola %s,</p>
                                <p>Tu cuenta de administrador ha sido creada exitosamente. Aquí tienes tus credenciales iniciales:</p>

                                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p><strong>Usuario:</strong> Tu dirección de correo electrónico</p>
                                    <p><strong>Contraseña temporal:</strong> <code>%s</code></p>
                                </div>

                                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p style="margin: 0; color: #856404;">
                                        <strong>⚠️ IMPORTANTE:</strong>
                                        <ul>
                                            <li>Por seguridad, debes cambiar esta contraseña en tu primer inicio de sesión.</li>
                                            <li>Esta contraseña temporal expirará en 24 horas.</li>
                                            <li>Mantén tus credenciales en un lugar seguro.</li>
                                        </ul>
                                    </p>
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Acceder al sistema</a>
                                </div>

                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">
                                    Este es un correo automático. Por favor no respondas a este mensaje.<br>
                                    Si no esperabas este correo, contacta inmediatamente al administrador del sistema.
                                </p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, adminName, temporaryPassword, appUrl);
    }

    // Métodos privados para construir los cuerpos de los correos

    private String buildPasswordResetEmailBody(String resetLink) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Restablecer contraseña</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #2c5aa0;">Restablecer contraseña - %s</h2>
                                <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                                <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer contraseña</a>
                                </div>
                                <p><strong>Este enlace expirará en 24 horas por seguridad.</strong></p>
                                <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, resetLink);
    }

    private String buildAccountActivationEmailBody(String activationLink, String userName) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Activar cuenta</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #2c5aa0;">¡Bienvenido a %s, %s!</h2>
                                <p>Tu cuenta ha sido creada exitosamente. Para comenzar a usar nuestros servicios, necesitas activar tu cuenta.</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s" style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Activar cuenta</a>
                                </div>
                                <p>Una vez activada tu cuenta, podrás acceder a todas las funcionalidades del sistema.</p>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, userName, activationLink);
    }

    private String buildInitialCredentialsEmailBody(String userName, String temporaryPassword) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Credenciales de acceso</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #2c5aa0;">Credenciales de acceso - %s</h2>
                                <p>Hola %s,</p>
                                <p>Se ha creado tu cuenta en nuestro sistema. Aquí tienes tus credenciales de acceso:</p>
                                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p><strong>Usuario:</strong> Tu dirección de correo electrónico</p>
                                    <p><strong>Contraseña temporal:</strong> <code>%s</code></p>
                                </div>
                                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 20px 0;">
                                    <p style="margin: 0;"><strong>⚠️ Importante:</strong> Por seguridad, cambia tu contraseña en el primer acceso.</p>
                                </div>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Acceder al sistema</a>
                                </div>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, userName, temporaryPassword, appUrl);
    }

    private String buildAppointmentConfirmationEmailBody(String patientName, String appointmentDetails) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Confirmación de turno</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #28a745;">Turno confirmado - %s</h2>
                                <p>Hola %s,</p>
                                <p>Tu turno ha sido confirmado exitosamente. Aquí tienes los detalles:</p>
                                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    %s
                                </div>
                                <p><strong>Recordatorio:</strong> Llega 15 minutos antes de tu cita con tu DNI y carnet de obra social (si corresponde).</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver mis turnos</a>
                                </div>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, patientName, appointmentDetails, appUrl);
    }

    private String buildAppointmentCancellationEmailBody(String patientName, String cancellationDetails,
            String rescheduleUrl) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Turno cancelado</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #dc3545;">Turno cancelado - %s</h2>
                                <p>Hola %s,</p>
                                <p>Lamentamos informarte que tu turno ha sido cancelado. Aquí tienes los detalles:</p>
                                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    %s
                                </div>
                                <p><strong>¿Necesitas reagendar?</strong> Puedes reservar un nuevo turno fácilmente:</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Agendar nuevo turno</a>
                                </div>
                                <p style="font-size: 14px; color: #666;">
                                    <!-- TODO: Aplicar filtros automáticos para misma especialidad y centro médico del turno original -->
                                    El enlace te llevará directamente a la agenda de turnos.
                                </p>
                                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, patientName, cancellationDetails, rescheduleUrl);
    }

    /**
     * Envía un email de recordatorio de turno al paciente con deep-link de
     * confirmación.
     * 
     * @param to              Correo electrónico del destinatario
     * @param patientName     Nombre del paciente
     * @param reminderDetails Detalles del recordatorio (e.g., fecha, hora, médico,
     *                        etc.)
     * @param pacienteId      ID del paciente para generar el deep-link
     * @param turnoId         ID del turno para generar el deep-link
     * @return CompletableFuture<Void> para manejo asíncrono
     */
    @Async
    public CompletableFuture<Void> sendAppointmentReminderEmail(String to, String patientName, String reminderDetails,
            Integer pacienteId, Integer turnoId) {
        String subject = appName + " - Recordatorio de turno";

        // Generar deep-link para confirmación directa
        String deepLinkToken = deepLinkService.generarDeepLinkToken(pacienteId, turnoId, "CONFIRMACION");
        String confirmUrl = appUrl + "/link-verificacion?token=" + deepLinkToken;

        String htmlBody = buildAppointmentReminderEmailBody(patientName, reminderDetails, confirmUrl);

        return sendHtmlEmailAsync(to, subject, htmlBody);
    }

    /**
     * Construye el cuerpo HTML para el email de recordatorio de turno.
     * 
     * @param patientName     Nombre del paciente
     * @param reminderDetails Detalles formateados del turno
     * @param confirmUrl      URL con deep-link para confirmación directa
     * @return String con el HTML del cuerpo del email
     */
    private String buildAppointmentReminderEmailBody(String patientName, String reminderDetails, String confirmUrl) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Recordatorio de turno</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #ffc107;">Recordatorio de turno - %s</h2>
                                <p>Hola %s,</p>
                                <p>Te recordamos tu próximo turno. Por favor, confirma tu asistencia lo antes posible para evitar cancelaciones automáticas:</p>
                                <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    %s
                                </div>
                                <p><strong>Importante:</strong> Si no confirmas en el plazo establecido, el turno podría cancelarse automáticamente.</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s" style="background-color: #ffc107; color: #333; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Confirmar turno</a>
                                </div>
                                <p style="font-size: 14px; color: #666;">
                                    El enlace te llevará a tu agenda de turnos donde podrás confirmar automáticamente tu asistencia.
                                </p>
                                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, patientName, reminderDetails, confirmUrl);
    }

    private String buildAutomaticCancellationEmailBody(String patientName, String appointmentDetails,
            String rescheduleUrl) {
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Turno cancelado automáticamente</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #dc3545;">Turno cancelado automáticamente - %s</h2>
                                <p>Hola %s,</p>
                                <p>Lamentamos informarte que tu turno ha sido <strong>cancelado automáticamente</strong> por no haber sido confirmado dentro del tiempo establecido.</p>
                                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <h4 style="margin-top: 0; color: #856404;">Detalles del turno cancelado:</h4>
                                    %s
                                </div>
                                <p><strong>¿Por qué fue cancelado?</strong></p>
                                <p>Los turnos deben ser confirmados por el paciente dentro de las 48 horas previas a la cita. Si no se confirma, el sistema lo cancela automáticamente para permitir que otros pacientes puedan acceder al horario.</p>
                                <p><strong>¿Necesitas reagendar?</strong> Puedes reservar un nuevo turno fácilmente:</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="%s" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Agendar nuevo turno</a>
                                </div>
                                <p style="font-size: 14px; color: #666;">
                                    Recuerda confirmar tu próximo turno dentro del tiempo establecido para evitar cancelaciones automáticas.
                                </p>
                                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #666;">Este es un correo automático, por favor no respondas.</p>
                            </div>
                        </body>
                        </html>
                        """,
                appName, patientName, appointmentDetails, rescheduleUrl);
    }

    /**
     * Valida los parámetros básicos para el envío de correos.
     * 
     * @param to      Dirección de correo del destinatario
     * @param subject Asunto del correo
     * @param body    Cuerpo del mensaje
     * @throws IllegalArgumentException Si algún parámetro es inválido
     */
    private void validateEmailParameters(String to, String subject, String body) {
        if (to == null || to.trim().isEmpty()) {
            throw new IllegalArgumentException("La dirección de correo del destinatario no puede estar vacía");
        }

        if (subject == null || subject.trim().isEmpty()) {
            throw new IllegalArgumentException("El asunto del correo no puede estar vacío");
        }

        if (body == null || body.trim().isEmpty()) {
            throw new IllegalArgumentException("El cuerpo del mensaje no puede estar vacío");
        }

        // Validación básica de formato de email
        if (!to.contains("@") || !to.contains(".")) {
            throw new IllegalArgumentException("El formato de la dirección de correo es inválido");
        }
    }

    // Excepción personalizada para errores de envío de correo
    public static class EmailSendException extends RuntimeException {
        public EmailSendException(String message) {
            super(message);
        }

        public EmailSendException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
