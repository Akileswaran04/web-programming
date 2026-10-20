import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../auth.jsx";
import MaterialCard, { SkeletonCards, toneFor } from "../MaterialCard.jsx";

export default function HomePage() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/materials", { params: { size: 5 } }).then((r) => setItems(r.data)).catch((e) => setError(errorMessage(e)));
    api.get("/subjects").then((r) => setSubjects(r.data)).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div>
          <p className="kicker">For students, by students</p>
          <h1>Notes that outlive the <span className="ink-mark">semester</span>.</h1>
          <p className="lede">Drop your PDFs on the shelf, find what your seniors left behind, and stop hunting through group chats the night before the exam.</p>
          <div className="hero-cta">
            <Link to="/materials" className="btn">Browse the shelf</Link>
            <Link to={user ? "/upload" : "/register"} className="btn ghost">{user ? "Upload a PDF" : "Create an account"}</Link>
          </div>
        </div>
        <div className="paper-stack" aria-hidden="true">
          <div className="sheet s3" />
          <div className="sheet s2" />
          <div className="sheet s1">
            <b>Unit 3: Normalization</b>
            <i /><i /><i className="short" /><i /><i className="short" />
            <span className="stamp">PDF</span>
          </div>
        </div>
      </section>

      {subjects.length > 0 && (
        <section>
          <h2 className="section-title">Shelves</h2>
          <div className="shelves">
            {subjects.map((s, i) => (
              <Link key={s.id} to={`/materials?subject=${s.id}`} className="shelf" style={{ "--tone": toneFor(s.id), "--i": i }}>
                <span className="spine" />
                <span className="shelf-name">{s.name}</span>
                <span className="shelf-meta">{s.department} · Sem&nbsp;{s.semester}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2 className="section-title">Just added</h2>
          <Link to="/materials" className="more">See everything →</Link>
        </div>
        {error && <p className="error">{error}</p>}
        {!items && !error && <SkeletonCards n={3} />}
        {items?.length === 0 && <p className="empty">The shelf is empty. Be the first to put something on it.</p>}
        {items?.map((m, i) => <MaterialCard key={m.id} m={m} index={i} />)}
      </section>
    </>
  );
}
