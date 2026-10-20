package portal;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LocalFileStorageService {
    private final Path root;

    public LocalFileStorageService(@Value("${app.upload.dir}") String dir) throws IOException {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    /** Saves the file under a server-generated name and returns that name. */
    public String store(MultipartFile file) throws IOException {
        String name = UUID.randomUUID() + ".pdf";
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        }
        return name;
    }

    public Path pathOf(String storedName) {
        return root.resolve(storedName);
    }

    public Resource load(String storedName) {
        return new PathResource(pathOf(storedName));
    }

    public void delete(String storedName) {
        try {
            Files.deleteIfExists(pathOf(storedName));
        } catch (IOException ignored) {
            // orphaned file is harmless; DB row is the source of truth
        }
    }
}
