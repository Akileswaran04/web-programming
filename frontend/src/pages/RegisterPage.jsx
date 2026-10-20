import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { errorMessage } from "../api.js";
import { toast } from "../effects.jsx";

export default function RegisterPage() {
  const { register, login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const strength = Math.min(4, Math.floor(f.password.length / 3));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(f.name, f.email, f.password);
      await login(f.email, f.password);
      toast("Account created. Welcome aboard.");
      nav("/materials");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form className={`sheet-form narrow ${error ? "shake" : ""}`} key={error} onSubmit={submit}>
      <h1>Make an account</h1>
      <label>Name<input required maxLength={100} autoComplete="name" value={f.name} onChange={set("name")} /></label>
      <label>Email<input type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></label>
      <label><span>Password <small>(8+ characters)</small></span>
        <input type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} />
        <span className="strength" data-s={strength}><i /><i /><i /><i /></span>
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      <p className="hint">Already have one? <Link to="/login">Log in</Link></p>
    </form>
  );
}
