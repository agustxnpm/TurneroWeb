package unpsjb.labprog.backend.dto;

/**
 * DTO para asignar un centro de atención a un usuario.
 * Usado exclusivamente por SUPERADMIN en AdminPresenter.
 */
public class AssignCentroRequest {
    
    private Long userId;
    private Integer centroId;

    // Constructors
    public AssignCentroRequest() {
    }

    public AssignCentroRequest(Long userId, Integer centroId) {
        this.userId = userId;
        this.centroId = centroId;
    }

    // Getters and Setters
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getCentroId() {
        return centroId;
    }

    public void setCentroId(Integer centroId) {
        this.centroId = centroId;
    }
}
