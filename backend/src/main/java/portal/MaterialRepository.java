package portal;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaterialRepository extends JpaRepository<StudyMaterial, Long> {
    Page<StudyMaterial> findBySubjectId(Long subjectId, Pageable pageable);
    Page<StudyMaterial> findByUploadedById(Long userId, Pageable pageable);
}
