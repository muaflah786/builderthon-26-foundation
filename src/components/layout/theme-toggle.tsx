"use client";

import { useEffect, useState } from "react";

/** Light (default) / dark switch. Remembered per browser; light if storage is unavailable. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDark(document.documentElement.dataset.theme === "dark"), 0);
    return () => clearTimeout(t);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("ordox-theme", next ? "dark" : "light");
    } catch {
      /* storage blocked: the choice lasts for this page only */
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="border-border hover:bg-muted grid size-9 place-items-center rounded-full border"
    >
      <span className="sr-only">{dark ? "Light theme" : "Dark theme"}</span>
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        {dark ? (
          <path
            d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 17a5 5 0 100-10 5 5 0 000 10z"
            strokeLinecap="round"
          />
        ) : (
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
