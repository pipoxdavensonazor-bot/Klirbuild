"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import type {
  ConstructionEntityKey,
  ConstructionWorkspaceData,
} from "@/lib/construction/workspace-types";

type Kpis = ReturnType<
  typeof import("@/lib/construction/workspace-types").constructionKpisFrom
>;

export function useConstructionWorkspace() {
  const [data, setData] = useState<ConstructionWorkspaceData | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/construction"), { credentials: "include" });
      const json = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Chargement échoué");
        return;
      }
      setData(json.data as ConstructionWorkspaceData);
      setKpis(json.kpis as Kpis);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEntity(
    entity: ConstructionEntityKey,
    payload: { id?: string; data: Record<string, unknown> }
  ): Promise<void> {
    const res = await fetch(apiUrl("/api/construction"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entity, data: payload.data, id: payload.id }),
    });
    const json = await parseApiResponse(res);
    if (!res.ok) {
      throw new Error(typeof json.error === "string" ? json.error : "Enregistrement échoué");
    }
    setData(json.workspace as ConstructionWorkspaceData);
    setKpis(
      (await import("@/lib/construction/workspace-types")).constructionKpisFrom(
        json.workspace as ConstructionWorkspaceData
      )
    );
  }

  async function removeEntity(entity: ConstructionEntityKey, id: string): Promise<void> {
    const res = await fetch(apiUrl("/api/construction"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entity, action: "delete", id }),
    });
    const json = await parseApiResponse(res);
    if (!res.ok) {
      throw new Error(typeof json.error === "string" ? json.error : "Suppression échouée");
    }
    setData(json.workspace as ConstructionWorkspaceData);
    setKpis(
      (await import("@/lib/construction/workspace-types")).constructionKpisFrom(
        json.workspace as ConstructionWorkspaceData
      )
    );
  }

  return { data, kpis, loading, error, reload: load, saveEntity, removeEntity };
}

export type JobSiteRow = {
  id: string;
  name: string;
  address?: string;
  clientName?: string;
  lat: number;
  lng: number;
  radiusM: number;
};

export function useJobSites() {
  const [jobSites, setJobSites] = useState<JobSiteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/job-sites"), { credentials: "include" });
    const json = await parseApiResponse(res);
    setJobSites((json.jobSites as JobSiteRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveJobSite(payload: {
    id?: string;
    name: string;
    address?: string;
    clientName?: string;
    lat?: number;
    lng?: number;
    radiusM?: number;
  }) {
    const url = payload.id
      ? apiUrl(`/api/job-sites/${payload.id}`)
      : apiUrl("/api/job-sites");
    const res = await fetch(url, {
      method: payload.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await parseApiResponse(res);
    if (!res.ok) {
      throw new Error(typeof json.error === "string" ? json.error : "Enregistrement échoué");
    }
    await load();
    return json.jobSite as JobSiteRow;
  }

  async function deleteJobSite(id: string) {
    const res = await fetch(apiUrl(`/api/job-sites/${id}`), {
      method: "DELETE",
      credentials: "include",
    });
    const json = await parseApiResponse(res);
    if (!res.ok) {
      throw new Error(typeof json.error === "string" ? json.error : "Suppression échouée");
    }
    await load();
  }

  return { jobSites, loading, reload: load, saveJobSite, deleteJobSite };
}
