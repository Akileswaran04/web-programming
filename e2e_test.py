"""
End-to-end test: real browser -> React (Vite) -> Spring Boot -> PostgreSQL + disk.

Prereqs: backend on :8080, frontend dev server on :5173, Playwright for Python (`pip install playwright`).
Run:  DB_PASSWORD=... py -3.12 e2e_test.py
Screenshots land in docs/screenshots/ (used by the report).
"""
import os, re, subprocess, sys, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent
BASE = os.environ.get("BASE_URL", "http://localhost:5173")
SHOTS = ROOT / "docs" / "screenshots"
UPLOADS = Path(os.environ.get("UPLOAD_DIR", ROOT / "backend" / "uploads"))
SHOTS.mkdir(parents=True, exist_ok=True)

stamp = str(int(time.time()))
EMAIL, PASSWORD, NAME = f"e2e{stamp}@college.edu", "secret-pass-1", "Asha Raman"
TITLE = f"DBMS Unit 2 Notes {stamp}"
TMP = Path(tempfile.mkdtemp())
PDF = TMP / "sample.pdf"
PDF.write_bytes(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n" + b"%" * 40000)
FAKE = TMP / "not_a_pdf.txt"
FAKE.write_text("hello")

results = []


def step(name):
    def wrap(fn):
        try:
            fn()
            results.append((name, "PASS", ""))
            print(f"  PASS  {name}")
        except Exception as e:  # keep going so the report shows every step
            results.append((name, "FAIL", str(e).splitlines()[0][:160]))
            print(f"  FAIL  {name}: {e}")
    return wrap


def sql(q):
    env = {**os.environ, "PGPASSWORD": os.environ["DB_PASSWORD"]}
    out = subprocess.run(["psql", "-U", os.environ.get("DB_USERNAME", "postgres"), "-h", "localhost", "-d", "study_portal",
                          "-w", "-tA", "-c", q], env=env, capture_output=True, text=True, check=True)
    return out.stdout.strip()


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 860}, accept_downloads=True)
    page = ctx.new_page()
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    @step("Home page loads with subjects from DB")
    def _():
        page.goto(BASE + "/")
        expect(page.locator(".shelf").first).to_be_visible()
        n = int(sql("select count(*) from subjects"))
        assert page.locator(".shelf").count() == n, f"UI shows {page.locator('.shelf').count()} shelves, DB has {n}"
        page.wait_for_timeout(1200)
        page.screenshot(path=SHOTS / "01_home.png", full_page=True)

    @step("Protected route redirects anonymous user to login")
    def _():
        page.goto(BASE + "/upload")
        expect(page).to_have_url(BASE + "/login")

    @step("Register creates a row in app_users with a bcrypt hash")
    def _():
        page.goto(BASE + "/register")
        page.fill("input[autocomplete=name]", NAME)
        page.fill("input[type=email]", EMAIL)
        page.fill("input[type=password]", PASSWORD)
        page.screenshot(path=SHOTS / "02_register.png")
        page.click("button:has-text('Create account')")
        expect(page).to_have_url(BASE + "/materials")
        row = sql(f"select name, role, left(password_hash, 4) from app_users where email = '{EMAIL}'")
        assert row == f"{NAME}|STUDENT|$2a$", row

    @step("Duplicate registration is rejected (409)")
    def _():
        r = ctx.request.post(BASE + "/api/auth/register", data={"name": "X", "email": EMAIL, "password": "whatever123"},
                             headers={"X-XSRF-TOKEN": next(c["value"] for c in ctx.cookies() if c["name"] == "XSRF-TOKEN")})
        assert r.status == 409, r.status

    @step("Non-PDF upload is rejected in the UI")
    def _():
        page.goto(BASE + "/upload")
        page.set_input_files("input[type=file]", str(FAKE))
        expect(page.locator(".error")).to_contain_text("isn't a PDF")

    @step("Upload PDF stores metadata in DB and file on disk")
    def _():
        page.goto(BASE + "/upload")
        page.set_input_files("input[type=file]", str(PDF))
        page.fill("label:has-text('Title') input", TITLE)
        page.select_option("select", label="Database Management Systems · Sem 4")
        page.fill("textarea", "Normalization, functional dependencies, 1NF to BCNF.")
        page.wait_for_timeout(600)
        page.screenshot(path=SHOTS / "03_upload.png")
        page.click("button:has-text('Upload')")
        expect(page).to_have_url(BASE + "/my-uploads", timeout=10000)
        expect(page.locator(".card", has_text=TITLE)).to_be_visible()
        stored = sql(f"select stored_filename from study_materials where title = '{TITLE}'")
        assert stored.endswith(".pdf"), stored
        assert (UPLOADS / stored).read_bytes()[:5] == b"%PDF-", "file missing on disk"
        page.wait_for_timeout(1500)
        page.screenshot(path=SHOTS / "04_my_shelf.png", full_page=True)

    @step("Browse: subject filter and search narrow the list")
    def _():
        page.goto(BASE + "/materials")
        page.click(".chip:has-text('Database Management Systems')")
        expect(page).to_have_url(re.compile(r"subject=\d+"))
        expect(page.locator(".card", has_text=TITLE)).to_be_visible()
        page.fill(".search", stamp)
        expect(page.locator(".card")).to_have_count(1)
        page.fill(".search", "")
        page.wait_for_timeout(800)
        page.screenshot(path=SHOTS / "05_browse.png", full_page=True)

    @step("Download returns the original PDF")
    def _():
        with page.expect_download() as d:
            page.locator(".card", has_text=TITLE).locator("a:has-text('Download')").click()
        path = d.value.path()
        assert Path(path).read_bytes()[:5] == b"%PDF-"
        assert d.value.suggested_filename == "sample.pdf", d.value.suggested_filename

    @step("Delete: confirm, particle animation, DB row and file removed")
    def _():
        stored = sql(f"select stored_filename from study_materials where title = '{TITLE}'")
        page.goto(BASE + "/my-uploads")
        card = page.locator(".card", has_text=TITLE)
        card.locator("button:has-text('Delete')").click()
        page.screenshot(path=SHOTS / "06_delete_confirm.png")
        card.locator(".confirm button:has-text('Delete')").click()
        page.wait_for_timeout(550)
        page.screenshot(path=SHOTS / "07_delete_particles.png")
        expect(page.locator(".card", has_text=TITLE)).to_have_count(0, timeout=5000)
        assert sql(f"select count(*) from study_materials where title = '{TITLE}'") == "0"
        assert not (UPLOADS / stored).exists(), "file still on disk"

    @step("Logout ends the session")
    def _():
        page.click("button:has-text('Log out')")
        assert ctx.request.get(BASE + "/api/auth/me").status == 401

    @step("Wrong password shows an error")
    def _():
        page.goto(BASE + "/login")
        page.fill("input[type=email]", EMAIL)
        page.fill("input[type=password]", "wrong-password")
        page.click("button:has-text('Log in')")
        expect(page.locator(".error")).to_contain_text("Invalid email or password")
        page.screenshot(path=SHOTS / "08_login_error.png")

    @step("Mobile layout renders without horizontal scroll")
    def _():
        m = browser.new_page(viewport={"width": 390, "height": 844})
        m.goto(BASE + "/")
        m.wait_for_timeout(1200)
        assert m.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        m.screenshot(path=SHOTS / "09_mobile.png")

    @step("No uncaught JavaScript errors")
    def _():
        assert not page_errors, page_errors

    sql(f"delete from app_users where email = '{EMAIL}'")
    browser.close()

(SHOTS.parent / "e2e_results.txt").write_text("\n".join(f"{s}\t{n}\t{d}" for n, s, d in results))
failed = [r for r in results if r[1] == "FAIL"]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
