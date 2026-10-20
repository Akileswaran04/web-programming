import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { toast } from "../effects.jsx";

const MAX = 10 * 1024 * 1024;

export default function UploadPage() {
  const nav = useNavigate();
  const input = useRef(null);
  const [subjects, setSubjects] = useState([]);
  const [f, setF] = useState({ title: "", description: "", subjectId: "" });
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api.get("/subjects").then((r) => setSubjects(r.data)).catch(() => {}); }, []);

  const choose = (picked) => {
    setError("");
    if (!picked) return;
    if (picked.type !== "application/pdf") return setError("That isn't a PDF. Only PDF files can go on the shelf.");
    if (picked.size > MAX) return setError("That file is over the 10 MB limit.");
    setFile(picked);
    if (!f.title) setF((x) => ({ ...x, title: picked.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ") }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Pick a PDF first.");
    const body = new FormData();
    Object.entries(f).forEach(([k, v]) => body.append(k, v));
    body.append("file", file);
    setError("");
    setProgress(0);
    try {
      const r = await api.post("/materials", body, { onUploadProgress: (p) => p.total && setProgress(p.loaded / p.total) });
      setProgress(1);
      setDone(true);
      toast("Uploaded. It's on the shelf now.");
      setTimeout(() => nav("/my-uploads", { state: { fresh: r.data?.id } }), 750);
    } catch (err) {
      setError(errorMessage(err));
      setProgress(null);
    }
  };

  const busy = progress !== null;
  const kb = file ? (file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`) : "";

  return (
    <form className={`sheet-form upload ${done ? "done" : ""}`} onSubmit={submit}>
      <h1>Put a PDF on the shelf</h1>

      <div
        className={`drop ${drag ? "over" : ""} ${file ? "has-file" : ""}`}
        onClick={() => !busy && input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); !busy && choose(e.dataTransfer.files[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current.click()}
      >
        <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => choose(e.target.files[0])} />
        {file ? (
          <div className="picked">
            <div className="doc big"><span>PDF</span></div>
            <div>
              <b>{file.name}</b>
              <div className="meta"><span>{kb}</span><span>{busy ? "uploading" : "click to swap"}</span></div>
            </div>
          </div>
        ) : (
          <div className="drop-hint">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 27V9m0 0-7 7m7-7 7 7M8 31h24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <b>Drop a PDF here</b>
            <span>or click to pick one · max 10 MB</span>
          </div>
        )}
        {busy && <div className="bar"><i style={{ transform: `scaleX(${progress})` }} /></div>}
      </div>

      <label>Title<input required maxLength={200} value={f.title} onChange={set("title")} disabled={busy} /></label>
      <label>Subject
        <select required value={f.subjectId} onChange={set("subjectId")} disabled={busy}>
          <option value="">Choose a subject…</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} · Sem {s.semester}</option>)}
        </select>
      </label>
      <label><span>Description <small>(optional)</small></span>
        <textarea rows={3} placeholder="What's inside? Which units does it cover?" value={f.description} onChange={set("description")} disabled={busy} />
      </label>
      {error && <p className="error" key={error}>{error}</p>}
      <button className="btn" disabled={busy}>{done ? "Done ✓" : busy ? `Uploading ${Math.round(progress * 100)}%` : "Upload"}</button>
    </form>
  );
}
