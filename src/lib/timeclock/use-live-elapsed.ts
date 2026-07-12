"use client";

import { useEffect, useState } from "react";

function parseClockInMs(clockInAt: string | null | undefined): number | null {
  if (!clockInAt) return null;
  const ms = new Date(clockInAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export type PauseState = {
  onBreak?: boolean;
  pauseStartedAt?: string | null;
  totalPauseMs?: number;
};

function workElapsedMs(clockInAt: string, pause?: PauseState) {
  const startMs = parseClockInMs(clockInAt);
  if (startMs == null) return 0;
  let pauseMs = pause?.totalPauseMs ?? 0;
  if (pause?.onBreak && pause.pauseStartedAt) {
    pauseMs += Math.max(0, Date.now() - new Date(pause.pauseStartedAt).getTime());
  }
  return Math.max(0, Date.now() - startMs - pauseMs);
}

/** Temps de travail effectif (hors pauses) en HH:MM:SS. */
export function useLiveElapsed(
  clockInAt: string | null | undefined,
  pause?: PauseState
) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!clockInAt) {
      setElapsedMs(0);
      return;
    }

    const tick = () => setElapsedMs(workElapsedMs(clockInAt, pause));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [clockInAt, pause?.onBreak, pause?.pauseStartedAt, pause?.totalPauseMs]);

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

export function formatPauseMinutes(pause?: PauseState) {
  let ms = pause?.totalPauseMs ?? 0;
  if (pause?.onBreak && pause.pauseStartedAt) {
    ms += Math.max(0, Date.now() - new Date(pause.pauseStartedAt).getTime());
  }
  return Math.round(ms / 60000);
}
