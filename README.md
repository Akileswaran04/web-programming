# Study Material Portal

React (Vite) + Spring Boot 3.5 + PostgreSQL. Students register, upload PDFs, browse by subject, search, download, and delete their own uploads.

## Prerequisites
JDK 21, Maven 3.9+, Node 20+, PostgreSQL 17.

## Run
1. Create the database: `createdb -U postgres study_portal`
2. Backend (PowerShell):
   ```
   cd backend
   $env:DB_PASSWORD = "your-postgres-password"
   mvn spring-boot:run
   ```
   Flyway creates the tables and seeds subjects on first start. Uploads go to `backend/uploads` (override with `UPLOAD_DIR`).
3. Frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Open http://localhost:5173. Vite proxies `/api` to `localhost:8080`, so no CORS setup is needed.

UI only, no backend: `npm run demo` (in-memory mock API, log in as `demo@example.com` / `password123`).

## End-to-end test
With backend and frontend running:
```
pip install playwright
$env:DB_PASSWORD = "your-postgres-password"
py e2e_test.py
```
Drives a real browser through register → upload → filter/search → download → delete → logout, and checks PostgreSQL and the upload folder after each step. Screenshots go to `docs/screenshots/`.

## Submission files
`py docs/build.py Team07` renders `docs/report.html` to `submission/Team07_StudyMaterialPortal_Report.pdf` and zips the source. Fill in names and register numbers at the top of `docs/report.html` first.

## Notes
- Auth: server session cookie (HttpOnly) + CSRF cookie/header (Axios handles the header automatically).
- Uploads: PDF only, max 10 MB, content type and `%PDF-` magic bytes checked, stored under a random server-generated name.
- Make an admin: `UPDATE app_users SET role = 'ADMIN' WHERE email = '...';`
- Only upload materials you have permission to share.
