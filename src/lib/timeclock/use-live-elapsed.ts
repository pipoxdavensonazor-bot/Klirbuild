"use client";

import { useEffect, useState } from "react";

function parseClockInMs(clockInAt: string | null | undefined): number | null {
  if (!clockInAt) return null;
  const ms = new Date(clockInAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Compteur live HH:MM:SS depuis un horodatage ISO de pointage entrée. */
export function useLiveElapsed(clockInAt: string | null | undefined) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startMs = parseClockInMs(clockInAt);
    if (startMs == null) {
      setElapsedMs(0);
      return;
    }

    const tick = () => setElapsedMs(Math.max(0, Date.now() - startMs));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [clockInAt]);

  return elapsedMs;
}

export function formatElapsed(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
