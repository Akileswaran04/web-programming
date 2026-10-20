import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { errorMessage } from "../api.js";
import { toast } from "../effects.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(f.email, f.password);
      toast(`Welcome back${u?.name ? `, ${u.name.split(" ")[0]}` : ""}.`);
      nav("/materials");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form className={`sheet-form narrow ${error ? "shake" : ""}`} key={error} onSubmit={submit}>
      <h1>Log in</h1>
      <label>Email<input type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Checking…" : "Log in"}</button>
      <p className="hint">New here? <Link to="/register">Make an account</Link></p>
    </form>
  );
}
