package unpsjb.labprog.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;

import unpsjb.labprog.backend.business.service.UserService;

/**
 * Configuración de seguridad con JWT y autenticación stateless
 * 
 * CONTROL DE ACCESO BASADO EN ROLES:
 * =================================
 * - ADMINISTRADOR: Acceso completo al sistema, gestión de usuarios, auditoría
 * - OPERADOR: Gestión de turnos, pacientes, médicos, obras sociales
 * - MEDICO: Dashboard médico, horarios, estadísticas, perfil
 * - PACIENTE: Dashboard paciente, agenda, notificaciones, perfil
 * 
 * MODO DE DESARROLLO vs PRODUCCIÓN:
 * ================================
 * Para alternar entre modos usar cualquiera de estas opciones:
 * 
 * 1. Variable de entorno:
 * export SECURITY_DEV_MODE=false
 * 
 * 2. Parámetro JVM al ejecutar:
 * java -Dsecurity.dev.mode=false -jar app.jar
 * 
 * 3. En application.properties:
 * security.dev.mode=false
 * 
 * 4. Modificar directamente la anotación @Value en esta clase
 * 
 * - devMode=true: DESARROLLO - Todos los endpoints públicos
 * - devMode=false: PRODUCCIÓN - Control de roles aplicado
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // Habilita @PreAuthorize en controladores
public class SecurityConfig {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * Configuración del encoder de contraseñas
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configuración del proveedor de autenticación
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Configuración del manager de autenticación
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Configuración de la jerarquía de roles para Spring Security
     * Permite que roles superiores hereden permisos de roles inferiores
     * 
     * Jerarquía:
     * - ADMINISTRADOR: incluye todos los permisos (MEDICO, OPERADOR, PACIENTE)
     * - MEDICO: incluye permisos de PACIENTE
     * - OPERADOR: incluye permisos de PACIENTE  
     * - PACIENTE: permisos básicos
     * 
     * Nota: MEDICO y OPERADOR son roles independientes, no hay herencia entre ellos.
     * 
     * Esto permite que un ADMINISTRADOR acceda a endpoints marcados con hasRole("PACIENTE")
     * sin necesidad de validaciones manuales adicionales.
     */
    @Bean
    public RoleHierarchy roleHierarchy() {
        RoleHierarchyImpl roleHierarchy = new RoleHierarchyImpl();
        // Definir jerarquía: ADMINISTRADOR incluye todos, MEDICO y OPERADOR incluyen PACIENTE
        roleHierarchy.setHierarchy(
            "ROLE_ADMINISTRADOR > ROLE_MEDICO\n" +
            "ROLE_ADMINISTRADOR > ROLE_OPERADOR\n" +
            "ROLE_ADMINISTRADOR > ROLE_PACIENTE\n" +
            "ROLE_MEDICO > ROLE_PACIENTE\n" +
            "ROLE_OPERADOR > ROLE_PACIENTE"
        );
        return roleHierarchy;
    }

    /**
     * Variable para controlar el modo de seguridad
     * - true: Modo desarrollo (todos los endpoints públicos)
     * - false: Modo producción (control de roles aplicado)
     * 
     * Para cambiar el modo:
     * 1. Variable de entorno: SECURITY_DEV_MODE=false
     * 2. Parámetro JVM: -Dsecurity.dev.mode=false
     * 3. Modificar application.properties: security.dev.mode=false
     */
    @Value("${security.dev.mode:true}")
    private boolean devMode;

    /**
     * Configuración de la cadena de filtros de seguridad
     * 
     * MODO DESARROLLO (devMode=true):
     * - Todos los endpoints son públicos para facilitar desarrollo
     * 
     * MODO PRODUCCIÓN (devMode=false):
     * - Control de acceso basado en roles JWT
     * - Seguridad completa aplicada según roles del sistema
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    if (devMode) {
                        // =================================
                        // MODO DESARROLLO - ACCESO LIBRE
                        // =================================
                        auth.anyRequest().permitAll();
                    } else {
                        // =================================
                        // MODO PRODUCCIÓN - CONTROL DE ROLES
                        // =================================

                        // ========== ENDPOINTS PÚBLICOS ==========
                        auth
                                // Autenticación y recuperación de contraseñas
                                .requestMatchers("/api/auth/**").permitAll()
                                // Auto-registro de pacientes (público)
                                .requestMatchers("/registro-usuario").permitAll()
                                // Activación de cuentas
                                .requestMatchers("/activate-account").permitAll()
                                // Consulta pública de turnos disponibles (sin información sensible)
                                .requestMatchers(HttpMethod.GET, "/agenda/publica").permitAll()

                                // ========== ENDPOINTS SOLO ADMINISTRADOR ==========
                                // Rutas que requieren AdminGuard en el frontend
                                .requestMatchers("/turnos/advanced-search/**").hasRole("ADMINISTRADOR")
                                .requestMatchers("/turnos/audit-dashboard/**").hasRole("ADMINISTRADOR")
                                .requestMatchers("/turnos/{id}/edit").hasRole("ADMINISTRADOR")
                                .requestMatchers("/especialidades/**").hasRole("ADMINISTRADOR")
                                .requestMatchers("/admin-dashboard/**").hasRole("ADMINISTRADOR")
                                .requestMatchers("/admin-perfil/**").hasRole("ADMINISTRADOR")
                                // Gestión de administradores (solo admin puede gestionar otros admins)
                                .requestMatchers("/api/admins/**").hasRole("ADMINISTRADOR")
                                // Creación de operadores (solo admin puede crear otros operadores)
                                .requestMatchers("/operadores/create-by-admin").hasRole("ADMINISTRADOR")

                                // ========== ENDPOINTS SOLO PACIENTE ==========
                                // Rutas que requieren PatientGuard en el frontend
                                .requestMatchers("/paciente-dashboard/**").hasRole("PACIENTE")
                                .requestMatchers("/paciente-agenda/**").hasRole("PACIENTE")
                                .requestMatchers("/paciente-notificaciones/**").hasRole("PACIENTE")
                                .requestMatchers("/paciente-perfil/**").hasRole("PACIENTE")
                                .requestMatchers("/paciente-reagendar-turno/**").hasRole("PACIENTE")

                                // ========== ENDPOINTS SOLO MÉDICO ==========
                                // Rutas que requieren MedicoGuard en el frontend
                                .requestMatchers("/medico-dashboard/**").hasRole("MEDICO")
                                .requestMatchers("/medico-horarios/**").hasRole("MEDICO")
                                .requestMatchers("/medico-estadisticas/**").hasRole("MEDICO")
                                .requestMatchers("/medico-perfil/**").hasRole("MEDICO")

                                // ========== ENDPOINTS SOLO OPERADOR ==========
                                // Rutas que requieren OperadorGuard en el frontend
                                .requestMatchers("/operador-dashboard/**").hasRole("OPERADOR")
                                .requestMatchers("/operador-agenda/**").hasRole("OPERADOR")
                                .requestMatchers("/operador-perfil/**").hasRole("OPERADOR")

                                // ========== ENDPOINTS ADMIN + OPERADOR ==========
                                // Rutas que requieren AdminOperadorGuard en el frontend
                                .requestMatchers("/turnos/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/agenda/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/pacientes/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/obraSocial/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/centrosAtencion/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/consultorios/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/medicos/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/staffMedico/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/disponibilidades-medico/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/esquema-turno/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")
                                .requestMatchers("/operadores/**").hasAnyRole("OPERADOR", "ADMINISTRADOR")


                                // ========== NUEVA REGLA PARA CONFIGURACIONES ==========
                                // Rutas para la pantalla de configuración (/rest/config/**)
                                .requestMatchers("/config/**").hasAnyRole("ADMINISTRADOR", "OPERADOR")

                                // ========== ENDPOINTS CON AUTENTICACIÓN GENERAL ==========
                                // Endpoints de utilidad que requieren estar logueado
                                .requestMatchers("/roles/**").authenticated()
                                .requestMatchers("/debug/tokens").authenticated()

                                // ========== RESTO DE ENDPOINTS ==========
                                // Cualquier otro endpoint requiere autenticación
                                .anyRequest().authenticated();
                    }
                })
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

}
