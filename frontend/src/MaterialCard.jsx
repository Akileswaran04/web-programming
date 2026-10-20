import { useRef, useState } from "react";
import { useAuth } from "./auth.jsx";
import api, { errorMessage } from "./api.js";
import { disintegrate, toast } from "./effects.jsx";

const TONES = ["#b5562f", "#5b7a5a", "#3f5f7f", "#a0802a", "#7a4f6d", "#4f6f6f"];
export const toneFor = (subjectId) => TONES[(subjectId ?? 0) % TONES.length];

const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const ago = (iso) => {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function MaterialCard({ m, index = 0, onDeleted, fresh }) {
  const { user } = useAuth();
  const el = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const canDelete = onDeleted && user && (user.id === m.uploadedById || user.role === "ADMIN");

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/materials/${m.id}`);
      await disintegrate(el.current);
      onDeleted(m.id);
      toast(`"${m.title}" deleted`);
    } catch (e) {
      setBusy(false);
      setConfirming(false);
      toast(errorMessage(e), "error");
    }
  };

  return (
    <article ref={el} className={`card ${fresh ? "fresh" : ""}`} style={{ "--tone": toneFor(m.subjectId), "--i": index }}>
      <div className="doc" aria-hidden="true">
        <span>PDF</span>
      </div>
      <div className="card-body">
        <div className="subject">{m.subjectName}</div>
        <h3>{m.title}</h3>
        {m.description && <p className="desc">{m.description}</p>}
        <div className="meta">
          <span>{m.uploadedByName}</span>
          <span>{size(m.fileSize)}</span>
          <span title={new Date(m.createdAt).toLocaleString()}>{ago(m.createdAt)}</span>
        </div>
      </div>
      <div className="card-actions">
        {confirming ? (
          <div className="confirm">
            <span>Delete for good?</span>
            <button className="btn danger sm" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete"}</button>
            <button className="btn ghost sm" disabled={busy} onClick={() => setConfirming(false)}>Keep</button>
          </div>
        ) : (
          <>
            {user ? (
              <a className="btn sm download" href={`/api/materials/${m.id}/download`} download>
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M3 13h10" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
                Download
              </a>
            ) : (
              <span className="hint">Log in to download</span>
            )}
            {canDelete && <button className="btn ghost sm" onClick={() => setConfirming(true)}>Delete</button>}
          </>
        )}
      </div>
    </article>
  );
}

export function SkeletonCards({ n = 3 }) {
  return Array.from({ length: n }, (_, i) => (
    <div key={i} className="card skeleton" aria-hidden="true">
      <div className="doc" />
      <div className="card-body"><i /><i /><i /></div>
    </div>
  ));
}
