# Code Guide: how the Study Material Portal works

Read this before the viva. It explains every file, then follows a request from a button click down to the database, then answers the questions examiners usually ask.

---

## 1. The big picture in three sentences

1. The **frontend** (React, in `frontend/`) is what the user sees. It never touches the database; it only calls URLs that start with `/api`.
2. The **backend** (Spring Boot, in `backend/`) answers those `/api` calls. It checks who you are, validates input, saves data to **PostgreSQL**, and saves PDF files to the `uploads/` folder.
3. The **database** (PostgreSQL) has three tables: `app_users`, `subjects` and `study_materials`. Flyway creates them from the SQL files in `backend/src/main/resources/db/`.

```
 Browser (React)  ──/api JSON──▶  Spring Boot  ──JDBC──▶  PostgreSQL  (rows: users, subjects, materials)
                  ◀── session ──              ──disk──▶  uploads/    (the actual PDF bytes, named <uuid>.pdf)
```

---

## 2. Folder map: every file in one line

```
web_project/
├── README.md                 how to install and run
├── GUIDE.md                  this file
├── e2e_test.py               automated end-to-end test (real browser + DB checks)
├── backend/
│   ├── pom.xml               Maven: Java 21, Spring Boot 3.5, PostgreSQL driver, Flyway
│   └── src/main/
│       ├── java/portal/      ALL backend code, one package (see table below)
│       └── resources/
│           ├── application.properties   DB URL, upload size limit, cookie settings
│           └── db/
│               ├── V1__create_initial_schema.sql   creates the 3 tables
│               └── V2__seed_subjects.sql           inserts the starting subjects
├── frontend/
│   ├── index.html            the single HTML page; React mounts into <div id="root">
│   ├── vite.config.js        dev server; forwards /api to localhost:8080
│   └── src/
│       ├── main.jsx          entry point: wraps App in Router + AuthProvider
│       ├── App.jsx           top bar + the list of routes (which URL shows which page)
│       ├── api.js            one Axios instance; every request goes through it
│       ├── auth.jsx          who is logged in; login(), register(), logout()
│       ├── MaterialCard.jsx  one PDF card: download, delete, particle animation
│       ├── effects.jsx       particle "disintegrate" animation + toast messages
│       ├── mock.js           fake backend for `npm run demo` (no Java/DB needed)
│       ├── index.css         all styling and CSS animations
│       └── pages/            one file per screen
│           ├── HomePage.jsx       hero, subject shelves, latest uploads
│           ├── MaterialsPage.jsx  browse: subject filter + search
│           ├── UploadPage.jsx     drag-and-drop upload with progress bar
│           ├── MyUploadsPage.jsx  "My shelf": your own uploads
│           ├── LoginPage.jsx
│           └── RegisterPage.jsx
└── docs/
    ├── report.html           source of the project report
    ├── build.py              turns report.html into the PDF + zips the code
    └── screenshots/          captured by e2e_test.py, used in the report
```

### Backend files (`backend/src/main/java/portal/`), grouped by job

| Job | File | What to say about it |
|---|---|---|
| Start | `StudyPortalApplication.java` | `main()` starts Spring Boot and the embedded Tomcat on port 8080. |
| **Controllers** (receive HTTP) | `AuthController.java` | `/api/auth/register`, `/login`, `/logout`, `/me`. |
| | `MaterialController.java` | `/api/materials` list, upload, download, delete; `/api/users/me/materials`. |
| | `SubjectController.java` | `/api/subjects` list. |
| **Service** (business rules) | `MaterialService.java` | The heart of the app: validates uploads, checks the PDF bytes, enforces "only owner or admin can delete". |
| | `LocalFileStorageService.java` | Saves, loads and deletes PDF files on disk under random UUID names. |
| **Entities** (= DB tables) | `AppUser.java`, `Subject.java`, `StudyMaterial.java` | Java classes mapped to the tables with JPA annotations (`@Entity`, `@Table`, `@ManyToOne`). |
| **Repositories** (DB queries) | `UserRepository.java`, `SubjectRepository.java`, `MaterialRepository.java` | Interfaces only. Spring Data writes the SQL from method names, e.g. `findByEmail` → `SELECT … WHERE email = ?`. |
| **DTOs** (JSON shapes) | `Dtos.java` | Records for request/response bodies, with validation like `@Email`, `@Size(min = 8)`. Entities are never sent to the browser directly. |
| **Security** | `SecurityConfig.java` | Which URLs are public, BCrypt password hashing, CSRF cookie, return 401 instead of a login page. |
| **Errors** | `GlobalExceptionHandler.java` | Turns any exception into `{"error": "message"}` with the right HTTP status. |

