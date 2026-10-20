package portal;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {
    private final SubjectRepository subjects;

    public SubjectController(SubjectRepository subjects) {
        this.subjects = subjects;
    }

    @GetMapping
    public List<Subject> list() {
        return subjects.findAllByOrderByDepartmentAscSemesterAscNameAsc();
    }
}
