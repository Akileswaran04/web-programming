package portal;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "study_materials")
public class StudyMaterial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "stored_filename")
    private String storedFilename;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "file_size")
    private long fileSize;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by")
    private AppUser uploadedBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected StudyMaterial() {}

    public StudyMaterial(String title, String description, String originalFilename, String storedFilename,
                         String filePath, long fileSize, AppUser uploadedBy, Subject subject) {
        this.title = title;
        this.description = description;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.filePath = filePath;
        this.contentType = "application/pdf";
        this.fileSize = fileSize;
        this.uploadedBy = uploadedBy;
        this.subject = subject;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getOriginalFilename() { return originalFilename; }
    public String getStoredFilename() { return storedFilename; }
    public long getFileSize() { return fileSize; }
    public AppUser getUploadedBy() { return uploadedBy; }
    public Subject getSubject() { return subject; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