**The layering rule:** Controller → Service → Repository → Database. A controller never talks to the database directly, and a repository never contains business rules.

---

## 3. Follow a request: uploading a PDF

This is the best flow to explain, because it touches every layer.

1. **`pages/UploadPage.jsx` → `choose()`**: the user drops a file. The browser checks it is `application/pdf` and under 10 MB *before* uploading, so the user gets instant feedback.
2. **`UploadPage.jsx` → `submit()`**: builds a `FormData` (title, description, subjectId, file) and calls `api.post("/materials", body, { onUploadProgress })`. `onUploadProgress` drives the progress bar.
3. **`api.js`**: Axios sends the request to `/api/materials`. It automatically copies the `XSRF-TOKEN` cookie into the `X-XSRF-TOKEN` header (CSRF protection).
4. **`vite.config.js`**: in development, Vite forwards `/api/...` to `http://localhost:8080`.
5. **`SecurityConfig.java`**: Spring Security checks the session cookie (are you logged in?) and the CSRF header. If either fails, the request stops with 401/403.
6. **`application.properties`**: `max-file-size=10MB`. Bigger files are rejected here (413).
7. **`MaterialController.upload()`**: reads the form fields and passes them to the service.
8. **`MaterialService.upload()`**:
   - title present and ≤ 200 chars
   - `isPdf()`: the content type must be `application/pdf` **and** the first 5 bytes must be `%PDF-` (so a renamed `.exe` is rejected)
   - subject must exist
9. **`LocalFileStorageService.store()`**: saves the bytes as `uploads/<random-uuid>.pdf`. The user's filename is never used as a path, which prevents path-traversal attacks.
10. **`MaterialRepository.saveAndFlush()`**: inserts the row into `study_materials`. If that fails, the service deletes the file again, so no orphan file is left on disk.
11. The controller returns **201 Created** with the new material as JSON.
12. Back in **`UploadPage.jsx`**, the app navigates to "My shelf" with the new id. **`MyUploadsPage.jsx`** passes `fresh` to that card, so it drops in and glows.

## 4. Follow a request: logging in

1. `LoginPage.jsx` calls `login(email, password)` from `auth.jsx`.
2. `auth.jsx` posts to `/api/auth/login`.
3. `AuthController.login()` calls Spring's `AuthenticationManager`. That loads the user through `SecurityConfig.userDetailsService()` (via `UserRepository.findByEmail`) and compares the password with the BCrypt hash.
4. On success: `request.changeSessionId()` (stops **session fixation**), the login is stored in the HTTP session, and the browser receives an **HttpOnly** session cookie that JavaScript cannot read.
5. Every later request sends that cookie automatically. `GET /api/auth/me` returns the current user, and `auth.jsx` calls it on page load so a refresh keeps you logged in.

## 5. Follow a request: deleting (and the particle effect)

1. `MaterialCard.jsx`: clicking **Delete** shows an inline "Delete for good?" confirmation (state `confirming`).
2. Confirm → `remove()` → `api.delete("/materials/{id}")`.
3. `MaterialService.delete()` checks that you are the uploader **or** an ADMIN; otherwise **403**. It then deletes the row and the file.
4. Only after the server says OK, `effects.jsx` → `disintegrate(cardElement)` runs:
   - measures the card's position on screen
   - creates a full-screen `<canvas>` and fills the card area with ~1,500 small squares in the card's colours
   - clips the real card away from left to right while the squares at that column fly up-right and fade out
   - removes the canvas and animates the card's height to 0 so the list closes the gap
