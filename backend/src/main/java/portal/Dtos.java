package portal;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public final class Dtos {
    private Dtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 100) String password) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record UserResponse(Long id, String name, String email, String role) {}

    public record MaterialResponse(
            Long id, String title, String description, String originalFilename, long fileSize,
            Long subjectId, String subjectName, Long uploadedById, String uploadedByName,
            OffsetDateTime createdAt) {}
}
