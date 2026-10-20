import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import MaterialCard, { SkeletonCards, toneFor } from "../MaterialCard.jsx";

export default function MaterialsPage() {
  const [params, setParams] = useSearchParams();
  const subjectId = params.get("subject") ?? "";
  const [subjects, setSubjects] = useState([]);
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { api.get("/subjects").then((r) => setSubjects(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    setItems(null);
    setError("");
    api.get("/materials", { params: { subjectId: subjectId || undefined, size: 100 } })
      .then((r) => setItems(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, [subjectId]);

  // ponytail: client-side search over the loaded page (max 100); move to a ?q= query when the shelf outgrows that.
  const needle = q.trim().toLowerCase();
  const shown = items?.filter((m) => !needle || `${m.title} ${m.description ?? ""} ${m.uploadedByName}`.toLowerCase().includes(needle));
  const pick = (id) => setParams(id ? { subject: id } : {});

  return (
    <>
      <div className="page-head">
        <h1>Browse</h1>
        <input className="search" type="search" placeholder="Search titles, descriptions, uploaders…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips" role="tablist">
        <button role="tab" aria-selected={!subjectId} className={`chip ${!subjectId ? "on" : ""}`} onClick={() => pick("")}>All</button>
        {subjects.map((s) => (
          <button key={s.id} role="tab" aria-selected={subjectId === String(s.id)} style={{ "--tone": toneFor(s.id) }}
            className={`chip ${subjectId === String(s.id) ? "on" : ""}`} onClick={() => pick(String(s.id))}>
            {s.name}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {!items && !error && <SkeletonCards n={4} />}
      {shown && <p className="count">{shown.length} {shown.length === 1 ? "file" : "files"}</p>}
      {shown?.length === 0 && <p className="empty">{needle ? `Nothing matches "${q}".` : "Nothing on this shelf yet."}</p>}
      {shown?.map((m, i) => (
        <MaterialCard key={m.id} m={m} index={i} onDeleted={(id) => setItems((xs) => xs.filter((x) => x.id !== id))} />
      ))}
    </>
  );
}
