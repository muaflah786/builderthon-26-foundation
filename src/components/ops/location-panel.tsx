"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type Pos = {
  memberId: string;
  name: string;
  teamName: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string;
  me: boolean;
};

const TILE = 256;
const HEIGHT = 300;

function project(lat: number, lng: number, z: number) {
  const scale = TILE * 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale,
  };
}

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

/** OpenStreetMap tiles + markers, no map library. Shows only real shared positions. */
function TileMap({ points }: { points: Pos[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  let z = 17;
  for (; z > 2; z--) {
    const ps = points.map((p) => project(p.lat, p.lng, z));
    const w = Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x));
    const h = Math.max(...ps.map((p) => p.y)) - Math.min(...ps.map((p) => p.y));
    if (w < width - 80 && h < HEIGHT - 80) break;
  }
  const ps = points.map((p) => ({ p, ...project(p.lat, p.lng, z) }));
  const cx = (Math.max(...ps.map((q) => q.x)) + Math.min(...ps.map((q) => q.x))) / 2;
  const cy = (Math.max(...ps.map((q) => q.y)) + Math.min(...ps.map((q) => q.y))) / 2;
  const left = cx - width / 2;
  const top = cy - HEIGHT / 2;
  const tiles: Array<{ x: number; y: number }> = [];
  const max = 2 ** z;
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + HEIGHT) / TILE); ty++) {
      if (ty >= 0 && ty < max) tiles.push({ x: tx, y: ty });
    }
  }

  return (
    <div
      ref={ref}
      className="border-border bg-muted relative overflow-hidden rounded-2xl border"
      style={{ height: HEIGHT }}
      role="img"
      aria-label={`Map with ${points.length} shared ${points.length === 1 ? "location" : "locations"}`}
    >
      {tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${t.x}-${t.y}`}
          src={`https://tile.openstreetmap.org/${z}/${((t.x % max) + max) % max}/${t.y}.png`}
          alt=""
          width={TILE}
          height={TILE}
          loading="lazy"
          className="absolute max-w-none select-none"
          style={{ left: t.x * TILE - left, top: t.y * TILE - top }}
        />
      ))}
      {ps.map(({ p, x, y }) => (
        <div
          key={p.memberId}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: x - left, top: y - top }}
          title={`${p.name}, updated ${ago(p.updatedAt)}`}
        >
          <div
            className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap shadow ${p.me ? "bg-brand text-white" : "bg-primary text-primary-foreground"}`}
          >
            {p.me ? "You" : p.name}
          </div>
          <div className={`mx-auto size-2 rotate-45 ${p.me ? "bg-brand" : "bg-primary"} -mt-1`} />
        </div>
      ))}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="bg-background/80 absolute right-1 bottom-1 rounded px-1 text-[10px]"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}

/**
 * Voluntary live location: nothing is read until the person taps "Start sharing",
 * and sharing stops when they tap "Stop sharing" or leave the page.
 */
export function LocationPanel({
  operationId,
  title,
  canShare,
}: {
  operationId: string;
  title: string;
  canShare: boolean;
}) {
  const [points, setPoints] = useState<Pos[]>([]);
  const [watching, setWatching] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  const refresh = useCallback(async () => {
    try {
      setPoints(await apiFetch<Pos[]>(`/api/ops/${operationId}/position`));
    } catch {
      /* keep the last list; the page still works */
    }
  }, [operationId]);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refresh]);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  function start() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Location isn't available on this device or browser.");
      return;
    }
    setStatus("Asking for permission…");
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setWatching(true);
        const now = Date.now();
        if (now - lastSent.current < 15_000) return;
        lastSent.current = now;
        try {
          await apiFetch(`/api/ops/${operationId}/position`, {
            method: "POST",
            body: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
            },
          });
          setStatus(
            `Sharing · last sent ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} (±${Math.round(pos.coords.accuracy)} m)`,
          );
          void refresh();
        } catch {
          setStatus("Sharing, but the last update didn't reach the server. Retrying…");
        }
      },
      (err) => {
        setWatching(false);
        setStatus(null);
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Allow location for this site in your browser settings to share."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Your location is unavailable right now (no GPS or network signal)."
              : "Getting your location took too long. Try again outdoors or with better signal.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }

  async function stop() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    lastSent.current = 0;
    setWatching(false);
    setStatus(null);
    try {
      await apiFetch(`/api/ops/${operationId}/position`, { method: "DELETE" });
    } finally {
      void refresh();
    }
  }

  const iShare = points.some((p) => p.me);

  return (
    <section aria-labelledby="locations" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="locations" className="text-lg font-semibold">
          {title}
        </h2>
        {canShare ? (
          watching || iShare ? (
            <Button variant="secondary" size="sm" onClick={stop}>
              Stop sharing my location
            </Button>
          ) : (
            <Button size="sm" onClick={start}>
              Start sharing my location
            </Button>
          )
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm" role="status">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : watching ? (
          status
        ) : iShare ? (
          "Your last shared location is visible to your team. Tap Stop to remove it."
        ) : canShare ? (
          "Off. Your location is only shared after you tap Start, and stops when you tap Stop or leave this page."
        ) : null}
      </p>
      {points.length > 0 ? (
        <>
          <TileMap points={points} />
          <ul className="text-sm">
            {points.map((p) => (
              <li key={p.memberId} className="flex justify-between gap-2 py-0.5">
                <span>
                  {p.me ? "You" : p.name}
                  {p.teamName ? (
                    <span className="text-muted-foreground"> · {p.teamName}</span>
                  ) : null}
                </span>
                <a
                  className="text-brand underline"
                  href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  updated {ago(p.updatedAt)}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">No one is sharing a location yet.</p>
      )}
    </section>
  );
}
