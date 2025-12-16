package unpsjb.labprog.backend.exception;

import java.util.List;

/**
 * Excepción específica para indicar solapamientos de turnos.
 * Contiene una lista con la información mínima de los turnos en conflicto
 * para que el frontend pueda mostrar detalles y solicitar confirmación.
 */
public class OverlapException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final List<Object> conflicts;

    public OverlapException(String message, List<Object> conflicts) {
        super(message);
        this.conflicts = conflicts;
    }

    public List<Object> getConflicts() {
        return conflicts;
    }
}
