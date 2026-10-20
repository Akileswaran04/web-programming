import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import MaterialCard, { SkeletonCards } from "../MaterialCard.jsx";

export default function MyUploadsPage() {
  const fresh = useLocation().state?.fresh;
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/users/me/materials", { params: { size: 100 } }).then((r) => setItems(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  const total = items?.reduce((s, m) => s + m.fileSize, 0) ?? 0;

  return (
    <>
      <div className="page-head">
        <h1>My shelf</h1>
        <Link to="/upload" className="btn">Upload a PDF</Link>
      </div>
      {items && items.length > 0 && (
        <p className="count">{items.length} {items.length === 1 ? "file" : "files"} · {(total / 1048576).toFixed(1)} MB shared</p>
      )}
      {error && <p className="error">{error}</p>}
      {!items && !error && <SkeletonCards n={2} />}
      {items?.length === 0 && <p className="empty">You haven't shared anything yet. Your future juniors are waiting.</p>}
      {items?.map((m, i) => (
        <MaterialCard key={m.id} m={m} index={i} fresh={m.id === fresh} onDeleted={(id) => setItems((xs) => xs.filter((x) => x.id !== id))} />
      ))}
    </>
  );
}
