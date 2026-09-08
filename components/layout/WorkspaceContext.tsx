"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { WorkspaceRow } from "@/types";

const STORAGE_KEY = "docbot.workspaceId";

export type WorkspaceSelection =
  | { kind: "personal" }
  | { kind: "workspace"; id: string; name: string };

type WorkspaceContextValue = {
  selection: WorkspaceSelection;
  workspaces: WorkspaceRow[];
  loading: boolean;
  setPersonal: () => void;
  selectWorkspace: (ws: WorkspaceRow) => void;
  refresh: () => Promise<void>;
  label: string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [selection, setSelection] = useState<WorkspaceSelection>({
    kind: "personal",
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        workspaces?: WorkspaceRow[];
      };
      const list = data.workspaces ?? [];
      setWorkspaces(list);

      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (saved && saved !== "personal") {
        const match = list.find((w) => w.id === saved);
        if (match) {
          setSelection({
            kind: "workspace",
            id: match.id,
            name: match.name,
          });
          return;
        }
      }
      setSelection({ kind: "personal" });
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, "personal");
      }
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setPersonal = useCallback(() => {
    setSelection({ kind: "personal" });
    localStorage.setItem(STORAGE_KEY, "personal");
  }, []);

  const selectWorkspace = useCallback((ws: WorkspaceRow) => {
    setSelection({ kind: "workspace", id: ws.id, name: ws.name });
    localStorage.setItem(STORAGE_KEY, ws.id);
  }, []);

  const label =
    selection.kind === "personal" ? "Personal Workspace" : selection.name;

  const value = useMemo(
    () => ({
      selection,
      workspaces,
      loading,
      setPersonal,
      selectWorkspace,
      refresh,
      label,
    }),
    [
      selection,
      workspaces,
      loading,
      setPersonal,
      selectWorkspace,
      refresh,
      label,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}

/** Optional hook when shell may not wrap (marketing). */
export function useWorkspaceOptional() {
  return useContext(WorkspaceContext);
}
