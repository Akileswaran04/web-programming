package portal;

import portal.Dtos.MaterialResponse;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MaterialService {
    private final MaterialRepository materials;
    private final SubjectRepository subjects;
    private final UserRepository users;
    private final LocalFileStorageService storage;

    public MaterialService(MaterialRepository materials, SubjectRepository subjects,
                           UserRepository users, LocalFileStorageService storage) {
        this.materials = materials;
        this.subjects = subjects;
        this.users = users;
        this.storage = storage;
    }

    public record Download(Resource resource, String filename) {}

    private static Pageable page(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private static ResponseStatusException status(HttpStatus s, String msg) {
        return new ResponseStatusException(s, msg);
    }

    private static MaterialResponse toResponse(StudyMaterial m) {
        return new MaterialResponse(m.getId(), m.getTitle(), m.getDescription(), m.getOriginalFilename(),
                m.getFileSize(), m.getSubject().getId(), m.getSubject().getName(),
                m.getUploadedBy().getId(), m.getUploadedBy().getName(), m.getCreatedAt());
    }

    private StudyMaterial find(Long id) {
        return materials.findById(id).orElseThrow(() -> status(HttpStatus.NOT_FOUND, "Material not found"));
    }

    @Transactional(readOnly = true)
    public List<MaterialResponse> list(Long subjectId, int page, int size) {
        var result = subjectId == null
                ? materials.findAll(page(page, size))
                : materials.findBySubjectId(subjectId, page(page, size));
        return result.map(MaterialService::toResponse).getContent();
    }

    @Transactional(readOnly = true)
    public List<MaterialResponse> mine(String email, int page, int size) {
        AppUser u = users.findByEmail(email).orElseThrow();
        return materials.findByUploadedById(u.getId(), page(page, size))
                .map(MaterialService::toResponse).getContent();
    }

    @Transactional(readOnly = true)
    public MaterialResponse get(Long id) {
        return toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public Download download(Long id) {
        StudyMaterial m = find(id);
        return new Download(storage.load(m.getStoredFilename()), m.getOriginalFilename());
    }

    @Transactional
    public MaterialResponse upload(String title, String description, Long subjectId,
                                   MultipartFile file, String email) {
        if (title == null || title.isBlank() || title.length() > 200) {
            throw status(HttpStatus.BAD_REQUEST, "Title is required (max 200 characters)");
        }
        if (file == null || file.isEmpty()) {
            throw status(HttpStatus.BAD_REQUEST, "A PDF file is required");
        }
        if (!isPdf(file)) {
            throw status(HttpStatus.BAD_REQUEST, "Only PDF files are allowed");
        }
        var subject = subjects.findById(subjectId)
                .orElseThrow(() -> status(HttpStatus.BAD_REQUEST, "Unknown subject"));
        AppUser user = users.findByEmail(email).orElseThrow();

        String stored;
        try {
            stored = storage.store(file);
        } catch (IOException e) {
            throw status(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save file");
        }
        try {
            String original = file.getOriginalFilename() == null ? "material.pdf"
                    : java.nio.file.Path.of(file.getOriginalFilename()).getFileName().toString();
            StudyMaterial m = new StudyMaterial(title.trim(), description, original, stored,
                    storage.pathOf(stored).toString(), file.getSize(), user, subject);
            return toResponse(materials.saveAndFlush(m));
        } catch (RuntimeException e) {
            storage.delete(stored); // don't leave an orphan file if the DB write fails
            throw e;
        }
    }

    @Transactional
    public void delete(Long id, String email) {
        StudyMaterial m = find(id);
        AppUser user = users.findByEmail(email).orElseThrow();
        if (!m.getUploadedBy().getId().equals(user.getId()) && !"ADMIN".equals(user.getRole())) {
            throw status(HttpStatus.FORBIDDEN, "You can only delete your own uploads");
        }
        materials.delete(m);
        storage.delete(m.getStoredFilename());
    }

    /** Checks the declared type and the %PDF- magic bytes; the client-sent type alone is not trusted. */
    private static boolean isPdf(MultipartFile file) {
        if (!"application/pdf".equalsIgnoreCase(file.getContentType())) return false;
        try (InputStream in = file.getInputStream()) {
            return new String(in.readNBytes(5), StandardCharsets.US_ASCII).equals("%PDF-");
        } catch (IOException e) {
            return false;
        }
    }
}
