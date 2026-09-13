"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AdminState } from "@/lib/admin/model";

type AdminContext = {
  state: AdminState | null;
  preview: boolean;
  fault: string;
  setFault: (value: string) => void;
  commit: (change: (state: AdminState) => AdminState) => void;
  reset: () => void;
  revision: number;
};
const Context = createContext<AdminContext | null>(null);
export function AdminProvider({
  initial,
  children,
  preview = initial !== null,
}: {
  initial: AdminState | null;
  children: ReactNode;
  preview?: boolean;
}) {
  const [state, setState] = useState(initial);
  const current = useRef(initial);
  const [fault, setFault] = useState("none");
  const [revision, setRevision] = useState(0);
  function commit(change: (state: AdminState) => AdminState) {
    if (!initial || !current.current)
      throw new Error("Admin writes are not connected. No changes were saved.");
    if (fault === "denied")
      throw new Error("Your preview role does not permit changes.");
    if (fault === "write-error")
      throw new Error(
        "The simulated save failed. Your changes have not been saved.",
      );
    const next = change(structuredClone(current.current));
    current.current = next;
    setState(next);
  }
  return (
    <Context.Provider
      value={{
        state,
        revision,
        preview,
        fault,
        setFault,
        commit,
        reset() {
          current.current = structuredClone(initial);
          setState(current.current);
          setFault("none");
          setRevision((value) => value + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAdmin() {
  const value = useContext(Context);
  if (!value) throw new Error("AdminProvider is required");
  return value;
}
