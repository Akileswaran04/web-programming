package portal;

import portal.Dtos.MaterialResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class MaterialController {
    private final MaterialService service;

    public MaterialController(MaterialService service) {
        this.service = service;
    }

    @GetMapping("/materials")
    public List<MaterialResponse> list(@RequestParam(required = false) Long subjectId,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return service.list(subjectId, page, size);
    }

    @GetMapping("/materials/{id}")
    public MaterialResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping(value = "/materials", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MaterialResponse> upload(@RequestParam String title,
                                                   @RequestParam(required = false) String description,
                                                   @RequestParam Long subjectId,
                                                   @RequestParam("file") MultipartFile file,
                                                   Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.upload(title, description, subjectId, file, auth.getName()));
    }

    @GetMapping("/materials/{id}/download")
    public ResponseEntity<?> download(@PathVariable Long id) {
        var d = service.download(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(d.filename(), StandardCharsets.UTF_8).build().toString())
                .body(d.resource());
    }

    @DeleteMapping("/materials/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        service.delete(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/me/materials")
    public List<MaterialResponse> mine(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size,
                                       Authentication auth) {
        return service.mine(auth.getName(), page, size);
    }
}
