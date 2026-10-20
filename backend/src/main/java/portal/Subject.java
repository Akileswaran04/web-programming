package portal;

import jakarta.persistence.*;

@Entity
@Table(name = "subjects")
public class Subject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String department;
    private Short semester;

    protected Subject() {}

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDepartment() { return department; }
    public Short getSemester() { return semester; }
}
