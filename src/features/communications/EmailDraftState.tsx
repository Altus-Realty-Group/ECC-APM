import React, { createContext, useContext, useEffect, useState, type SetStateAction } from "react";
import { getSessionEpoch } from "@/lib/sessionScope";
import { blankTemplate, blankValues, type EmailTemplate, type MergeValues } from "./emailDraft";

type Draft = { template: EmailTemplate; values: MergeValues; recipient: string };
const blank = (epoch: number) => ({ epoch, template: blankTemplate(), values: blankValues(), recipient: "" });
function useDraftState(epoch = 0) {
  const [stored, setStored] = useState(() => blank(epoch));
  const current = stored.epoch === epoch ? stored : blank(epoch);
  useEffect(() => { setStored(previous => previous.epoch === epoch ? previous : blank(epoch)); }, [epoch]);
  function update<K extends keyof Draft>(key: K, action: SetStateAction<Draft[K]>) {
    if (epoch !== getSessionEpoch()) return;
    setStored(previous => {
      const base = previous.epoch === epoch ? previous : blank(epoch);
      return { ...base, [key]: typeof action === "function" ? (action as (value: Draft[K]) => Draft[K])(base[key]) : action };
    });
  }
  return { template: current.template, values: current.values, recipient: current.recipient,
    setTemplate: (value: SetStateAction<EmailTemplate>) => update("template", value),
    setValues: (value: SetStateAction<MergeValues>) => update("values", value),
    setRecipient: (value: SetStateAction<string>) => update("recipient", value) };
}
const DraftContext = createContext<ReturnType<typeof useDraftState> | null>(null);

/** In memory only. Gate the draft by epoch without remounting unrelated page state. */
export function EmailDraftProvider({ children, epoch }: { children: React.ReactNode; epoch: number }) {
  const state = useDraftState(epoch);
  const edited = !!(state.template.name || state.template.subject || state.template.body || state.recipient || Object.values(state.values).some(Boolean));
  useEffect(() => {
    if (!edited) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edited]);
  return <DraftContext.Provider value={state}>{children}</DraftContext.Provider>;
}

export function useEmailDraft() {
  const provided = useContext(DraftContext);
  const local = useDraftState(getSessionEpoch());
  return provided ?? local;
}
