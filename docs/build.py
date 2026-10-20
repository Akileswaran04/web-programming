"""
Builds the submission files into ../submission/:
  <TEAM>_StudyMaterialPortal_Report.pdf      (from docs/report.html, via headless Chromium)
  <TEAM>_StudyMaterialPortal_SourceCode.zip  (project without node_modules/target/uploads/dist)
The presentation .pptx is edited directly in PowerPoint.

Usage: py -3.12 docs/build.py [TeamNo]      e.g.  py -3.12 docs/build.py Team07
"""
import sys, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

TEAM = sys.argv[1] if len(sys.argv) > 1 else "TeamXX"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "submission"
OUT.mkdir(exist_ok=True)
NAME = f"{TEAM}_StudyMaterialPortal"
SKIP = {"node_modules", "target", "uploads", "dist", "submission", ".git", ".idea", "__pycache__"}

html = (ROOT / "docs" / "report.html").read_text(encoding="utf-8").replace("TeamXX", TEAM)
tmp = ROOT / "docs" / "_report_build.html"
tmp.write_text(html, encoding="utf-8")
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page()
    page.goto(tmp.as_uri(), wait_until="networkidle")
    page.pdf(path=OUT / f"{NAME}_Report.pdf", format="A4", print_background=True, display_header_footer=True,
             header_template="<span></span>",
             footer_template='<div style="width:100%;font:8px Arial;color:#888;text-align:center"><span class="pageNumber"></span></div>',
             margin={"top": "20mm", "bottom": "20mm", "left": "20mm", "right": "18mm"})
    b.close()
tmp.unlink()

with zipfile.ZipFile(OUT / f"{NAME}_SourceCode.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(ROOT.rglob("*")):
        rel = f.relative_to(ROOT)
        if f.is_file() and not SKIP.intersection(rel.parts) and f.name != "_report_build.html":
            z.write(f, Path(NAME) / rel)

for f in sorted(OUT.iterdir()):
    print(f"{f.stat().st_size / 1024:8.0f} KB  {f.name}")