5. The page removes the item from its list (`onDeleted`), and a toast confirms it.

If the user has "reduce motion" turned on in the OS, it fades instead (`prefers-reduced-motion`).

---

## 6. The database

| Table | Key columns | Notes |
|---|---|---|
| `app_users` | `id`, `name`, `email` (UNIQUE), `password_hash`, `role` | `role` is limited to `STUDENT` or `ADMIN` by a CHECK constraint. Only the BCrypt hash is stored, never the password. |
| `subjects` | `id`, `name`, `department`, `semester` | `semester` CHECK 1–12; UNIQUE(name, department, semester). |
| `study_materials` | `id`, `title`, `stored_filename` (UNIQUE), `file_size`, `uploaded_by` → users, `subject_id` → subjects | Foreign keys are `ON DELETE RESTRICT`. Indexes on subject, uploader and `created_at DESC`. |

Relationships: one user has many materials; one subject has many materials.

**Flyway:** on startup it runs any SQL file in `resources/db/` that hasn't run yet (`V1`, then `V2`, …) and records it in the `flyway_schema_history` table. To change the schema, add `V3__something.sql`; never edit an old one.

**`ddl-auto=validate`:** Hibernate does *not* create tables. It only checks that the entities match the real tables, and refuses to start if they don't.

Look at the data yourself:
```
psql -U postgres -d study_portal
SELECT title, file_size FROM study_materials ORDER BY created_at DESC;
```

---

## 7. Questions examiners usually ask

**Why React and Spring Boot separately, instead of one server-rendered app?**
The frontend and backend only agree on the JSON API, so either side can change on its own. The same API could later serve a mobile app.

**Why store PDFs on disk and not in the database?**
Large binary files make the database slow to back up and query. The DB keeps the metadata, which is small and searchable, and the disk keeps the bytes. `stored_filename` links the two.

**How do you stop someone uploading a virus renamed to .pdf?**
`MaterialService.isPdf()` reads the first 5 bytes and requires `%PDF-`. Files are also saved under a random name, never served as HTML, and limited to 10 MB.

**How are passwords stored?**
BCrypt hashes (`$2a$…`), salted and slow by design. Even we cannot read the original password.

**What is CSRF and how do you prevent it?**
Cross-Site Request Forgery is when another website tricks your browser into sending a request with your cookie. Spring puts a random token in an `XSRF-TOKEN` cookie; our JavaScript must echo it in a header, and other sites cannot read our cookies to do that.

**What happens if two people upload the same file name?**
Nothing breaks. Each file gets its own UUID name on disk; `original_filename` is only used for the download name.

**Can a student delete someone else's file?**
No. `MaterialService.delete()` returns 403 unless you are the owner or an ADMIN, and the Delete button only appears on your own cards (`MaterialCard.jsx` → `canDelete`).

**How did you test it?**
`e2e_test.py` opens a real Chromium browser, registers, uploads, filters, downloads, deletes and logs out. After each step it queries PostgreSQL and checks the `uploads/` folder. 13 of 13 checks pass.

**Why the animations?**
Each one gives feedback: the particle effect confirms a permanent delete, the progress bar shows the upload is moving, the shake shows a wrong password. They are plain CSS plus one canvas, with no animation library.

---

## 8. A 3-minute live demo script

1. Home page → point out subject shelves (data from the `subjects` table).
2. Register a new account → show the row in `app_users` in psql (password is a hash).
3. Upload a PDF by dragging it in → progress bar → it lands on "My shelf".
4. Browse → click a subject chip, type in search.
5. Download it.
6. Delete it → particle effect → show in psql that the row is gone.
7. Try uploading a `.txt` → rejected.
