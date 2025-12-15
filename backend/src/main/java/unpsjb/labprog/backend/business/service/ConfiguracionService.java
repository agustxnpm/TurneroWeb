package unpsjb.labprog.backend.business.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import unpsjb.labprog.backend.business.repository.ConfiguracionRepository;
import unpsjb.labprog.backend.model.Configuracion;
import unpsjb.labprog.backend.config.TenantContext;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ConfiguracionService {

    @Autowired
    private ConfiguracionRepository configuracionRepository;

    /**
     * Busca una configuración aplicando la lógica de override por centro.
     * 1. Si el usuario está asociado a un centro, busca primero override específico del centro
     * 2. Si no hay override o el usuario es global, busca configuración global (centroAtencion = null)
     * 3. Si no existe ninguna, retorna empty
     * 
     * @param clave Clave de la configuración a buscar
     * @return Optional con la configuración encontrada (override o global)
     */
    private Optional<Configuracion> findConfiguracionConOverride(String clave) {
        Integer centroId = TenantContext.getFilteredCentroId();
        
        if (centroId != null) {
            // Usuario limitado por centro - buscar primero override del centro
            Optional<Configuracion> overrideCentro = configuracionRepository.findAll().stream()
                .filter(c -> c.getClave().equals(clave) && 
                            c.getCentroAtencion() != null && 
                            c.getCentroAtencion().getId().equals(centroId))
                .findFirst();
            
            if (overrideCentro.isPresent()) {
                return overrideCentro; // Usar override del centro
            }
        }
        
        // Buscar configuración global (centroAtencion = null)
        return configuracionRepository.findAll().stream()
            .filter(c -> c.getClave().equals(clave) && c.getCentroAtencion() == null)
            .findFirst();
    }

    public int getDiasMinConfirmacion() {
        return findConfiguracionConOverride("turnos.dias_min_confirmacion")
                .map(Configuracion::getValorInt)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("turnos.dias_min_confirmacion", 2,
                            "Mínimo de días de anticipación requeridos para confirmar un turno", "TURNOS");
                    return 2;
                });
    }

    public int getDiasMaxNoConfirm() {
        return findConfiguracionConOverride("turnos.dias_max_no_confirm")
                .map(Configuracion::getValorInt)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("turnos.dias_max_no_confirm", 7,
                            "Máximo de días que un turno puede estar sin confirmar antes de cancelarse automáticamente",
                            "TURNOS");
                    return 7;
                });
    }

    public LocalTime getHoraCorteConfirmacion() {
        String horaStr = findConfiguracionConOverride("turnos.hora_corte_confirmacion")
                .map(Configuracion::getValorString)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("turnos.hora_corte_confirmacion", "00:00",
                            "Hora límite del día para confirmar turnos (formato HH:MM)", "TURNOS");
                    return "00:00";
                });
        return LocalTime.parse(horaStr);
    }

    public boolean isHabilitadaCancelacionAutomatica() {
        return findConfiguracionConOverride("turnos.habilitar_cancelacion_automatica")
                .map(Configuracion::getValorBoolean)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("turnos.habilitar_cancelacion_automatica", true,
                            "Habilita la cancelación automática de turnos no confirmados", "TURNOS");
                    return true;
                });
    }

    /**
     * Restaura todas las configuraciones a sus valores por defecto
     */
    @Transactional
    public void resetToDefaults() {
        Map<String, Object> defaultConfigs = new HashMap<>();
        defaultConfigs.put("turnos.dias_min_confirmacion", 2);
        defaultConfigs.put("turnos.dias_max_no_confirm", 7);
        defaultConfigs.put("turnos.hora_corte_confirmacion", "00:00");
        defaultConfigs.put("turnos.habilitar_cancelacion_automatica", true);
        defaultConfigs.put("turnos.habilitar_recordatorios", true);
        defaultConfigs.put("turnos.dias_recordatorio_confirmacion", 4);
        defaultConfigs.put("turnos.hora_envio_recordatorios", "09:00");
        defaultConfigs.put("notificaciones.habilitar_email", true);
        defaultConfigs.put("notificaciones.habilitar_sms", false);
        defaultConfigs.put("sistema.nombre_clinica", "Clínica Médica");
        defaultConfigs.put("sistema.email_notificaciones", "notificaciones@clinica.com");

        defaultConfigs.forEach((clave, valor) -> {
            actualizarConfiguracion(clave, valor);
        });
    }

    /**
     * Obtiene una configuración específica aplicando override por centro si corresponde.
     * Busca primero override del centro del usuario, luego configuración global.
     * 
     * @param clave La clave de la configuración (e.g., "turnos.dias_max_no_confirm")
     * @return Configuracion o null si no existe
     */
    public Configuracion getConfiguracion(String clave) {
        return findConfiguracionConOverride(clave).orElse(null);
    }

    // === CONFIGURACIONES DE RECORDATORIOS ===

    public boolean isHabilitadosRecordatorios() {
        return findConfiguracionConOverride("turnos.habilitar_recordatorios")
                .map(Configuracion::getValorBoolean)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("turnos.habilitar_recordatorios", true,
                            "Habilita el envío de recordatorios de confirmación", "TURNOS");
                    return true;
                });
    }

    public int getDiasRecordatorioConfirmacion() {
        return findConfiguracionConOverride("turnos.dias_recordatorio_confirmacion")
                .map(Configuracion::getValorInt)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("turnos.dias_recordatorio_confirmacion", 4,
                            "Días de anticipación para enviar recordatorios de confirmación", "TURNOS");
                    return 4;
                });
    }

    public LocalTime getHoraEnvioRecordatorios() {
        String horaStr = findConfiguracionConOverride("turnos.hora_envio_recordatorios")
                .map(Configuracion::getValorString)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("turnos.hora_envio_recordatorios", "09:00",
                            "Hora del día para enviar recordatorios de confirmación (formato HH:MM)", "TURNOS");
                    return "09:00";
                });
        return LocalTime.parse(horaStr);
    }

    // === CONFIGURACIONES DE NOTIFICACIONES ===

    public boolean isHabilitadoEmailNotificaciones() {
        return findConfiguracionConOverride("notificaciones.habilitar_email")
                .map(Configuracion::getValorBoolean)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("notificaciones.habilitar_email", true,
                            "Habilita el envío de notificaciones por email", "NOTIFICACIONES");
                    return true;
                });
    }

    public boolean isHabilitadoSmsNotificaciones() {
        return findConfiguracionConOverride("notificaciones.habilitar_sms")
                .map(Configuracion::getValorBoolean)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("notificaciones.habilitar_sms", false,
                            "Habilita el envío de notificaciones por SMS", "NOTIFICACIONES");
                    return false;
                });
    }

    // === CONFIGURACIONES DE SISTEMA ===

    public String getNombreClinica() {
        return findConfiguracionConOverride("sistema.nombre_clinica")
                .map(Configuracion::getValorString)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("sistema.nombre_clinica", "Clínica Médica",
                            "Nombre de la clínica para usar en notificaciones", "SISTEMA");
                    return "Clínica Médica";
                });
    }

    public String getEmailNotificaciones() {
        return findConfiguracionConOverride("sistema.email_notificaciones")
                .map(Configuracion::getValorString)
                .orElseGet(() -> {
                    crearConfiguracionPorDefecto("sistema.email_notificaciones", "notificaciones@clinica.com",
                            "Email remitente para las notificaciones automáticas", "SISTEMA");
                    return "notificaciones@clinica.com";
                });
    }

    // === MÉTODOS DE GESTIÓN ===

    @Transactional
    public void actualizarConfiguracion(String clave, Object valor) {
        Configuracion config = configuracionRepository.findByClave(clave)
                .orElse(new Configuracion());
        config.setClave(clave); // Establecer la clave si es una nueva configuración

        if (valor instanceof Integer) {
            config.setValorInt((Integer) valor);
            config.setTipoValor("INTEGER");
        } else if (valor instanceof String) {
            config.setValorString((String) valor);
            config.setTipoValor("STRING");
        } else if (valor instanceof Boolean) {
            config.setValorBoolean((Boolean) valor);
            config.setTipoValor("BOOLEAN");
        } else if (valor instanceof Double) {
            config.setValorDouble((Double) valor);
            config.setTipoValor("DOUBLE");
        } else {
            throw new IllegalArgumentException("Tipo de valor no soportado: " + valor.getClass());
        }

        configuracionRepository.save(config);
        System.out.println("Configuración actualizada: " + clave + " = " + valor);
    }

    @Transactional
    private void crearConfiguracionPorDefecto(String clave, Object defaultValue, String descripcion, String categoria) {
        try {
            // Verificar si ya existe para evitar duplicados
            if (configuracionRepository.existsByClave(clave)) {
                return;
            }

            Configuracion config;
            if (defaultValue instanceof Integer) {
                config = new Configuracion(clave, (Integer) defaultValue, descripcion, categoria);
            } else if (defaultValue instanceof String) {
                config = new Configuracion(clave, (String) defaultValue, descripcion, categoria);
            } else if (defaultValue instanceof Boolean) {
                config = new Configuracion(clave, (Boolean) defaultValue, descripcion, categoria);
            } else if (defaultValue instanceof Double) {
                config = new Configuracion(clave, (Double) defaultValue, descripcion, categoria);
            } else {
                System.err.println("No se puede crear configuración por defecto para tipo: " + defaultValue.getClass());
                return;
            }

            configuracionRepository.save(config);
            System.out.println("Configuración creada por defecto: " + clave + " = " + defaultValue);
        } catch (Exception e) {
            System.err.println("Error al crear configuración por defecto: " + e.getMessage());
        }
    }

    public List<Configuracion> getConfiguracionesPorCategoria(String categoria) {
        return configuracionRepository.findByCategoria(categoria);
    }

    // === VALIDACIONES ===

    public void validarConfiguracionesTurnos() {
        int diasMin = getDiasMinConfirmacion();
        int diasMax = getDiasMaxNoConfirm();

        if (diasMin >= diasMax) {
            throw new IllegalStateException(
                    "dias_min_confirmacion (" + diasMin + ") debe ser menor que dias_max_no_confirm (" + diasMax + ")");
        }

        if (diasMin < 1) {
            throw new IllegalStateException("dias_min_confirmacion debe ser al menos 1");
        }

        if (diasMax > 30) {
            System.out.println("ADVERTENCIA: dias_max_no_confirm (" + diasMax + ") es muy alto, considere reducirlo");
        }

        // Validar recordatorios
        if (isHabilitadosRecordatorios()) {
            int diasRecordatorio = getDiasRecordatorioConfirmacion();
            if (diasRecordatorio <= diasMin) {
                System.out.println("ADVERTENCIA: dias_recordatorio_confirmacion (" + diasRecordatorio +
                        ") debería ser mayor que dias_min_confirmacion (" + diasMin + ")");
            }
        }
    }

    public void validarConfiguracionesRecordatorios() {
        if (!isHabilitadosRecordatorios()) {
            return; // No hay nada que validar si están deshabilitados
        }

        int diasRecordatorio = getDiasRecordatorioConfirmacion();
        int diasMax = getDiasMaxNoConfirm();

        if (diasRecordatorio >= diasMax) {
            throw new IllegalStateException(
                    "dias_recordatorio_confirmacion (" + diasRecordatorio +
                            ") debe ser menor que dias_max_no_confirm (" + diasMax + ")");
        }

        // Validar formato de hora
        try {
            getHoraEnvioRecordatorios();
        } catch (Exception e) {
            throw new IllegalStateException("hora_envio_recordatorios tiene formato inválido: " + e.getMessage());
        }
    }

    public Map<String, Object> getResumenConfiguracionTurnos() {
        Map<String, Object> resumen = new ConcurrentHashMap<>();

        resumen.put("dias_min_confirmacion", getDiasMinConfirmacion());
        resumen.put("dias_max_no_confirm", getDiasMaxNoConfirm());
        resumen.put("hora_corte_confirmacion", getHoraCorteConfirmacion().toString());
        resumen.put("cancelacion_automatica_habilitada", isHabilitadaCancelacionAutomatica());

        // Configuraciones de recordatorios
        resumen.put("recordatorios_habilitados", isHabilitadosRecordatorios());
        if (isHabilitadosRecordatorios()) {
            resumen.put("dias_recordatorio", getDiasRecordatorioConfirmacion());
            resumen.put("hora_envio_recordatorios", getHoraEnvioRecordatorios().toString());
        }

        // Configuraciones de notificaciones
        resumen.put("email_habilitado", isHabilitadoEmailNotificaciones());
        resumen.put("sms_habilitado", isHabilitadoSmsNotificaciones());

        return resumen;
    }

    public Map<String, Object> getResumenConfiguracionNotificaciones() {
        Map<String, Object> resumen = new ConcurrentHashMap<>();

        resumen.put("email_habilitado", isHabilitadoEmailNotificaciones());
        resumen.put("sms_habilitado", isHabilitadoSmsNotificaciones());
        resumen.put("nombre_clinica", getNombreClinica());
        resumen.put("email_notificaciones", getEmailNotificaciones());

        return resumen;
    }
}