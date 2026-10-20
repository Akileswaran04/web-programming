import { useEffect, useState } from "react";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Peels an element away left-to-right into drifting particles, then collapses the gap it leaves.
 * Resolves when the element is visually gone, so the caller can drop it from state.
 */
export async function disintegrate(el) {
  const r = el.getBoundingClientRect();
  const collapse = () =>
    el.animate(
      [{ height: `${r.height}px`, marginBottom: getComputedStyle(el).marginBottom }, { height: "0px", marginBottom: "0px", paddingTop: 0, paddingBottom: 0 }],
      { duration: 260, easing: "ease-in", fill: "forwards" }
    ).finished;

  if (reduced()) {
    await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: "forwards" }).finished;
    return collapse();
  }

  const css = getComputedStyle(el);
  const palette = [css.backgroundColor, css.backgroundColor, css.borderTopColor, css.color, css.getPropertyValue("--tone").trim() || css.color];
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  // ponytail: ~1-2k particles on a 5px grid, fine for one card; switch to WebGL if you ever blow up whole pages.
  const sweep = 520, life = 900, step = 5;
  const ps = [];
  for (let y = 0; y < r.height; y += step)
    for (let x = 0; x < r.width; x += step)
      ps.push({
        x: r.left + x, y: r.top + y,
        vx: 0.6 + Math.random() * 2.2, vy: -(0.4 + Math.random() * 1.6),
        born: (x / r.width) * sweep + Math.random() * 90,
        size: 1.5 + Math.random() * 2.5,
        c: palette[(Math.random() * palette.length) | 0],
      });

  el.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 0 100%)" }], { duration: sweep + 60, easing: "linear", fill: "forwards" });

  await new Promise((done) => {
    const t0 = performance.now();
    const frame = (now) => {
      const t = now - t0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of ps) {
        const age = t - p.born;
        if (age < 0) continue;
        const k = age / life;
        if (k >= 1) continue;
        const wobble = Math.sin((p.y + age) * 0.02) * 0.6;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x + p.vx * age * 0.06 + wobble * k * 10, p.y + p.vy * age * 0.06 - k * k * 30, p.size, p.size);
      }
      if (t < sweep + 90 + life) requestAnimationFrame(frame);
      else done();
    };
    requestAnimationFrame(frame);
  });
  canvas.remove();
  return collapse();
}

/** Fire-and-forget toast: toast("Saved") or toast("Nope", "error"). */
export const toast = (text, kind = "ok") => window.dispatchEvent(new CustomEvent("toast", { detail: { text, kind } }));

export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let id = 0;
    const add = (e) => {
      const t = { ...e.detail, id: ++id };
      setItems((xs) => [...xs, t]);
      setTimeout(() => setItems((xs) => xs.map((x) => (x.id === t.id ? { ...x, leaving: true } : x))), 3200);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3600);
    };
    window.addEventListener("toast", add);
    return () => window.removeEventListener("toast", add);
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind} ${t.leaving ? "leaving" : ""}`}>{t.text}</div>
      ))}
    </div>
  );
}
